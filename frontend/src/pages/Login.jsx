import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight } from 'lucide-react';
import { authService } from '../services/api';
import { motion } from 'framer-motion';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await authService.login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card" 
        style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}
      >
        <div style={{ marginBottom: '40px' }}>
          <div style={{ 
            width: '64px', height: '64px', background: 'var(--accent-soft)', borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
          }}>
            <Shield size={32} color="var(--accent)" strokeWidth={1.5} />
          </div>
          <h1 style={{ fontSize: '36px', color: 'var(--text-dark)' }}>MediSecure</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginTop: '8px' }}>
            Clinical Report Transmission Gateway
          </p>
        </div>

        {error && (
          <div style={{ 
            padding: '12px', borderRadius: '12px', background: 'rgba(166, 75, 75, 0.1)', 
            color: 'var(--error)', marginBottom: '24px', fontSize: '14px' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" className="input-field" placeholder="Username" 
              style={{ paddingLeft: '48px' }}
              value={username} onChange={e => setUsername(e.target.value)} required 
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="password" className="input-field" placeholder="Password" 
              style={{ paddingLeft: '48px' }}
              value={password} onChange={e => setPassword(e.target.value)} required 
            />
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
            Sign In <ArrowRight size={18} />
          </button>
        </form>

        <p style={{ marginTop: '40px', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          PROTECTED BY AES-256-GCM / RSA-2048
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
