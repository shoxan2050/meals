import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogIn, User as UserIcon, LogOut, Shield, ShoppingCart, Bike } from 'lucide-react';
import { useAuth } from '../App';
import { useCart } from '../context/CartContext';
import { logoutUser } from '../firebase/auth';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import toast from 'react-hot-toast';

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ searchQuery = '', onSearchChange }) => {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleLogout = async () => {
    localStorage.removeItem('courierSession');
    await logoutUser();
    toast.success('Chiqildi!');
    navigate('/');
  };

  const isAdmin = user?.email === 'admin@admin.com';

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Logo */}
          <div className="navbar-logo" onClick={() => navigate('/')}>
            <div className="navbar-logo-icon">🍽️</div>
            <span className="navbar-logo-text">Meals</span>
          </div>

          {/* Search */}
          {onSearchChange && (
            <div className="navbar-search">
              <Search size={16} className="navbar-search-icon" />
              <input
                type="text"
                placeholder="Taom qidiring..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                id="navbar-search-input"
              />
            </div>
          )}

          {/* Actions */}
          <div className="navbar-actions">
            {user ? (
              <>
                {isAdmin ? (
                  <button
                    id="admin-panel-btn"
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate('/adminpage')}
                  >
                    <Shield size={14} />
                    Admin Panel
                  </button>
                ) : (
                  <>
                    <button
                      id="userpage-btn"
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate('/userpage')}
                    >
                      <UserIcon size={14} />
                      {user.displayName || user.email?.split('@')[0]}
                    </button>
                    {/* Cart Button */}
                    <button
                      id="cart-nav-btn"
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate('/cart')}
                      style={{ position: 'relative' }}
                    >
                      <ShoppingCart size={14} />
                      Savat
                      {totalItems > 0 && (
                        <span className="cart-badge">{totalItems}</span>
                      )}
                    </button>
                  </>
                )}
                <button
                  id="logout-btn"
                  className="btn btn-ghost btn-sm"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
                  Chiqish
                </button>
              </>
            ) : (
              <>
                <button
                  id="login-btn"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowLogin(true)}
                >
                  <LogIn size={14} />
                  Kirish
                </button>
                <button
                  id="register-btn"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowRegister(true)}
                >
                  Ro'yxatdan o'tish
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Modals */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onOpenRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}
      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onOpenLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      )}
    </>
  );
};

export default Navbar;
