
import cv2
import numpy as np
from ultralytics import YOLO
import configparser
import math


Model = "yolov8s-pose.pt"
Conf_Threshold = 0.25


class PoseDetection:
    def __init__(self):
        self.model = YOLO(Model)
        self.conf_threshold = Conf_Threshold

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

    def extract_keypoints(self, keypoint_tensor, img_shape):
        # print(keypoint_tensor.shape) Output: (17, 3)
        keypoints = {}
        h,w = img_shape[:2]

        for idx in range(len(keypoint_tensor)):
            kp = keypoint_tensor[idx] #(x, y , confidence)

            x = float(kp[0])
            y = float(kp[1])
            conf = float(kp[2])

            if conf > self.conf_threshold:
                keypoints[idx] = {'x':x,'y':y,'confidence':conf, 'visible':True}
            else:
                keypoints[idx] = {'x':0,'y':0,'confidence':0, 'visible':False}

        
        return keypoints

    def detect_pose(self, image):
        results= self.model(image, conf=self.conf_threshold, verbose=False)
        # results is a list-like object, each object contain(BoundingBoxes, Keypoints, plot() method, probs)


        poses = []
        for result in results:
            if result.keypoints:
                for person_keypoints in result.keypoints.data:

                    keypoints = self.extract_keypoints(person_keypoints, image.shape)
                    if keypoints:
                        poses.append(keypoints)

        return poses, results

    def display(self, image, results):
        return results[0].plot()



# Takes the input image.

# Detects all humans in it.

# Predicts 17 keypoints for each person with (x, y, confidence).

# Filters detections by conf_threshold.

# Returns a results object you can analyze or plot.