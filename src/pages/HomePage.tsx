import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Star, ChevronRight, Utensils, Coffee, Cake } from 'lucide-react';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import { getProducts, getStores } from '../firebase/firestore';
import { Product, ProductType, Store } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';

const categories = [
  { id: 'hammasi' as ProductType, label: 'Hammasi', icon: '🍴' },
  { id: 'ovqat' as ProductType, label: 'Ovqatlar', icon: '🍽️' },
  { id: 'ichimlik' as ProductType, label: 'Ichimliklar', icon: '🥤' },
  { id: 'desert' as ProductType, label: 'Desertlar', icon: '🍰' },
];

const features = [
  { icon: <Clock size={24} />, title: '30 daqiqa', desc: 'Tez yetkazib berish' },
  { icon: <Star size={24} />, title: 'Sifatli', desc: 'Eng yaxshi taomlar' },
  { icon: <MapPin size={24} />, title: 'Qulay', desc: 'Uyingizga yetkazamiz' },
];

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<ProductType>('hammasi');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Store and Product Details
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const courierSession = localStorage.getItem('courierSession');
    if (courierSession) {
      navigate('/courierpage');
    } else if (user) {
      if (user.email === 'admin@admin.com') {
        navigate('/adminpage');
      } else {
        navigate('/userpage');
      }
    } else {
      loadProducts();
      loadStores();
    }
  }, [user, navigate]);

  useEffect(() => {
    let result = products;
    if (activeCategory !== 'hammasi') {
      result = result.filter(p => p.type === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    setFilteredProducts(result);
  }, [products, activeCategory, searchQuery]);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      toast.error("Mahsulotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try { setStores(await getStores()); }
    catch { console.error('Store load error'); }
  };

  return (
    <div>
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              ⚡ Tez yetkazib berish — 30 daqiqa ichida
            </div>
            <h1 className="hero-title">
              Eng Mazali<br />
              <span className="highlight">Taomlar</span> Eshigingizda
            </h1>
            <p className="hero-subtitle">
              Sevimli restoranlaringizdan buyurtma bering,<br />
              tez va qulay yetkazib beramiz
            </p>

            <div className="hero-search">
              <div className="search-input-wrapper">
                <MapPin className="search-icon" size={20} />
                <input 
                  type="text" 
                  placeholder="Taom yoki restoran qidiring..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <button className="btn btn-primary" onClick={() => {
                const menuEl = document.getElementById('products-section');
                if (menuEl) menuEl.scrollIntoView({ behavior: 'smooth' });
              }}>
                Ko'rish
              </button>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-value">500+</div>
                <div className="hero-stat-label">Taomlar</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value">30 min</div>
                <div className="hero-stat-label">Yetkazib berish</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  4.9 <Star fill="currentColor" size={20} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="hero-stat-label">Reyting</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'all 0.25s ease',
                  cursor: 'default',
                }}
              >
                <div style={{
                  width: 48, height: 48,
                  background: 'rgba(252, 76, 2, 0.12)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products-section">
        {/* Categories */}
        <div className="categories-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Menyu</h2>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {filteredProducts.length} ta mahsulot
              </span>
            </div>
            <div className="categories-tabs">
              {categories.map(category => (
                <button
                  key={category.id}
                  id={`category-tab-${category.id}`}
                  className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <span>{category.icon}</span> {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="products-section">
          <div className="container">
            {loading ? (
              <div className="loading-overlay">
                <div className="loading-spinner" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🍽️</div>
                <div className="empty-state-title">
                  {searchQuery ? 'Natija topilmadi' : 'Mahsulotlar yo\'q'}
                </div>
                <div className="empty-state-text">
                  {searchQuery
                    ? `"${searchQuery}" bo'yicha hech narsa topilmadi`
                    : 'Admin hali mahsulot qo\'shmagan'}
                </div>
              </div>
            ) : (
              <div className="products-grid">
                {filteredProducts.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onClick={(p) => setSelectedProduct(p)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ReCa Modal */}
      {selectedProduct && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: 600, width: '90%', padding: 0, overflow: 'hidden' }}>
            <button className="modal-close" style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', zIndex: 10 }} onClick={() => setSelectedProduct(null)}>✕</button>
            
            {/* Find product store */}
            {(() => {
              const store = stores.find(s => s.id === selectedProduct.storeId);
              return (
                <div>
                  {store?.images && store.images.length > 0 ? (
                    <div style={{ height: 250, width: '100%', background: '#eee', position: 'relative' }}>
                      <img src={store.images[0]} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
                        {store.type === 'restaurant' ? '🍽️ Restoran' : store.type === 'cafe' ? '☕ Kafe' : '🏪 Do\'kon'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: 100, width: '100%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 700 }}>
                      {store ? store.name : 'Meals'}
                    </div>
                  )}
                  
                  <div style={{ padding: 24 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
                      {selectedProduct.name}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                      {selectedProduct.description}
                    </p>
                    
                    {store && (
                      <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                        <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{store.type === 'restaurant' ? '🍽️' : store.type === 'cafe' ? '☕' : '🏪'}</span>
                          {store.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--text-secondary)', fontSize: 14, marginBottom: 10 }}>
                          <MapPin size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary)' }} />
                          <span>{store.address || 'Manzil kiritilmagan'}</span>
                        </div>
                        {store.description && (
                          <div style={{ fontSize: 14, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: 12, borderRadius: 'var(--radius-md)', fontStyle: 'italic' }}>
                            "{store.description}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
