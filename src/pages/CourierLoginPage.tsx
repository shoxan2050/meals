import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn, X, Eye, EyeOff, Bike } from 'lucide-react';
import { loginCourier } from '../firebase/firestore';
import toast from 'react-hot-toast';
import { CourierSession } from '../types';

const CourierLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const courier = await loginCourier(username.trim(), password.trim());
      if (!courier) {
        setError('Login yoki parol noto\'g\'ri');
        setLoading(false);
        return;
      }

      const session: CourierSession = {
        id: courier.id!,
        username: courier.username,
        role: 'courier',
      };
      localStorage.setItem('courierSession', JSON.stringify(session));
      toast.success(`Xush kelibsiz, ${courier.username}! 🚴`);
      navigate('/courierpage');
    } catch (err) {
      console.error(err);
      setError('Kirish muvaffaqiyatsiz. Qayta urinib ko\'ring.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(252,76,2,0.08) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72,
            background: 'var(--gradient-primary)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, margin: '0 auto 16px',
            boxShadow: 'var(--shadow-primary)',
          }}>
            🚴
          </div>
          <div className="navbar-logo-text" style={{ fontSize: 24, display: 'block', marginBottom: 4 }}>Meals</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Kuryer portali</p>
        </div>

        {/* Card */}
        <div className="admin-card" style={{ borderColor: 'rgba(252,76,2,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <Bike size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Kuryer kirishi</h2>
          </div>

          <form onSubmit={handleSubmit} id="courier-login-form">
            <div className="form-group">
              <label className="form-label">Login</label>
              <div className="form-input-icon">
                <User size={16} className="input-icon" />
                <input
                  id="courier-login-input"
                  type="text"
                  className="form-input"
                  placeholder="Loginni kiriting"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Parol</label>
              <div className="form-input-icon">
                <Lock size={16} className="input-icon" />
                <input
                  id="courier-password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Parolni kiriting"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="form-error" style={{ marginBottom: 12 }}>⚠️ {error}</div>
            )}

            <button
              id="courier-login-submit"
              type="submit"
              className={`btn btn-primary btn-lg ${loading ? 'btn-loading' : ''}`}
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : <LogIn size={16} />}
              {loading ? 'Kirish...' : 'Kirish'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
              <X size={14} /> Bosh sahifaga qaytish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierLoginPage;
