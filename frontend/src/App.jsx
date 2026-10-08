import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    email: '',
    course: '',
    age: ''
  });

  const API_URL = 'https://student-management-system-27tx.onrender.com/api/students';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get(API_URL);
      setStudents(res.data);
    } catch (err) {
      showToast('Error loading students', 'error');
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.rollNo.trim()) {
      showToast('Name and Roll Number are required!', 'error');
      return;
    }

    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, formData);
        showToast('Student record updated successfully!', 'success');
        setEditId(null);
      } else {
        await axios.post(`${API_URL}/add`, formData);
        showToast('Student enrolled successfully!', 'success');
      }
      setFormData({ name: '', rollNo: '', email: '', course: '', age: '' });
      fetchStudents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleEdit = (std) => {
    setEditId(std._id);
    setFormData({
      name: std.name,
      rollNo: std.rollNo,
      email: std.email,
      course: std.course,
      age: std.age || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setFormData({ name: '', rollNo: '', email: '', course: '', age: '' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        showToast('Student record deleted!', 'info');
        fetchStudents();
      } catch (err) {
        showToast('Failed to delete student', 'error');
      }
    }
  };

  // Export to CSV Function
  const exportToCSV = () => {
    if (students.length === 0) {
      showToast('No records available to export!', 'error');
      return;
    }

    const headers = ['Roll No', 'Name', 'Course', 'Email', 'Age'];
    const rows = students.map((s) => [
      `"${s.rollNo}"`,
      `"${s.name}"`,
      `"${s.course}"`,
      `"${s.email}"`,
      `"${s.age || ''}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Students_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('CSV downloaded successfully!', 'success');
  };

  const totalStudents = students.length;
  const bcaCount = students.filter((s) => s.course?.toUpperCase() === 'BCA').length;
  const otherCoursesCount = totalStudents - bcaCount;

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <h1>Student Portal Dashboard</h1>
        <p>Real-time MERN Database Management</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon icon-blue">👥</div>
          <div className="stat-info">
            <h4>Total Enrolled</h4>
            <p>{totalStudents}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-purple">🎓</div>
          <div className="stat-info">
            <h4>BCA Students</h4>
            <p>{bcaCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-emerald">📚</div>
          <div className="stat-info">
            <h4>Other Courses</h4>
            <p>{otherCoursesCount}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">{editId ? '✏️ Edit Student Details' : '➕ Register New Student'}</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Full Name</label>
            <input className="form-input" name="name" placeholder="Rahul Sharma" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Roll Number</label>
            <input className="form-input" name="rollNo" placeholder="BCA-2026-01" value={formData.rollNo} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input className="form-input" name="email" type="email" placeholder="student@example.com" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Course</label>
            <input className="form-input" name="course" placeholder="BCA / B.Tech" value={formData.course} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input className="form-input" name="age" type="number" min="16" max="60" placeholder="20" value={formData.age} onChange={handleChange} required />
          </div>

          <div className="form-actions">
            <button type="submit" className={`btn ${editId ? 'btn-success' : 'btn-primary'}`}>
              {editId ? 'Update Record' : 'Enroll Student'}
            </button>
            {editId && (
              <button type="button" onClick={handleCancelEdit} className="btn btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="table-header-bar">
          <h2 className="card-title" style={{ margin: 0 }}>
            Student Records <span style={{ color: '#64748b', fontSize: '15px' }}>({filteredStudents.length})</span>
          </h2>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={exportToCSV} className="btn btn-export">
              📥 Export CSV
            </button>
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Search name or roll..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Course</th>
                <th>Email</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((std) => (
                  <tr key={std._id}>
                    <td style={{ fontWeight: 600 }}>{std.rollNo}</td>
                    <td>{std.name}</td>
                    <td><span className="badge-course">{std.course.toUpperCase()}</span></td>
                    <td>{std.email}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => handleEdit(std)} className="btn btn-sm btn-edit">Edit</button>
                      <button onClick={() => handleDelete(std._id)} className="btn btn-sm btn-delete">Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-cell">No matching student records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;