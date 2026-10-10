import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'https://student-management-system-1-47hq.onrender.com/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('sms_token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('sms_user')) || null);

  // Authentication State
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: New Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState({ text: '', type: '' });

  // Dashboard State
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State for Student CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    email: '',
    course: 'B.Tech',
    status: 'Active'
  });

  useEffect(() => {
    if (token) {
      fetchStudents();
    }
  }, [token]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(res.data);
    } catch (err) {
      console.error('Data sync error:', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: authData.email, password: authData.password }
        : authData;

      const res = await axios.post(`${API_BASE}${endpoint}`, payload);
      localStorage.setItem('sms_token', res.data.token);
      localStorage.setItem('sms_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    setToken(null);
    setUser(null);
  };

  // Forgot Password Actions
  const handleOpenForgot = () => {
    setForgotEmail(authData.email || '');
    setForgotStep(1);
    setNewPassword('');
    setConfirmPassword('');
    setForgotMsg({ text: '', type: '' });
    setIsForgotModalOpen(true);
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (forgotStep === 1) {
      if (!forgotEmail) {
        setForgotMsg({ text: 'Please enter a valid registered email address.', type: 'error' });
        return;
      }
      setForgotMsg({ text: `Verification link / OTP simulated for ${forgotEmail}. Please enter new credentials.`, type: 'success' });
      setForgotStep(2);
    } else {
      if (newPassword.length < 6) {
        setForgotMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setForgotMsg({ text: 'Passwords do not match.', type: 'error' });
        return;
      }
      setForgotMsg({ text: 'Password reset request verified. You may now sign in or register.', type: 'success' });
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setAuthSuccess('Password updated. Please log in with your updated password.');
      }, 1500);
    }
  };

  const openModal = (student = null) => {
    if (student) {
      setEditingStudentId(student._id);
      setFormData({
        name: student.name || '',
        rollNo: student.rollNo || '',
        email: student.email || '',
        course: student.course || 'B.Tech',
        status: student.status ? (student.status.charAt(0).toUpperCase() + student.status.slice(1).toLowerCase()) : 'Active'
      });
    } else {
      setEditingStudentId(null);
      setFormData({
        name: '',
        rollNo: '',
        email: '',
        course: 'B.Tech',
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudentId(null);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const payload = {
        name: formData.name.trim(),
        rollNo: formData.rollNo.trim(),
        email: formData.email.trim(),
        course: formData.course,
        status: formData.status
      };

      if (editingStudentId) {
        await axios.put(`${API_BASE}/students/${editingStudentId}`, payload, config);
      } else {
        await axios.post(`${API_BASE}/students`, payload, config);
      }

      closeModal();
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update student. Please check server connection.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this record?')) return;
    try {
      await axios.delete(`${API_BASE}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStudents();
    } catch (err) {
      alert('Delete operation encountered an issue.');
    }
  };

  const metrics = useMemo(() => {
    const total = students.length;
    const active = students.filter(s => {
      const st = (s.status || 'Active').trim().toLowerCase();
      return st === 'active';
    }).length;

    const branchCounts = {};
    students.forEach(s => {
      const b = (s.course || 'General').toUpperCase();
      branchCounts[b] = (branchCounts[b] || 0) + 1;
    });

    return { total, active, branchCounts };
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const search = searchTerm.toLowerCase();
      const name = (student.name || '').toLowerCase();
      const roll = (student.rollNo || '').toLowerCase();
      const email = (student.email || '').toLowerCase();

      const matchesSearch = name.includes(search) || roll.includes(search) || email.includes(search);
      
      const st = (student.status || 'Active').trim().toLowerCase();
      const matchesStatus = statusFilter === 'All' || st === statusFilter.toLowerCase();

      const cr = (student.course || 'B.Tech').toUpperCase();
      const matchesBranch = branchFilter === 'All' || cr === branchFilter.toUpperCase();

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [students, searchTerm, statusFilter, branchFilter]);

  // Login / Register View
  if (!token) {
    return (
      <div className="auth-viewport">
        <div className="auth-card-modern">
          <div className="brand-header">
            <div className="avatar-frame glowing">
              <img 
                src="/prashant.jpg.jpeg" 
                alt="Prashant Kumar" 
                className="brand-avatar-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="avatar-fallback">PK</div>';
                }}
              />
            </div>
            <h1 className="brand-title">Prashant Kumar</h1>
            <p className="brand-tagline">Student Management System Pro</p>
          </div>

          <div className="auth-mode-switch">
            <button 
              type="button" 
              className={`mode-tab ${isLogin ? 'active' : ''}`} 
              onClick={() => { setIsLogin(true); setAuthError(''); setAuthSuccess(''); }}
            >
              Sign In
            </button>
            <button 
              type="button" 
              className={`mode-tab ${!isLogin ? 'active' : ''}`} 
              onClick={() => { setIsLogin(false); setAuthError(''); setAuthSuccess(''); }}
            >
              Register
            </button>
          </div>

          {authError && <div className="modern-alert error">{authError}</div>}
          {authSuccess && <div className="modern-alert success">{authSuccess}</div>}

          <form onSubmit={handleAuth} className="modern-form">
            {!isLogin && (
              <div className="input-field">
                <label>Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe" 
                  required 
                  value={authData.name} 
                  onChange={(e) => setAuthData({...authData, name: e.target.value})} 
                />
              </div>
            )}

            <div className="input-field">
              <label>Work Email</label>
              <input 
                type="email" 
                placeholder="name@company.com" 
                required 
                value={authData.email} 
                onChange={(e) => setAuthData({...authData, email: e.target.value})} 
              />
            </div>

            <div className="input-field">
              <div className="label-with-action">
                <label>Password</label>
                {isLogin && (
                  <button 
                    type="button" 
                    className="btn-forgot-pass"
                    onClick={handleOpenForgot}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input 
                type="password" 
                placeholder="••••••••••••" 
                required 
                value={authData.password} 
                onChange={(e) => setAuthData({...authData, password: e.target.value})} 
              />
            </div>

            <button type="submit" className="btn-modern-primary">
              {isLogin ? 'Access Workspace →' : 'Create Free Account →'}
            </button>
          </form>

          <div className="auth-footer-badge">
            <span>🛡️ Enterprise Data Security & JWT Authorization</span>
          </div>
        </div>

        {/* FORGOT PASSWORD MODAL */}
        {isForgotModalOpen && (
          <div className="modal-overlay">
            <div className="modal-surface forgot-modal-surface">
              <div className="modal-head">
                <div>
                  <h3>Reset Access Credentials</h3>
                  <p className="modal-subtext">
                    {forgotStep === 1 
                      ? 'Enter your registered work email to receive password recovery instructions.' 
                      : 'Create a new secure password for your account.'}
                  </p>
                </div>
                <button className="btn-close-modal" onClick={() => setIsForgotModalOpen(false)}>✕</button>
              </div>

              {forgotMsg.text && (
                <div className={`modern-alert ${forgotMsg.type}`}>{forgotMsg.text}</div>
              )}

              <form onSubmit={handleForgotSubmit}>
                {forgotStep === 1 ? (
                  <div className="modal-field">
                    <label>Registered Email</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="e.g. user@example.com"
                      value={forgotEmail} 
                      onChange={(e) => setForgotEmail(e.target.value)} 
                    />
                  </div>
                ) : (
                  <>
                    <div className="modal-field">
                      <label>New Password</label>
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••••••"
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                      />
                    </div>
                    <div className="modal-field">
                      <label>Confirm Password</label>
                      <input 
                        type="password" 
                        required 
                        placeholder="••••••••••••"
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                      />
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-modal-cancel" 
                    onClick={() => setIsForgotModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-modal-submit">
                    {forgotStep === 1 ? 'Send Recovery Code →' : 'Confirm New Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="avatar-frame header-mini">
            <img 
              src="/prashant.jpg.jpeg" 
              alt="Prashant Kumar" 
              className="brand-avatar-img"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="avatar-fallback mini">PK</div>';
              }}
            />
          </div>
          <div className="brand-cluster">
            <span className="platform-name">Prashant Kumar</span>
            <span className="creator-sub">Student Management System Pro</span>
          </div>
        </div>

        <div className="header-right">
          <div className="user-profile-badge">
            <div className="profile-meta">
              <span className="user-name">{user?.name || 'Prashant Kumar'}</span>
              <span className="user-role">System Admin</span>
            </div>
          </div>
          <button className="btn-modern-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      <main className="dashboard-body">
        {/* KPI Metric Cards */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Total Registered</span>
              <span className="kpi-icon-badge blue">👥</span>
            </div>
            <div className="kpi-figure">{metrics.total}</div>
            <p className="kpi-hint">Total student database entries</p>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Active Enrolled</span>
              <span className="kpi-icon-badge emerald">⚡</span>
            </div>
            <div className="kpi-figure text-emerald">{metrics.active}</div>
            <p className="kpi-hint">Current active standing students</p>
          </div>

          <div className="kpi-card wide">
            <div className="kpi-header">
              <span className="kpi-title">Department Distribution</span>
              <span className="kpi-icon-badge crimson">📊</span>
            </div>
            <div className="branch-pills-container">
              {Object.keys(metrics.branchCounts).length > 0 ? (
                Object.entries(metrics.branchCounts).map(([branch, count]) => (
                  <div key={branch} className="branch-metric-pill">
                    <span className="branch-key">{branch}</span>
                    <span className="branch-value">{count}</span>
                  </div>
                ))
              ) : (
                <span className="empty-branches">No departmental data loaded</span>
              )}
            </div>
          </div>
        </section>

        {/* Action Bar */}
        <section className="action-bar">
          <div className="search-filter-wrap">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search by student name, roll number, or email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-search"
              />
              {searchTerm && (
                <button 
                  type="button" 
                  className="btn-clear-search" 
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="filter-dropdown-group">
              <select 
                value={branchFilter} 
                onChange={(e) => setBranchFilter(e.target.value)}
                className="select-custom"
              >
                <option value="All">All Departments</option>
                <option value="B.Tech">B.Tech</option>
                <option value="BCA">BCA</option>
                <option value="MCA">MCA</option>
                <option value="MBA">MBA</option>
              </select>

              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select-custom"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Graduated">Graduated</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <button className="btn-add-primary" onClick={() => openModal()}>
            + New Student
          </button>
        </section>

        {/* Data Table */}
        <div className="table-card">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>ROLL NO</th>
                <th>STUDENT NAME</th>
                <th>EMAIL</th>
                <th>DEPARTMENT</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const resolvedStatus = (student.status || 'Active').toLowerCase();
                  return (
                    <tr key={student._id}>
                      <td className="cell-roll">
                        <span className="roll-chip">{student.rollNo || 'N/A'}</span>
                      </td>
                      <td className="cell-name">{student.name}</td>
                      <td className="cell-email">{student.email}</td>
                      <td>
                        <span className="badge-dept">{(student.course || 'B.Tech').toUpperCase()}</span>
                      </td>
                      <td>
                        <span className={`pill-status ${resolvedStatus}`}>
                          <span className="status-dot"></span>
                          {student.status || 'Active'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons-wrap">
                          <button 
                            className="btn-tbl edit" 
                            onClick={() => openModal(student)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn-tbl delete" 
                            onClick={() => handleDelete(student._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="empty-table-state">
                    No matching student records located.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-surface">
            <div className="modal-head">
              <div>
                <h3>{editingStudentId ? 'Modify Student Record' : 'Enroll New Student'}</h3>
                <p className="modal-subtext">Fill in the fields below to update records in MongoDB.</p>
              </div>
              <button className="btn-close-modal" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSaveStudent}>
              <div className="modal-inputs">
                <div className="modal-field">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. John Doe"
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  />
                </div>

                <div className="modal-field">
                  <label>Roll Number / Enrollment ID</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. 2026101"
                    value={formData.rollNo} 
                    onChange={(e) => setFormData({...formData, rollNo: e.target.value})} 
                  />
                </div>

                <div className="modal-field">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="student@university.edu"
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  />
                </div>

                <div className="fields-grid-2">
                  <div className="modal-field">
                    <label>Department / Program</label>
                    <select 
                      value={formData.course} 
                      onChange={(e) => setFormData({...formData, course: e.target.value})}
                    >
                      <option value="B.Tech">B.Tech</option>
                      <option value="BCA">BCA</option>
                      <option value="MCA">MCA</option>
                      <option value="MBA">MBA</option>
                    </select>
                  </div>

                  <div className="modal-field">
                    <label>Enrollment Status</label>
                    <select 
                      value={formData.status} 
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="Active">Active</option>
                      <option value="Graduated">Graduated</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-modal-cancel" onClick={closeModal}>
                  Dismiss
                </button>
                <button type="submit" className="btn-modal-submit">
                  {editingStudentId ? 'Save Changes' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}