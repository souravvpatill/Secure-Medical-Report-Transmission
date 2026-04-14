import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, Shield, UserPlus, Building2, Upload, FileText, Download, 
  Search, ShieldAlert, CheckCircle2, Clock, Inbox, Send, ChevronRight
} from 'lucide-react';
import { authService, adminService, reportService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [adminData, setAdminData] = useState({ entityName: '', entityType: 'lab', username: '', password: '', role: 'lab_tech', userEntity: '' });
  const [reports, setReports] = useState([]);
  const [entities, setEntities] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadEntityId, setUploadEntityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authService.getMe();
      setUser(res.data);
      fetchEntities();
      if (res.data.role !== 'admin') {
        fetchReports();
      }
    } catch (err) {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntities = async () => {
    try {
      const res = await adminService.listEntities();
      setEntities(res.data);
      if (res.data.length > 0 && !uploadEntityId) {
        setUploadEntityId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch entities');
    }
  };

  const fetchReports = async () => {
    try {
      const res = await reportService.list();
      setReports(res.data.reverse());
    } catch (err) {
      console.error('Failed to fetch reports');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  // --- Handlers ---
  const handleCreateEntity = async (e) => {
    e.preventDefault();
    try {
      await adminService.createEntity({ name: adminData.entityName, type: adminData.entityType });
      setMessage(`Entity ${adminData.entityName} established.`);
      setAdminData({ ...adminData, entityName: '' });
      fetchEntities();
    } catch (err) { setMessage('Failed to create entity.'); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await adminService.createUser({
        username: adminData.username,
        password: adminData.password,
        role: adminData.role,
        entity_name: adminData.userEntity
      });
      setMessage(`Security profile for ${adminData.username} initialized.`);
      setAdminData({ ...adminData, username: '', password: '' });
    } catch (err) { setMessage('Failed to create user.'); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    try {
      await reportService.upload(uploadEntityId, uploadFile);
      setMessage('Document encrypted and transmitted securely.');
      setUploadFile(null);
      fetchReports();
    } catch (err) { setMessage('Transmission failed.'); }
  };

  const handleDownload = async (reportId, filename) => {
    try {
      await reportService.download(reportId, filename);
    } catch (err) { setMessage('Decryption attempt failed.'); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-sage)' }}>
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-header)' }}>
        Synchronizing secure nodes...
      </motion.h1>
    </div>
  );

  return (
    <div className="fade-in" style={{ padding: '0 4%', minHeight: '100vh', width: '100%' }}>
      {/* Refined Navigation */}
      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '40px 0', borderBottom: '1px solid var(--glass-border)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Shield size={32} color="var(--accent)" strokeWidth={1.5} />
          <h1 style={{ fontSize: '32px', letterSpacing: '0.05em' }}>MEDISECURE</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-dark)' }}>{user.username}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{user.role.replace('_', ' ')}</div>
          </div>
          <button onClick={handleLogout} style={{ 
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
            padding: '10px', borderRadius: '50%', display: 'flex'
          }} className="nav-link">
            <LogOut size={24} strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      {/* Global Success Notification */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass" 
            style={{ 
              padding: '16px 24px', position: 'fixed', top: '40px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 100, borderRadius: '40px', background: 'rgba(255,255,255,0.9)', 
              color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.05)'
            }}
          >
            <CheckCircle2 size={18} /> {message}
            <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px' }}>&times;</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: '40px', paddingBottom: '80px' }}>
        
        {/* --- ADMIN VIEW --- */}
        {user.role === 'admin' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '40px' }}>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card">
              <div style={{ marginBottom: '24px' }}>
                <Building2 color="var(--accent)" size={28} strokeWidth={1} />
                <h2 style={{ fontSize: '28px', marginTop: '12px' }}>Initialize Entity</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Register certified clinical nodes.</p>
              </div>
              <form onSubmit={handleCreateEntity}>
                <input type="text" className="input-field" placeholder="Entity Display Name" style={{ marginBottom: '16px' }} 
                  value={adminData.entityName} onChange={e => setAdminData({...adminData, entityName: e.target.value})} required />
                <select className="input-field" style={{ marginBottom: '24px' }} value={adminData.entityType} onChange={e => setAdminData({...adminData, entityType: e.target.value})}>
                  <option value="lab">Diagnostic Laboratory</option>
                  <option value="hospital">Clinical Hospital</option>
                </select>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Deploy Entity Node</button>
              </form>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }} className="glass-card">
              <div style={{ marginBottom: '24px' }}>
                <Inbox color="var(--accent)" size={28} strokeWidth={1} />
                <h2 style={{ fontSize: '28px', marginTop: '12px' }}>Active Directory</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Operational clinical endpoints.</p>
              </div>
              <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '10px' }}>
                {entities.length === 0 && <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No nodes synchronized.</p>}
                {entities.map(e => (
                  <div key={e.id} style={{ 
                    padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid rgba(0,0,0,0.03)'
                  }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '15px' }}>{e.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{e.type}</div>
                    </div>
                    <div style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--accent)' }}>NODE ID: {e.id}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }} className="glass-card">
              <div style={{ marginBottom: '24px' }}>
                <UserPlus color="var(--accent)" size={28} strokeWidth={1} />
                <h2 style={{ fontSize: '28px', marginTop: '12px' }}>Provision User</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Assign secure medical credentials.</p>
              </div>
              <form onSubmit={handleCreateUser}>
                <input type="text" className="input-field" placeholder="Unique Username" style={{ marginBottom: '16px' }} 
                  value={adminData.username} onChange={e => setAdminData({...adminData, username: e.target.value})} required />
                <input type="password" className="input-field" placeholder="Private Access Password" style={{ marginBottom: '16px' }} 
                  value={adminData.password} onChange={e => setAdminData({...adminData, password: e.target.value})} required />
                
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Assigned clinical Node</label>
                <select className="input-field" style={{ marginBottom: '16px' }} 
                  value={adminData.userEntity} onChange={e => setAdminData({...adminData, userEntity: e.target.value})} required>
                  <option value="">Select Endpoint</option>
                  {entities.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
                
                <select className="input-field" style={{ marginBottom: '24px' }} value={adminData.role} onChange={e => setAdminData({...adminData, role: e.target.value})}>
                  <option value="lab_tech">Lab Technician</option>
                  <option value="physician">Clinical Physician</option>
                  <option value="admin">Administrator</option>
                </select>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Finalize Profile</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* --- LAB TECH VIEW --- */}
        {user.role === 'lab_tech' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '40px' }}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card">
              <div style={{ marginBottom: '24px' }}>
                <Send color="var(--accent)" size={28} strokeWidth={1} />
                <h2 style={{ fontSize: '28px', marginTop: '12px' }}>Transmit Report</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Securely route encrypted clinical data.</p>
              </div>
              <form onSubmit={handleUpload}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', textTransform: 'uppercase' }}>Target Clinical Endpoint</label>
                <select className="input-field" style={{ marginBottom: '24px' }} 
                  value={uploadEntityId} onChange={e => setUploadEntityId(e.target.value)} required>
                  {entities.length === 0 && <option value="">No nodes detected</option>}
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                
                <div style={{ 
                  border: '1.5px dashed var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '40px 20px', 
                  textAlign: 'center', marginBottom: '32px', cursor: 'pointer', background: uploadFile ? 'var(--accent-soft)' : 'rgba(255,255,255,0.3)' 
                }} onClick={() => document.getElementById('fileInput').click()}>
                  <input type="file" id="fileInput" hidden onChange={e => setUploadFile(e.target.files[0])} />
                  {uploadFile ? (
                    <div style={{ color: 'var(--accent)', fontWeight: '500' }}>{uploadFile.name}</div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Drop clinical document here</div>
                  )}
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Encrypt & Transmit</button>
              </form>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card">
              <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>Activity Log</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reports.length === 0 && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No recent transmissions.</p>}
                {reports.map(r => (
                  <div key={r.id} style={{ 
                    padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(255,255,255,0.4)', borderRadius: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <FileText color="var(--text-muted)" size={20} strokeWidth={1.5} />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '500' }}>{r.filename}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(r.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Encrypted</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* --- PHYSICIAN VIEW --- */}
        {user.role === 'physician' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '40px' }}>
              <div>
                <h2 style={{ fontSize: '32px' }}>Medical Inbox</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>{user.entity_name} &mdash; Secure clinical stream.</p>
              </div>
              <button onClick={fetchReports} style={{ 
                background: 'var(--accent-soft)', border: 'none', color: 'var(--accent)', 
                padding: '10px 20px', borderRadius: '30px', cursor: 'pointer', fontSize: '13px' 
              }}>Refresh Stream</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px' }}>
              {reports.length === 0 && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1/-1' }}>No secure reports accessible in your node.</p>}
              {reports.map(r => (
                <motion.div whileHover={{ y: -5 }} key={r.id} 
                  style={{ 
                    padding: '32px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.4)', position: 'relative'
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ 
                      width: '48px', height: '48px', background: 'var(--accent-soft)', 
                      borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <FileText color="var(--accent)" size={24} />
                    </div>
                    <div style={{ 
                      fontSize: '10px', fontWeight: '700', padding: '6px 10px', borderRadius: '6px',
                      background: 'white', color: 'var(--accent)', letterSpacing: '0.1em'
                    }}>AES-ENCRYPTED</div>
                  </div>
                  
                  <div style={{ marginBottom: '32px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.filename}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} /> {new Date(r.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <button onClick={() => handleDownload(r.id, r.filename)} style={{ 
                    width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid var(--accent)',
                    background: 'transparent', color: 'var(--accent)', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px'
                  }}>
                    Decrypt & View <ChevronRight size={18} />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
