import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { User } from 'firebase/auth';
import { onAuthChange } from './firebase/auth';
import { CartProvider } from './context/CartContext';
import HomePage from './pages/HomePage';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import CartPage from './pages/CartPage';
import CourierPage from './pages/CourierPage';

// Auth Context
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({ user: null, loading: true });
export const useAuth = () => useContext(AuthContext);

// Protected route for users
const UserRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (user.email === 'admin@admin.com') return <Navigate to="/adminpage" replace />;
  return <>{children}</>;
};

// Protected route for admin
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  if (!user || user.email !== 'admin@admin.com') return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Protected route for courier
const CourierRoute = ({ children }: { children: React.ReactNode }) => {
  const session = localStorage.getItem('courierSession');
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <CartProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1E1E1E',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                fontFamily: 'Outfit, sans-serif',
              },
              success: {
                iconTheme: { primary: '#FC4C02', secondary: '#FFFFFF' },
              },
            }}
          />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/userpage" element={
              <UserRoute><UserPage /></UserRoute>
            } />
            <Route path="/cart" element={
              <UserRoute><CartPage /></UserRoute>
            } />
            <Route path="/adminpage" element={
              <AdminRoute><AdminPage /></AdminRoute>
            } />
            <Route path="/courierpage" element={
              <CourierRoute><CourierPage /></CourierRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthContext.Provider>
  );
}

export default App;
