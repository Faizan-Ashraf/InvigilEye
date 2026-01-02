
import sys
import os

# Add current directory to Python path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from behaviorAnalysis import BehavourAnalysis
from poseDetection import PoseDetection
from suspectDegree import suspectDegree
import time
import cv2
from datetime import datetime
import signal
import logging
import threading
import re
import uuid

# Constants and logging
WINDOW_TITLE = "Cheating Detection"
DEFAULT_CAMERA = 0
PIDFILE_NAME = "detection.pid"

log_dir = os.path.abspath(os.path.join(current_dir, '..', '..', 'logs'))
os.makedirs(log_dir, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(log_dir, "detection.log")),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger('CheatingDetection')

# Graceful signal handling so parent process can request shutdown



MODEL = "yolov8n-pose.pt"
CAMERA_SOURCE = 0

# Allow overriding camera source via ENV var or CLI arg
def resolve_camera_source():
    # Priority: ENV CAMERA_SOURCE -> 2nd CLI arg -> default CAMERA_SOURCE
    cam = os.environ.get('CAMERA_SOURCE')
    if cam is not None:
        try:
            return int(cam)
        except ValueError:
            pass
    # CLI arg (sys.argv[2]) may provide camera index
    if len(sys.argv) > 2:
        try:
            return int(sys.argv[2])
        except ValueError:
            pass
    return CAMERA_SOURCE

