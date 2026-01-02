import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { examsApi } from '../../lib/api';
import {
  PageHeader,
  PageContainer,
  ContentCard,
  StandardInput,
  StandardButton
} from '../../components/common';

const CreateExam = () => {
  const [formData, setFormData] = useState({
    courseTitle: '',
    department: '',
    roomNo: '',
    invigilatorEmail: '',
    section: '',
    examDate: '',
    startTime: '',
    endTime: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.courseTitle);
      data.append('department', formData.department);
      data.append('venue', formData.roomNo);
      data.append('exam_date', formData.examDate);
      data.append('exam_time', formData.startTime);
      data.append('end_time', formData.endTime);
      data.append('section', formData.section);
      data.append('invigilator_email', formData.invigilatorEmail);
      
      if (file) {
        data.append('studentCsv', file);
      }

      await examsApi.create(data);
      toast.success('Exam created successfully!');
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Create exam failed:', error);
      if (error.details) console.error('Server details:', error.details, error.stack || '');
      toast.error(`${error.message || 'Failed to create exam'}${error.details ? ' - see console for details' : ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader title="Create New Exam" backRoute="/admin/dashboard" />

      <PageContainer>
        <div className="max-w-3xl mx-auto">
          <ContentCard>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Course Title */}
              <StandardInput
                label="Course Title:"
                name="courseTitle"
                type="text"
                placeholder="e.g. Data Structures - BSSE2311"
                value={formData.courseTitle}
                onChange={handleChange}
                required
              />

              {/* Department */}
              <div>
                <label className="block text-gray-900 font-semibold mb-2">
                  Department:
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select department</option>
                  <option value="IT">IT</option>
                  <option value="Business">Business</option>
                  <option value="Medical">Medical</option>
                  <option value="Law">Law</option>
                </select>
              </div>

              {/* Room No */}
              <div>
                <label className="block text-gray-900 font-semibold mb-2">
                  Room No:
                </label>
                <select
                  name="roomNo"
                  value={formData.roomNo}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select a room</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={`Room ${num}`}>
                      Room {num}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invigilator Email */}
              <StandardInput
                label="Invigilator Email:"
                name="invigilatorEmail"
                type="email"
                placeholder="e.g. ali@example.com"
                value={formData.invigilatorEmail}
                onChange={handleChange}
                required
              />

              {/* Section */}
              <div>
                <label className="block text-gray-900 font-semibold mb-2">
                  Section:
                </label>
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select section</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
              </div>

              {/* Exam Date */}
              <StandardInput
                label="Exam Date:"
                name="examDate"
                type="date"
                value={formData.examDate}
                onChange={handleChange}
                required
              />

              {/* Start Time */}
              <StandardInput
                label="Start Time:"
                name="startTime"
                type="time"
                value={formData.startTime}
                onChange={handleChange}
                required
              />

              {/* End Time */}
              <StandardInput
                label="End Time:"
                name="endTime"
                type="time"
                value={formData.endTime}
                onChange={handleChange}
                required
              />

              {/* Upload CSV */}
              <div>
                <label className="block text-gray-900 font-semibold mb-2">
                  Upload CSV (Student List):
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
                {file && (
                  <p className="text-sm text-green-600 mt-2">{file.name}</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <StandardButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/admin/dashboard')}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </StandardButton>
                <StandardButton
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Creating...' : 'Create Exam'}
                </StandardButton>
              </div>
            </form>
          </ContentCard>
        </div>
      </PageContainer>
    </div>
  );
};

export default CreateExam;
