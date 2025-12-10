
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

MODEL = "yolov8n-pose.pt"
CAMERA_SOURCE = 0

class CheatingDetection:
    def __init__(self, exam_id=None):
        self.behaviour_analysis = BehavourAnalysis()
        self.pose_detector = PoseDetection()
        self.exam_id = exam_id or "default"
        
        self.alert_history = []
        self.prev_poses = {}
        self._is_monitoring = False

        # Create exam-specific snapshots folder
        self.snapshots_dir = os.path.join("snapshots", str(self.exam_id))
        os.makedirs(self.snapshots_dir, exist_ok=True)
        os.makedirs("logs", exist_ok=True)
        print(f"[CheatingDetection] Snapshots will be saved to: {self.snapshots_dir}")

    def monitor(self):
        self._is_monitoring = True
        cap = cv2.VideoCapture(CAMERA_SOURCE)
        if not cap.isOpened():
            print("Error: Could not open camera. Check if it's being used by another application.")
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        curr_poses = {}
        count = 0

        while self._is_monitoring and cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            count += 1
        
            # Create a copy for display
            display_frame = frame.copy()
        
            # if count % 2 == 0:
            #     # Show frame without processing
            #     cv2.imshow('Cheating Detection', display_frame)
            #     if cv2.waitKey(1) & 0xFF == ord('q'):
            #         break
            #     continue

            detected_poses, results = self.pose_detector.detect_pose(frame)
            for idx, keypoints in enumerate(detected_poses):
                student_id = f"Student {idx}"
                prev_keypoints = self.prev_poses.get(student_id)
                sus_activities, sus_level = self.behaviour_analysis.detect_suspects(keypoints, prev_keypoints)

                curr_poses[student_id] = keypoints
                print(sus_level)
                self.draw_bounding_box(display_frame, student_id, keypoints, sus_level)
                if sus_level.value > suspectDegree.Normal.value:
                    self.processing_alets(student_id, sus_activities, sus_level, frame, keypoints)

            self.prev_poses = curr_poses.copy()

            # Show the processed frame WITH bounding boxes
            cv2.imshow('Cheating Detection', display_frame)
        
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    
        cap.release()
        cv2.destroyAllWindows()
        self._is_monitoring = False



    def processing_alets(self, student_id, sus_activities, sus_level, frame, keypoints):
            
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
        time_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = os.path.join(self.snapshots_dir, f"{sus_level.name}_{student_id}_{time_str}.jpg")
        cv2.imwrite(file_path, frame)
        print(f"[Snapshot] Saved to {file_path}")
        return file_path


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
    # Get exam_id from command line argument if provided
    exam_id = sys.argv[1] if len(sys.argv) > 1 else None
    detector = CheatingDetection(exam_id=exam_id)
    detector.monitor()
