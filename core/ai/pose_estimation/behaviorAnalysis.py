
from suspectDegree import suspectDegree
import math
import numpy as np

HEAD_THRESHOLD = 35
LOOK_DOWN_THRESHOLD = 25
SHOULDER_THRESHOLD = 0.15


class BehavourAnalysis:
    def __init__(self):
        self.NOSE = 0
        self.LEFT_EYE = 1
        self.RIGHT_EYE = 2
        self.LEFT_EAR = 3
        self.RIGHT_EAR = 4
        self.LEFT_SHOULDER = 5
        self.RIGHT_SHOULDER = 6
        self.LEFT_ELBOW = 7
        self.RIGHT_ELBOW = 8
        self.LEFT_WRIST = 9
        self.RIGHT_WRIST = 10


    def _keypoints_visible(self, keypoints, indices):
        for idx in indices:
            if not keypoints[idx]['visible']:
                return False
        return True
    
    def _check_sufficient_keypoints(self, keypoints):
        imp = [self.NOSE, self.LEFT_EYE, self.RIGHT_EYE, self.LEFT_SHOULDER, self.RIGHT_SHOULDER]
        count = 0
        for idx in imp:
            if keypoints[idx]['visible']:
                count+=1

        if count >=3:
            return True
        return False

    def cal_head_movement(self, keypoints):
        left_eye = keypoints[self.LEFT_EYE]
        right_eye = keypoints[self.RIGHT_EYE]
        nose = keypoints[self.NOSE]

        if not left_eye['visible'] or not right_eye['visible'] or not nose['visible']:
            return 0,0

        eye_dx = right_eye['x'] - left_eye['x']
        eye_dy = right_eye['y'] - left_eye['y']
        eye_angle = math.degrees(math.atan2(eye_dy, eye_dx))

        # horizontal ratio
        eye_center_x = (left_eye['x'] + right_eye['x']) / 2
        h_ratio = (nose['x'] - eye_center_x) / abs(eye_dx)

        return eye_angle, h_ratio

    def cal_shoulder_movement(self, curr_keypoints, prev_keypoints):

        # small_movement = normal
        # large_movemtn = suspect
        req_keypoints = [self.LEFT_SHOULDER, self.RIGHT_SHOULDER]
        if not self._keypoints_visible(curr_keypoints,req_keypoints) or not self._keypoints_visible(prev_keypoints,req_keypoints):
            return 0
        
        curr_left = curr_keypoints[self.LEFT_SHOULDER]
        curr_right = curr_keypoints[self.RIGHT_SHOULDER]
        prev_left = prev_keypoints[self.LEFT_SHOULDER]
        prev_right = prev_keypoints[self.RIGHT_SHOULDER]
        
        curr_left = np.array([curr_left['x'], curr_left['y']])
        curr_right = np.array([curr_right['x'], curr_right['y']])
        prev_left = np.array([prev_left['x'], prev_left['y']])
        prev_right = np.array([prev_right['x'], prev_right['y']])

        shoulder_width = np.linalg.norm(curr_left-curr_right)
        if shoulder_width == 0:
            return 0
        
        left_movement = np.linalg.norm(curr_left-prev_left)/shoulder_width
        right_movement = np.linalg.norm(curr_right-prev_right)/shoulder_width

        return (left_movement+right_movement)/2
    

    def detect_suspects(self, keypoints, prev_keypoints):
        suspicious_act = []
        suspect_level = suspectDegree.Normal

        if not keypoints or not self._check_sufficient_keypoints(keypoints):
            return suspicious_act, suspect_level
        
        # Detecting Head movement
        eye_angle, h_ratio = self.cal_head_movement(keypoints)
        if abs(h_ratio) > 0.25:  # head turned left/right
            direction = "left" if h_ratio < 0 else "right"
            suspicious_act.append(f"Head Turned: {direction}")
            suspect_level = suspectDegree.Suspect


        # Shoulder Movement
        if prev_keypoints and self._check_sufficient_keypoints(prev_keypoints):
            shoulder_movement = self.cal_shoulder_movement(keypoints, prev_keypoints)
            if shoulder_movement > SHOULDER_THRESHOLD:
                suspicious_act.append("Unusal Body/Shoulders Movement")
                suspect_level = suspectDegree.Hot_Suspect

        return suspicious_act, suspect_level
