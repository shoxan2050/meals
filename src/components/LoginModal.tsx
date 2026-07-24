import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, X, Eye, EyeOff } from 'lucide-react';
import { loginUser, registerUser } from '../firebase/auth';
import { authenticateCourier } from '../firebase/firestore';
import toast from 'react-hot-toast';

interface LoginModalProps {
  onClose: () => void;
  onOpenRegister: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onOpenRegister }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Admin shortcut: if both fields are "admin"
      let loginEmail = email;
      let loginPassword = password;

      if (email.toLowerCase() === 'admin' && password.toLowerCase() === 'admin') {
        loginEmail = 'admin@admin.com';
        loginPassword = 'admin123';
        // Try to create admin account if not exists
        try {
          await registerUser(loginEmail, loginPassword, 'Admin');
        } catch {
          // Already exists, that's fine
        }
      }

      // Check if it's a courier login first
      const courier = await authenticateCourier(loginEmail, loginPassword);
      if (courier) {
        localStorage.setItem('courierSession', JSON.stringify({
          id: courier.id,
          username: courier.username,
          role: 'courier'
        }));
        toast.success('Kuryer tizimiga kirdingiz! 🚴');
        navigate('/courierpage');
        onClose();
        return; // Stop here if courier
      }

      // If not courier, proceed with normal Firebase Auth
      const user = await loginUser(loginEmail, loginPassword);
      toast.success('Xush kelibsiz! 🎉');

      if (user.email === 'admin@admin.com') {
        navigate('/adminpage');
      } else {
        navigate('/userpage');
      }
      onClose();
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential') {
        setError('Email yoki parol noto\'g\'ri');
      } else if (firebaseError.code === 'auth/wrong-password') {
        setError('Parol noto\'g\'ri');
      } else if (firebaseError.code === 'auth/invalid-email') {
        setError('Email formati noto\'g\'ri');
      } else {
        setError('Kirish muvaffaqiyatsiz. Qayta urinib ko\'ring.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} id="login-modal-close">
          <X size={16} />
        </button>

        <div className="modal-logo">
          <div className="navbar-logo-icon" style={{ width: 36, height: 36, fontSize: 18 }}>🍽️</div>
          <span className="navbar-logo-text" style={{ fontSize: 18 }}>Meals</span>
        </div>
        <h2 className="modal-title">Kirish</h2>
        <p className="modal-subtitle">Hisobingizga kiring va buyurtma bering</p>

        <form onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label className="form-label">Email yoki Login</label>
            <div className="form-input-icon">
              <Mail size={16} className="input-icon" />
              <input
                id="login-email-input"
                type="text"
                className="form-input"
                placeholder="email@example.com yoki admin"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Parol</label>
            <div className="form-input-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Parolingizni kiriting"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="form-error" style={{ marginBottom: 12 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            className={`btn btn-primary btn-lg ${loading ? 'btn-loading' : ''}`}
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : <LogIn size={16} />}
            {loading ? 'Kirish...' : 'Kirish'}
          </button>
        </form>

        <div className="form-divider">yoki</div>

        <div className="form-footer">
          Hisobingiz yo'qmi?{' '}
          <span className="form-link" onClick={onOpenRegister} id="go-to-register-link">
            Ro'yxatdan o'ting
          </span>
        </div>

      </div>
    </div>
  );
};

export default LoginModal;
