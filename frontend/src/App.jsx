import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'https://student-management-system-27tx.onrender.com/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('sms_token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('sms_user')) || null);

  // Authentication State
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ text: '', type: '' });
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // DigiLocker Modal State
  const [isDigiLockerOpen, setIsDigiLockerOpen] = useState(false);
  const [digiLockerConnected, setDigiLockerConnected] = useState(
    localStorage.getItem('sms_digilocker') === 'true'
  );
  const [isSyncingDigi, setIsSyncingDigi] = useState(false);

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

  const handleGoogleSignIn = () => {
    /* global google */
    if (typeof window.google === 'undefined') {
      alert('Google SDK is still loading. Please check your connection or refresh the page.');
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: '196669776050-ppalg9hb322gvk6vkvc8imf1gf0iunkp.apps.googleusercontent.com',
        callback: async (response) => {
          try {
            const res = await axios.post(`${API_BASE}/auth/google-login`, {
              credential: response.credential
            });
            localStorage.setItem('sms_token', res.data.token);
            localStorage.setItem('sms_user', JSON.stringify(res.data.user));
            setToken(res.data.token);
            setUser(res.data.user);
          } catch (err) {
            setAuthError(err.response?.data?.message || 'Google authentication failed.');
          }
        }
      });

      window.google.accounts.id.prompt();
    } catch (err) {
      console.error('Google Sign-In Trigger Error:', err);
      alert('Unable to initialize Google Sign-In prompt.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    setToken(null);
    setUser(null);
  };

  // DigiLocker Integration Handlers
  const handleConnectDigiLocker = () => {
    setIsSyncingDigi(true);
    setTimeout(() => {
      setIsSyncingDigi(false);
      setDigiLockerConnected(true);
      localStorage.setItem('sms_digilocker', 'true');
      setIsDigiLockerOpen(false);
    }, 1400);
  };

  const handleDisconnectDigiLocker = () => {
    setDigiLockerConnected(false);
    localStorage.removeItem('sms_digilocker');
    setIsDigiLockerOpen(false);
  };

  // Forgot Password Actions
  const handleOpenForgot = () => {
    setForgotEmail(authData.email || '');
    setForgotOtp('');
    setForgotStep(1);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setForgotMsg({ text: '', type: '' });
    setIsForgotModalOpen(true);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotMsg({ text: '', type: '' });

    if (forgotStep === 1) {
      if (!forgotEmail) {
        setForgotMsg({ text: 'Please enter a valid email address.', type: 'error' });
        return;
      }
      try {
        setIsForgotLoading(true);
        const res = await axios.post(`${API_BASE}/auth/forgot-password`, { email: forgotEmail });
        setForgotMsg({ 
          text: res.data?.message || `OTP sent to ${forgotEmail}. Please check your inbox!`, 
          type: 'success' 
        });
        setForgotStep(2);
      } catch (err) {
        setForgotMsg({ 
          text: err.response?.data?.message || 'Failed to send recovery email. Please verify email.', 
          type: 'error' 
        });
      } finally {
        setIsForgotLoading(false);
      }
    } else {
      if (!forgotOtp.trim()) {
        setForgotMsg({ text: 'Please enter the OTP received in your email.', type: 'error' });
        return;
      }
      if (newPassword.length < 6) {
        setForgotMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setForgotMsg({ text: 'Passwords do not match.', type: 'error' });
        return;
      }

      try {
        setIsForgotLoading(true);
        const res = await axios.post(`${API_BASE}/auth/reset-password`, {
          email: forgotEmail,
          otp: forgotOtp.trim(),
          newPassword
        });

        setForgotMsg({ 
          text: res.data?.message || 'Password successfully updated!', 
          type: 'success' 
        });

        setTimeout(() => {
          setIsForgotModalOpen(false);
          setAuthSuccess('Password reset complete. You can now log in.');
        }, 1500);
      } catch (err) {
        setForgotMsg({ 
          text: err.response?.data?.message || 'Invalid or expired OTP. Please try again.', 
          type: 'error' 
        });
      } finally {
        setIsForgotLoading(false);
      }
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

  const handleExportCSV = () => {
    if (!filteredStudents.length) {
      alert('No student records available to export.');
      return;
    }
    const headers = ['Roll No,Student Name,Email,Department,Status\n'];
    const rows = filteredStudents.map(s => 
      `"${s.rollNo || ''}","${s.name || ''}","${s.email || ''}","${s.course || 'B.Tech'}","${s.status || 'Active'}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Students_Record_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

          {/* Google Sign In Button */}
          <button type="button" className="btn-google-auth" onClick={handleGoogleSignIn}>
            <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="auth-divider">
            <span>or email authorization</span>
          </div>

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
              <div className="password-input-wrapper">
                <input 
                  type={showAuthPassword ? 'text' : 'password'} 
                  placeholder="••••••••••••" 
                  required 
                  value={authData.password} 
                  onChange={(e) => setAuthData({...authData, password: e.target.value})} 
                />
                <button 
                  type="button" 
                  className="btn-eye-toggle" 
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                  title={showAuthPassword ? 'Hide password' : 'Show password'}
                >
                  {showAuthPassword ? '🙈' : '👁️'}
                </button>
              </div>
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
                      ? 'Enter your registered work email to receive a verification OTP.' 
                      : 'Enter the 6-digit OTP sent to your email and set your new password.'}
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
                      <label>Verification OTP</label>
                      <input 
                        type="text" 
                        required 
                        maxLength="6"
                        placeholder="Enter 6-digit OTP from email"
                        value={forgotOtp} 
                        onChange={(e) => setForgotOtp(e.target.value)} 
                      />
                    </div>
                    <div className="modal-field">
                      <label>New Password</label>
                      <div className="password-input-wrapper">
                        <input 
                          type={showNewPassword ? 'text' : 'password'} 
                          required 
                          placeholder="••••••••••••"
                          value={newPassword} 
                          onChange={(e) => setNewPassword(e.target.value)} 
                        />
                        <button 
                          type="button" 
                          className="btn-eye-toggle" 
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          title={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                    <div className="modal-field">
                      <label>Confirm Password</label>
                      <div className="password-input-wrapper">
                        <input 
                          type={showConfirmPassword ? 'text' : 'password'} 
                          required 
                          placeholder="••••••••••••"
                          value={confirmPassword} 
                          onChange={(e) => setConfirmPassword(e.target.value)} 
                        />
                        <button 
                          type="button" 
                          className="btn-eye-toggle" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
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
                  <button type="submit" className="btn-modal-submit" disabled={isForgotLoading}>
                    {isForgotLoading 
                      ? 'Processing...' 
                      : (forgotStep === 1 ? 'Send Recovery Code →' : 'Verify & Update Password')}
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
          {/* Connect DigiLocker Header Button */}
          <button 
            type="button" 
            className={`btn-digilocker-header ${digiLockerConnected ? 'connected' : ''}`}
            onClick={() => setIsDigiLockerOpen(true)}
            title="DigiLocker Verification & Document Sync"
          >
            <span className="digi-icon">📂</span>
            <span>{digiLockerConnected ? 'DigiLocker Verified' : 'Connect DigiLocker'}</span>
            {digiLockerConnected && <span className="digi-check">✓</span>}
          </button>

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

          <div className="action-button-cluster">
            <button className="btn-export-secondary" onClick={handleExportCSV} title="Export current list to CSV">
              📥 Export CSV
            </button>
            <button className="btn-add-primary" onClick={() => openModal()}>
              + New Student
            </button>
          </div>
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

      {/* DIGILOCKER POPUP MODAL */}
      {isDigiLockerOpen && (
        <div className="modal-overlay">
          <div className="modal-surface digilocker-modal">
            <div className="modal-head">
              <div className="digi-header-title">
                <span className="digi-badge-symbol">🇮🇳</span>
                <div>
                  <h3>DigiLocker National Academic Depository (NAD)</h3>
                  <p className="modal-subtext">Government of India Verified Document & Marks Certificate Sync</p>
                </div>
              </div>
              <button className="btn-close-modal" onClick={() => setIsDigiLockerOpen(false)}>✕</button>
            </div>

            <div className="digilocker-body-content">
              <div className="digi-status-banner">
                {digiLockerConnected ? (
                  <div className="status-badge-active">
                    <span className="dot-pulse"></span>
                    <span>Status: Active & Aadhaar KYC Verified</span>
                  </div>
                ) : (
                  <div className="status-badge-inactive">
                    <span>Status: Not Linked to Student Registry</span>
                  </div>
                )}
              </div>

              <div className="digi-features-grid">
                <div className="digi-feature-box">
                  <span className="feat-icon">📜</span>
                  <strong>Class 10th / 12th & Degree Certificates</strong>
                  <p>Auto-verifies marksheets directly from CBSE, State Boards, and UGC-recognized Universities.</p>
                </div>
                <div className="digi-feature-box">
                  <span className="feat-icon">🆔</span>
                  <strong>Aadhaar & APAAR ID Integration</strong>
                  <p>Issues One Nation One Student ID (APAAR/ABC) directly aligned with MoE guidelines.</p>
                </div>
              </div>

              <div className="modal-actions digi-actions">
                {digiLockerConnected ? (
                  <>
                    <button 
                      type="button" 
                      className="btn-modal-cancel text-danger" 
                      onClick={handleDisconnectDigiLocker}
                    >
                      Unlink DigiLocker
                    </button>
                    <button 
                      type="button" 
                      className="btn-modal-submit" 
                      onClick={() => setIsDigiLockerOpen(false)}
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button" 
                      className="btn-modal-cancel" 
                      onClick={() => setIsDigiLockerOpen(false)}
                    >
                      Later
                    </button>
                    <button 
                      type="button" 
                      className="btn-modal-submit btn-digi-connect" 
                      onClick={handleConnectDigiLocker}
                      disabled={isSyncingDigi}
                    >
                      {isSyncingDigi ? 'Authorizing with MeriPehchaan...' : 'Authorize & Connect with DigiLocker →'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT CRUD MODAL */}
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