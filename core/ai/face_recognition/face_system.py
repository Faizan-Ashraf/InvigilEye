import face_recognition
import cv2
import pandas as pd
import numpy as np

class Attendance:
    def __init__(self, csvFilePath):
        self.csvFilePath = csvFilePath
        self.studentData = None
        self.loadStudentData()
        self.knownEncodings = []
        self.knownNames = []
        self.knownReg = []
        self.loadFaces()
        
        
    def loadStudentData(self):
        self.studentData = pd.read_csv(self.csvFilePath)
        
        self.studentData['Attendance'] = 'Absent'

    
    def loadFaces(self):
        for index, row in self.studentData.iterrows():
            img_path = row['Photo']
            img = face_recognition.load_image_file(img_path)
            encodings = face_recognition.face_encodings(img)
            if len(encodings)>0:
                self.knownEncodings.append(encodings[0])
                self.knownNames.append(row['Name'])
                self.knownReg.append(row['Reg'])

        print("All Faces Encoded Successfulyy")


                     
    def markAttendance(self, reg):
        idx = self.studentData[self.studentData['Reg'] == reg].index

        if self.studentData.loc[idx[0], 'Attendance'] != 'Present':
            self.studentData.loc[idx[0], 'Attendance'] = 'Present'
            print(f"Attendance marked for Reg: {reg}")
        
    
    
    def saveAttendance(self):
        self.studentData.to_csv("attendance_report.csv",index=False)
        print("Attendance Saved Successfully")
    
    
    def run(self):
        cap = cv2.VideoCapture(1)
        if not cap.isOpened():
            print("Error: Could not open camera")
            return
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Could not read frame")
                break
            
            # small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            face_locations = face_recognition.face_locations(rgb_frame)
            face_encodings = face_recognition.face_encodings(rgb_frame,face_locations, model='large')

            for (top,right, bottom, left), face_encoding in zip(face_locations, face_encodings):
                matches = face_recognition.compare_faces(self.knownEncodings, face_encoding, tolerance=0.4)
                face_distances = face_recognition.face_distance(self.knownEncodings,face_encoding)
                if len(face_distances)>0:
                    smallestValue_index_among_matches = np.argmin(face_distances)
                else:
                    smallestValue_index_among_matches = None

                name = 'UNKNOWN'
                reg = None

                if smallestValue_index_among_matches is not None and matches[smallestValue_index_among_matches]:
                    name = self.knownNames[smallestValue_index_among_matches]
                    reg = self.knownReg[smallestValue_index_among_matches]
                    self.markAttendance(reg)
                
                # top *= 4
                # right *= 4
                # bottom *= 4
                # left *= 4
                color = (0, 255,0) if name!='UNKNOWN' else (0,0,255)
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.putText(frame, name, (left, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

            cv2.imshow("InvigilEye", frame)

                
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()
        self.saveAttendance()
        
        
        

    
system = Attendance("students.csv")
system.run()