import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, X, Eye, EyeOff, UserPlus, Phone } from 'lucide-react';
import { registerUser } from '../firebase/auth';
import toast from 'react-hot-toast';

interface RegisterModalProps {
  onClose: () => void;
  onOpenLogin: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ onClose, onOpenLogin }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    if (password !== confirmPassword) {
      setError('Parollar mos kelmadi');
      return;
    }

    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length !== 9) {
      setError('Telefon raqami 9 ta raqamdan iborat bo\'lishi kerak');
      return;
    }

    setLoading(true);
    try {
      await registerUser(email, password, name);
      toast.success('Ro\'yxatdan muvaffaqiyatli o\'tdingiz! 🎉');
      navigate('/userpage');
      onClose();
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        setError('Bu email allaqachon ro\'yxatdan o\'tgan');
      } else if (firebaseError.code === 'auth/invalid-email') {
        setError('Email formati noto\'g\'ri');
      } else if (firebaseError.code === 'auth/weak-password') {
        setError('Parol juda ham zaif');
      } else {
        setError('Ro\'yxatdan o\'tish muvaffaqiyatsiz. Qayta urinib ko\'ring.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
    setPhone(value);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} id="register-modal-close">
          <X size={16} />
        </button>

        <div className="modal-logo">
          <div className="navbar-logo-icon" style={{ width: 36, height: 36, fontSize: 18 }}>🍽️</div>
          <span className="navbar-logo-text" style={{ fontSize: 18 }}>Meals</span>
        </div>
        <h2 className="modal-title">Ro'yxatdan o'ting</h2>
        <p className="modal-subtitle">Yangi hisob yarating va buyurtma bering</p>

        <form onSubmit={handleSubmit} id="register-form">
          <div className="form-group">
            <label className="form-label">Ismingiz</label>
            <div className="form-input-icon">
              <UserIcon size={16} className="input-icon" />
              <input
                id="register-name-input"
                type="text"
                className="form-input"
                placeholder="Ismingizni kiriting"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="form-input-icon">
              <Mail size={16} className="input-icon" />
              <input
                id="register-email-input"
                type="email"
                className="form-input"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Telefon raqam</label>
            <div className="form-input-icon">
              <Phone size={16} className="input-icon" />
              <input
                id="register-phone-input"
                type="tel"
                className="form-input"
                placeholder="+998 ** *** ** **"
                value={phone ? `+998 ${phone.slice(0,2)} ${phone.slice(2,5)} ${phone.slice(5,7)} ${phone.slice(7)}` : ''}
                onChange={handlePhoneChange}
                required
                maxLength={17}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Parol</label>
            <div className="form-input-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="register-password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Kamida 6 ta belgi"
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

          <div className="form-group">
            <label className="form-label">Parolni tasdiqlang</label>
            <div className="form-input-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="register-confirm-password-input"
                type="password"
                className="form-input"
                placeholder="Parolni qayta kiriting"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="form-error" style={{ marginBottom: 12 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            id="register-submit-btn"
            type="submit"
            className={`btn btn-primary btn-lg ${loading ? 'btn-loading' : ''}`}
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : <UserPlus size={16} />}
            {loading ? 'Ro\'yxatdan o\'tilmoqda...' : 'Ro\'yxatdan o\'tish'}
          </button>
        </form>

        <div className="form-footer" style={{ marginTop: 20 }}>
          Hisobingiz bormi?{' '}
          <span className="form-link" onClick={onOpenLogin} id="go-to-login-link">
            Kirish
          </span>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;