class CheatingDetection:
    def __init__(self, exam_id=None):
        self.behaviour_analysis = BehavourAnalysis()
        self.pose_detector = PoseDetection()
        self.exam_id = exam_id or "default"
        
        self.alert_history = []
        self.prev_poses = {}
        self._is_monitoring = False
        # State: 'STOPPED' | 'RUNNING' | 'STOPPING' - used to avoid saving during shutdown
        self._state = 'STOPPED'

        # Determine project root by walking up until package.json is found (more reliable in dev and packaged use)
        def find_project_root(start_dir):
            p = start_dir
            while True:
                if os.path.exists(os.path.join(p, 'package.json')):
                    return p
                parent = os.path.dirname(p)
                if parent == p:
                    # Reached filesystem root, fallback to core's parent
                    return os.path.abspath(os.path.join(start_dir, '..', '..'))
                p = parent

        project_root = find_project_root(current_dir)
        self.snapshots_dir = os.path.abspath(os.path.join(project_root, 'snapshots', str(self.exam_id)))
        os.makedirs(self.snapshots_dir, exist_ok=True)

        # Lock to guard snapshot saving so shutdown can wait for in-flight saves
        self._snapshot_lock = threading.Lock()

        # PID file path for diagnostics
        self.pidfile = os.path.join(self.snapshots_dir, PIDFILE_NAME)

        # Debug: log current_dir and computed snapshot path components to help diagnose path resolution
        logger.info("[CheatingDetection] current_dir: %s", current_dir)
        logger.info("[CheatingDetection] computed snapshots path (joined components): %s", os.path.join(current_dir, '..', '..', '..', 'snapshots', str(self.exam_id)))
        logger.info("[CheatingDetection] Snapshots will be saved to: %s", self.snapshots_dir)

        # Register signal handlers for graceful shutdown
        try:
            signal.signal(signal.SIGTERM, self._handle_signal)
            signal.signal(signal.SIGINT, self._handle_signal)
        except Exception:
            # Some environments may not support signals the same way (e.g., Windows), ignore quietly
            logger.debug("Signal registration may not be supported on this platform.")


    def _handle_signal(self, signum, frame):
        logger.info("[CheatingDetection] Received signal %s, stopping monitoring...", signum)
        # Mark that we are stopping immediately so snapshots won't be saved while shutdown proceeds
        self._state = 'STOPPING'
        self._is_monitoring = False

    def _write_pidfile(self):
        try:
            with open(self.pidfile, 'w') as f:
                f.write(str(os.getpid()))
            logger.info("PID file written: %s", self.pidfile)
        except Exception as e:
            logger.warning("Failed to write PID file: %s", e)

    def _remove_pidfile(self):
        try:
            if os.path.exists(self.pidfile):
                os.unlink(self.pidfile)
                logger.info("PID file removed: %s", self.pidfile)
        except Exception as e:
            logger.warning("Failed to remove PID file: %s", e)

    def monitor(self):
        # Start monitoring and make sure PID file is written for external diagnostics
        self._is_monitoring = True
        # Set running state so snapshot saving is allowed
        self._state = 'RUNNING'
        camera_source = resolve_camera_source()
        logger.info("[CheatingDetection] Using camera index: %s", camera_source)

        # Write pid file
        self._write_pidfile()

        cap = None
        try:
            cap = cv2.VideoCapture(camera_source)
            if not cap.isOpened():
                logger.error("Could not open camera index %s", camera_source)
                return 2

            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

            curr_poses = {}
            count = 0
            # Track consecutive per-frame processing errors to avoid immediate exit on transient issues
            consecutive_errors = 0
            MAX_CONSECUTIVE_ERRORS = 10

            while self._is_monitoring and cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    logger.warning("Frame read failed, breaking loop")
                    # Enter stopping state immediately
                    self._state = 'STOPPING'
                    break

                # Protect against invalid frames returned by some drivers
                if frame is None or getattr(frame, 'size', 0) == 0:
                    logger.warning("Got invalid/empty frame from camera; skipping processing")
                    # Skip this iteration — don't attempt any snapshot or detection
                    continue

                count += 1
                display_frame = frame.copy()

                # Per-frame processing guarded so single-frame errors dont bring down the whole process
                try:
                    detected_poses, results = self.pose_detector.detect_pose(frame)
                    for idx, keypoints in enumerate(detected_poses):
                        student_id = f"Student {idx}"
                        prev_keypoints = self.prev_poses.get(student_id)
                        sus_activities, sus_level = self.behaviour_analysis.detect_suspects(keypoints, prev_keypoints)

                        curr_poses[student_id] = keypoints
                        logger.debug("Sus level: %s for %s", sus_level, student_id)
                        self.draw_bounding_box(display_frame, student_id, keypoints, sus_level)
                        if sus_level.value > suspectDegree.Normal.value:
                            # Only process alerts if we are actively running (avoid race with shutdown)
                            if not self._is_monitoring or self._state != 'RUNNING':
                                logger.info("Skipping alert processing for %s because detector is stopping", student_id)
                            else:
                                self.processing_alets(student_id, sus_activities, sus_level, frame, keypoints)

                    # frame processed successfully -> reset error counter
                    consecutive_errors = 0

                except Exception as e:
                    # Log details about the per-frame failure and continue; don't immediately crash
                    logger.exception("[CheatingDetection] Error while processing frame #%s: %s", count, e)
                    consecutive_errors += 1
                    logger.warning("[CheatingDetection] Consecutive frame errors: %s/%s", consecutive_errors, MAX_CONSECUTIVE_ERRORS)
                    # In case of repeated errors, transition to stopping state to avoid a noisy loop
                    if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                        logger.error("[CheatingDetection] Too many consecutive frame errors, stopping detection")
                        self._state = 'STOPPING'
                        self._is_monitoring = False
                        break

                self.prev_poses = curr_poses.copy()

                # Show the processed frame WITH bounding boxes
                cv2.imshow(WINDOW_TITLE, display_frame)

                # Key press 'q' => stop
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    logger.info("'q' pressed - stopping")
                    break

                # Detect if the window was closed by the user
                try:
                    if cv2.getWindowProperty(WINDOW_TITLE, cv2.WND_PROP_VISIBLE) < 1:
                        logger.info("Window closed by user - stopping")
                        break
                except Exception:
                    # Some builds might raise here - ignore
                    pass

            logger.info("Exiting main loop")
            return 0

        except Exception as e:
            logger.exception("Unhandled exception in detection loop: %s", e)
            return 1

        finally:
            try:
                if cap is not None:
                    cap.release()
                    logger.info("Camera released")
            except Exception as e:
                logger.warning("Error releasing camera: %s", e)

            try:
                cv2.destroyAllWindows()
                logger.info("Destroyed OpenCV windows")
            except Exception as e:
                logger.warning("Error destroying OpenCV windows: %s", e)

            # Wait briefly for any in-flight snapshot saves to finish so we don't interrupt them
            try:
                logger.info("[CheatingDetection] Waiting up to 2s for in-flight snapshot saves to complete")
                acquired = self._snapshot_lock.acquire(timeout=2)
                if acquired:
                    # Immediately release to allow normal finalization
                    self._snapshot_lock.release()
                else:
                    logger.warning("[CheatingDetection] Timeout waiting for snapshot save to complete; proceeding with shutdown")
            except Exception as e:
                logger.warning("[CheatingDetection] Error while waiting for snapshot lock: %s", e)

            # Remove PID file
            self._remove_pidfile()



    def processing_alets(self, student_id, sus_activities, sus_level, frame, keypoints):
        """Process and record an alert; capture snapshot only if frame and state are valid."""

        # If we're stopping, don't attempt to capture or record more alerts
        if not self._is_monitoring or self._state != 'RUNNING':
            logger.info("processing_alets called while stopping; skipping for %s", student_id)
            return

        curr_time = time.time()
        last_alet = self.get_last_alet(student_id)

        if curr_time - last_alet > 5:
            ss_path = self.capture_snapshot(frame, student_id, sus_level)

            alert = {
                'student_id': student_id,
                'timestamp': datetime.now().isoformat(),
                'suspicious_activities': sus_activities,
                'suspicion_level': sus_level.name,
                'snapshot_path': ss_path,
                'keypoints': keypoints
            }

            self.alert_history.append(alert)
            self.log_alert(alert)



    def get_last_alet(self,student_id): # gets the last alet time
        for alert in reversed(self.alert_history):
            if alert['student_id'] == student_id:
                dt = datetime.fromisoformat(alert['timestamp'])
                return dt.timestamp()
        return 0


    def capture_snapshot(self, frame, student_id, sus_level):

        # Guard: ensure we are still running — don't save while stopping
        if not self._is_monitoring or self._state != 'RUNNING':
            logger.info("[Snapshot] Skipping snapshot for %s because detector is stopping or not running", student_id)
            return None

        # Basic frame validation
        if frame is None:
            logger.warning("[Snapshot] Skipping snapshot because frame is None for %s", student_id)
            return None
        try:
            if getattr(frame, 'size', 0) == 0:
                logger.warning("[Snapshot] Skipping snapshot because frame has zero size for %s", student_id)
                return None
        except Exception:
            # If frame doesn't have size attribute, proceed (cv2.imwrite will still fail/return False)
            pass

        # Sanitize parts used in filename to be OS-safe
        safe_student = re.sub(r"[^0-9A-Za-z_-]", "_", str(student_id))
        safe_level = re.sub(r"[^0-9A-Za-z_-]", "_", str(sus_level.name))
        time_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{safe_level}_{safe_student}_{time_str}.jpg"
        final_path = os.path.join(self.snapshots_dir, filename)
        # Use a temp file in the same directory to ensure atomic replace
        temp_path = os.path.join(self.snapshots_dir, f".{uuid.uuid4().hex}.tmp")

        # Acquire lock to indicate a save is in progress
        acquired = self._snapshot_lock.acquire(timeout=5)
        if not acquired:
            logger.warning("[Snapshot] Could not acquire lock to save snapshot for %s", student_id)

        try:
            # Ensure folder exists (might be removed/cleaned externally)
            os.makedirs(self.snapshots_dir, exist_ok=True)

            # First try a safe in-memory JPEG encode (more reliable on some platforms/drivers)
            try:
                ret, buf = cv2.imencode('.jpg', frame)
            except Exception as e:
                logger.warning("[Snapshot] cv2.imencode raised exception for %s: %s", student_id, e)
                # Log frame info to help debug bad frames
                try:
                    logger.debug("[Snapshot] frame info - type: %s, shape: %s, dtype: %s", type(frame), getattr(frame, 'shape', None), getattr(frame, 'dtype', None))
                except Exception:
                    pass
                return None

            if not ret or buf is None:
                logger.warning("[Snapshot] cv2.imencode failed for %s - frame may be invalid", student_id)
                try:
                    logger.debug("[Snapshot] frame info - type: %s, shape: %s, dtype: %s", type(frame), getattr(frame, 'shape', None), getattr(frame, 'dtype', None))
                except Exception:
                    pass
                return None

            # Write encoded bytes atomically to temp file
            try:
                with open(temp_path, 'wb') as f:
                    f.write(buf.tobytes())
                    f.flush()
                    os.fsync(f.fileno())
            except Exception as e:
                logger.warning("[Snapshot] Failed writing encoded image to temp file %s: %s", temp_path, e)
                try:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                except Exception:
                    pass
                return None

            # Atomically move temp file to final path
            try:
                os.replace(temp_path, final_path)
            except Exception as e:
                # If replace fails, try rename as fallback
                try:
                    os.rename(temp_path, final_path)
                except Exception as e2:
                    logger.exception("[Snapshot] Failed to move snapshot into place: %s, %s", e, e2)
                    # Cleanup temp file
                    try:
                        if os.path.exists(temp_path):
                            os.remove(temp_path)
                    except Exception:
                        pass
                    return None

            logger.info("[Snapshot] Saved to %s", final_path)
            print(f"[Snapshot] Saved to {final_path}")
            return final_path

        except Exception as e:
            logger.exception("[Snapshot] Unexpected error saving snapshot: %s", e)
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                pass
            return None

        finally:
            # Always release the lock if we acquired it
            try:
                if acquired:
                    self._snapshot_lock.release()
            except Exception:
                pass


    def log_alert(self, alert):
        log_entry = f"{alert['timestamp']} - {alert['student_id']} - {alert['suspicion_level']} - {alert['suspicious_activities']}\n"
        
        with open("logs/alerts.log", "a") as f:
            f.write(log_entry)

    def draw_bounding_box(self, frame, student_id, keypoinys, sus_level):

        visible_kp = [kp for kp in keypoinys.values() if kp["visible"]]
        if not visible_kp:
            return
        
        #extract all coordinates of keypoints
        xs = [kp['x'] for kp in visible_kp]
        ys = [kp['y'] for kp in visible_kp]
        
        #finding left most & right most
        h, w = frame.shape[:2]

        x_min = max(0, min(xs))
        x_max = min(w, max(xs))
        y_min = max(0, min(ys))
        y_max = min(h, max(ys))

        if sus_level == suspectDegree.Normal:
            color = (0,255,0)
        elif sus_level == suspectDegree.Suspect:
            color = (0,255,255)
        else:
            color = (0,0,255)

        cv2.rectangle(frame, (int(x_min), int(y_min)), (int(x_max), int(y_max+40)), color, 1)
        label = f"{student_id}: {sus_level.name}"

        cv2.putText(frame,label,(int(x_min), int(y_min) - 10),cv2.FONT_HERSHEY_SIMPLEX,0.5,color,2)


if __name__ == "__main__":
    # Install a top-level excepthook to ensure any unhandled exceptions are logged to file and stderr
    def _excepthook(exc_type, exc_value, exc_tb):
        try:
            logger.exception("Unhandled exception (excepthook): %s", exc_value)
        except Exception:
            pass
        # Also print to stderr so parent process can capture tracebacks immediately
        try:
            import traceback
            traceback.print_exception(exc_type, exc_value, exc_tb)
        except Exception:
            pass

    sys.excepthook = _excepthook

    # Get exam_id from command line argument if provided
    try:
        exam_id = sys.argv[1] if len(sys.argv) > 1 else None
        detector = CheatingDetection(exam_id=exam_id)
        logger.info("[CheatingDetection] Starting monitor for exam %s", exam_id)
        exit_code = detector.monitor()
        logger.info("[CheatingDetection] Monitor finished with exit code %s", exit_code)
        sys.exit(exit_code)
    except Exception as e:
        logger.exception("Fatal error starting CheatingDetection: %s", e)
        # Ensure stderr shows a traceback as well
        import traceback
        traceback.print_exc()
        sys.exit(1)
