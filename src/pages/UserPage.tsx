import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShoppingCart, Clock, CheckCircle, MapPin, Bike, Settings, Star } from 'lucide-react';
import { useAuth } from '../App';
import { useCart } from '../context/CartContext';
import { logoutUser, updateUserEmail, updateUserPassword } from '../firebase/auth';
import { getProducts, getUserOrders, sendMessage, subscribeToMessages, subscribeToChats, markChatRead, getStores, updateOrderRating } from '../firebase/firestore';
import ProductCard from '../components/ProductCard';
import { Product, ProductType, Order, Message, Chat, Store } from '../types';
import toast from 'react-hot-toast';


const categories = [
  { id: 'hammasi' as ProductType, label: 'Hammasi', icon: '🍴' },
  { id: 'ovqat'   as ProductType, label: 'Ovqatlar', icon: '🍽️' },
  { id: 'ichimlik' as ProductType, label: 'Ichimliklar', icon: '🥤' },
  { id: 'desert'  as ProductType, label: 'Desertlar', icon: '🍰' },
];

const storeCategories = [
  { id: 'restaurant', label: 'Restoranlar', icon: '🍽️' },
  { id: 'cafe', label: 'Kafelar', icon: '☕' },
  { id: 'shop', label: 'Do\'konlar', icon: '🏪' },
];

const subCategories = {
  restaurant: [
    { id: 'ovqat', label: 'Ovqatlar', icon: '🍽️' },
    { id: 'ichimlik', label: 'Ichimliklar', icon: '🥤' },
    { id: 'desert', label: 'Desertlar', icon: '🍰' },
  ],
  cafe: [
    { id: 'ichimlik', label: 'Ichimliklar', icon: '🥤' },
    { id: 'desert', label: 'Desertlar', icon: '🍰' },
    { id: 'ovqat', label: 'Yengik ovqatlar', icon: '🍽️' },
  ],
  shop: [
    { id: 'ovqat', label: 'Mahsulotlar', icon: '📦' },
    { id: 'ichimlik', label: 'Ichimliklar', icon: '🥤' },
  ],
};

const statusInfo: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  awaiting_payment: { label: 'To\'lov tasdiqlanmoqda...', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: <CheckCircle size={16}/> },
  pending:   { label: 'Kuryer qidirilmoqda...', color: 'var(--primary)', bg: 'rgba(252,76,2,0.1)',  icon: <Bike size={16}/> },
  accepted:  { label: 'Kuryer yo\'lda!',         color: '#3b82f6',       bg: 'rgba(59,130,246,0.1)', icon: <Bike size={16}/> },
  picked_up: { label: 'Yetkazilmoqda 🚴',        color: '#f59e0b',       bg: 'rgba(245,158,11,0.1)', icon: <Bike size={16}/> },
  delivered: { label: 'Yetkazildi ✅',            color: '#22c55e',       bg: 'rgba(34,197,94,0.1)',  icon: <CheckCircle size={16}/> },
  cancelled: { label: 'To\'lovingiz rad etildi ❌', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: <CheckCircle size={16}/> },
};

const UserPage: React.FC = () => {
  const { user } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<ProductType>('hammasi');
  const [activeStoreCategory, setActiveStoreCategory] = useState<'restaurant'|'cafe'|'shop'|null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Store and Product Details
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  // Rating
  const [unratedOrder, setUnratedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatId, setChatId] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Settings state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingCreds, setUpdatingCreds] = useState(false);

  useEffect(() => { loadProducts(); loadStores(); }, []);

  // Notification request
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const prevUnreadCount = React.useRef(0);

  useEffect(() => {
    if (!user) return;
    const unsub = getUserOrders(user.uid, (orders) => {
      setAllOrders(orders);
      setActiveOrders(orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').slice(0, 3));
      
      // Check for unrated delivered orders (not yet rated and not dismissed)
      const unrated = orders.find(o => o.status === 'delivered' && !o.isRated && !localStorage.getItem(`dismissed_rating_${o.id}`));
      
      // Only set new unrated order if different from current
      if (unrated) {
        if (!unratedOrder || unratedOrder.id !== unrated.id) {
          setUnratedOrder(unrated);
          // Reset rating form when new order appears
          setRating(0);
          setRatingComment('');
        }
      } else if (unratedOrder) {
        // No unrated orders found, clear the modal
        setUnratedOrder(null);
        setRating(0);
        setRatingComment('');
      }
    });
    
    // Subscribe to chat list for unread count and ID
    const unsubChats = subscribeToChats((chats) => {
      const myChat = chats.find(c => c.userId === user.uid);
      if (myChat) {
        setChatId(myChat.id!);
        const currentUnread = myChat.unreadCountUser || 0;
        setUnreadCount(currentUnread);
        
        if (currentUnread > prevUnreadCount.current) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Yangi xabar', { body: 'Admin sizga javob yozdi!' });
          }
        }
        prevUnreadCount.current = currentUnread;
      } else {
        setChatId(user.uid); // Default chat id
      }
    });

    return () => { unsub(); unsubChats(); };
  }, [user]);

  useEffect(() => {
    if (showChat && chatId) {
      markChatRead(chatId, 'user');
      const unsub = subscribeToMessages(chatId, (msgs) => setMessages(msgs));
      return () => unsub();
    }
  }, [showChat, chatId]);

  useEffect(() => {
    let result = products;
    if (activeCategory !== 'hammasi') result = result.filter(p => p.type === activeCategory);
    if (activeStoreCategory) {
      const storeIds = stores.filter(s => s.type === activeStoreCategory).map(s => s.id);
      result = result.filter(p => p.storeId && storeIds.includes(p.storeId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    setFilteredProducts(result);
  }, [products, activeCategory, activeStoreCategory, searchQuery, stores]);

  const loadProducts = async () => {
    try { setProducts(await getProducts()); }
    catch { toast.error('Yuklashda xato'); }
    finally { setLoading(false); }
  };

  const loadStores = async () => {
    try { setStores(await getStores()); }
    catch { console.error('Store load error'); }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unratedOrder) return;
    if (rating === 0) {
      toast.error('Iltimos, yulduzchalarni belgilab baholang!');
      return;
    }
    setSubmittingRating(true);
    try {
      await updateOrderRating(unratedOrder.id!, rating, ratingComment);
      toast.success('Bahoingiz uchun rahmat! 😊');
      localStorage.setItem(`dismissed_rating_${unratedOrder.id}`, 'true');
      setUnratedOrder(null);
      setRating(0);
      setRatingComment('');
    } catch {
      toast.error('Baho yuborishda xato');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleDismissRating = () => {
    if (unratedOrder) {
      localStorage.setItem(`dismissed_rating_${unratedOrder.id}`, 'true');
      setUnratedOrder(null);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    toast.success('Chiqildi!');
    navigate('/');
  };

  const handleUpdateCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdatingCreds(true);
    try {
      if (newEmail && newEmail !== user.email) {
        await updateUserEmail(user, newEmail);
      }
      if (newPassword) {
        await updateUserPassword(user, newPassword);
      }
      toast.success('Sozlamalar yangilandi! Xavfsizlik uchun tizimga qayta kiring.');
      await handleLogout();
    } catch (err: any) {
      toast.error('Xato yuz berdi. Iltimos oldin tizimdan chiqib yana kiring va takrorlang.');
    } finally {
      setUpdatingCreds(false);
      setShowSettingsModal(false);
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Foydalanuvchi';

  return (
    <div className="userpage">
      {/* Header */}
      <header style={{
        background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div className="navbar-logo-icon">🍽️</div>
            <span className="navbar-logo-text">Meals</span>
          </div>

          {/* Search */}
          <div className="navbar-search" style={{ maxWidth: 360 }}>
            <svg className="navbar-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Taom qidiring..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} id="userpage-search-input"/>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Cart */}
            <button id="cart-btn" className="btn btn-primary btn-sm"
              style={{ position: 'relative' }} onClick={() => navigate('/cart')}>
              <ShoppingCart size={16}/>
              Savat
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </button>

            {/* User avatar Dropdown */}
            <div style={{ position: 'relative' }}>
              <div 
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                  background: 'var(--bg-card)', borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-subtle)', fontSize: 14, color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <span style={{
                  width: 28, height: 28, background: 'var(--primary)',
                  borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700,
                }}>
                  {displayName[0].toUpperCase()}
                </span>
                {displayName}
              </div>

              {showProfileMenu && (
                <>
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} onClick={() => setShowProfileMenu(false)} />
                  <div style={{
                    position: 'absolute', top: '120%', right: 0, background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 8,
                    width: 160, zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 4 }} 
                      onClick={() => { setShowProfileMenu(false); setShowSettingsModal(true); }}
                    >
                      <Settings size={14}/> Sozlamalar
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ width: '100%', justifyContent: 'flex-start', color: '#ef4444' }} 
                      onClick={handleLogout}
                    >
                      <LogOut size={14}/> Chiqish
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Active Order Banners */}
      {activeOrders.map(order => {
        const info = statusInfo[order.status] || statusInfo.pending;
        return (
          <div key={order.id} style={{
            background: info.bg, borderBottom: `2px solid ${info.color}`,
            padding: '14px 0', animation: 'pulse-glow 2s ease-in-out infinite',
          }}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: info.color }}>{info.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: info.color, fontSize: 15 }}>{info.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {order.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {order.estimatedTime && (
                  <div style={{ fontSize: 13, color: info.color, fontWeight: 600 }}>
                    <Clock size={13} style={{ display: 'inline', marginRight: 4 }}/>
                    ~{order.estimatedTime} daqiqa
                  </div>
                )}
                {order.totalPrice > 0 && (
                  <div style={{ fontWeight: 800, color: 'var(--primary)' }}>
                    {order.totalPrice.toLocaleString()} so'm
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(252,76,2,0.12) 0%, transparent 60%)',
        borderBottom: '1px solid var(--border-subtle)', padding: '28px 0',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
              Xush kelibsiz, <span style={{ color: 'var(--primary)' }}>{displayName}! 👋</span>
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Bugun nima yemoqchisiz?</p>
          </div>
          <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
            {[
              { label: 'Mahsulotlar', value: products.length },
              { label: 'Savatda', value: totalItems },
            ].map((s, i) => (
              <div key={i} style={{
                textAlign: 'center', background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', padding: '12px 20px',
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories / History Tab */}
      <div className="categories-section">
        <div className="container">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title">{showHistory ? 'Mening buyurtmalarim' : 'Menyu'}</h2>
            <div>
              <button className={`btn btn-sm ${!showHistory ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowHistory(false)}>Menyu</button>
              <button className={`btn btn-sm ${showHistory ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowHistory(true)}>Tarix</button>
            </div>
          </div>

          {!showHistory && (
            <>
              {/* Store Categories */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Kategoriyalar</h3>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {storeCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveStoreCategory(activeStoreCategory === cat.id ? null : cat.id as any);
                        setActiveCategory('hammasi');
                      }}
                      style={{
                        padding: '12px 20px',
                        background: activeStoreCategory === cat.id ? 'var(--primary)' : 'var(--bg-card)',
                        border: `1px solid ${activeStoreCategory === cat.id ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s',
                        color: activeStoreCategory === cat.id ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{cat.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategories based on selected store category */}
              {activeStoreCategory && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)' }}>
                    Mahsulot turlari
                  </h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {subCategories[activeStoreCategory].map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveCategory(sub.id as ProductType)}
                        style={{
                          padding: '8px 16px',
                          background: activeCategory === sub.id ? 'var(--primary)' : 'var(--bg-elevated)',
                          border: `1px solid ${activeCategory === sub.id ? 'var(--primary)' : 'var(--border-subtle)'}`,
                          borderRadius: 'var(--radius-full)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s',
                          color: activeCategory === sub.id ? 'white' : 'var(--text-secondary)',
                          fontSize: 13,
                        }}
                      >
                        <span>{sub.icon}</span>
                        <span>{sub.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!activeStoreCategory && (
                <div className="categories-tabs">
                  {categories.map(cat => (
                    <button key={cat.id} id={`user-category-tab-${cat.id}`}
                      className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setActiveCategory(cat.id)}>
                      <span>{cat.icon}</span>{cat.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content (Products or History) */}
      <div className="products-section">
        <div className="container">
          {showHistory ? (
            <div>
              {allOrders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <div className="empty-state-title">Buyurtmalar yo'q</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {allOrders.map(o => {
                    const info = statusInfo[o.status] || statusInfo.pending;
                    return (
                      <div key={o.id} style={{ background: 'var(--bg-card)', border: `1px solid ${info.color}40`, borderRadius: 'var(--radius-lg)', padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <span style={{ color: info.color, fontWeight: 700, padding: '4px 10px', background: info.bg, borderRadius: 'var(--radius-full)', fontSize: 13 }}>
                            {info.label}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                            {o.createdAt?.toLocaleDateString('uz-UZ')} {o.createdAt?.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>
                          {o.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--primary)' }}>Jami: {o.totalPrice.toLocaleString('ru-RU')} so'm</div>
                        {o.paymentMethod === 'card' && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>💳 Karta orqali to'lov</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            loading ? (
              <div className="loading-overlay"><div className="loading-spinner"/></div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🍽️</div>
                <div className="empty-state-title">{searchQuery ? 'Natija topilmadi' : 'Mahsulotlar yo\'q'}</div>
                <div className="empty-state-text">
                  {searchQuery ? `"${searchQuery}" bo'yicha hech narsa topilmadi` : 'Admin hali mahsulot qo\'shmagan'}
                </div>
              </div>
            ) : (
              <div className="products-grid">
                {filteredProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i}/>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Support Chat Widget */}
      <div style={{ position: 'fixed', bottom: 32, right: totalItems > 0 ? 100 : 32, zIndex: 1000 }}>
        {showChat ? (
          <div style={{ width: 320, height: 450, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '12px 16px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>💬 Yordam markazi</span>
              <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} onClick={() => setShowChat(false)}>✕</button>
            </div>
            
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 20 }}>
                  Savollaringiz bormi? Bizga yozing!
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.id} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', background: m.sender === 'user' ? 'var(--primary)' : 'var(--bg-elevated)', color: m.sender === 'user' ? 'white' : 'var(--text-primary)', padding: '8px 12px', borderRadius: 16, maxWidth: '85%', fontSize: 14 }}>
                    {m.text}
                  </div>
                ))
              )}
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim()) return;
              sendMessage(chatId, user!.uid, displayName, chatInput, 'user');
              setChatInput('');
            }} style={{ padding: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
              <input type="text" className="form-input" style={{ flex: 1, height: 36, fontSize: 14 }} placeholder="Xabar yozing..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
              <button type="submit" className="btn btn-primary btn-sm" style={{ height: 36 }}>Yuborish</button>
            </form>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ borderRadius: '50px', padding: '16px 32px', height: 60, boxShadow: '0 4px 16px rgba(252,76,2,0.4)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 18 }} onClick={() => setShowChat(true)}>
            💬 <span style={{ fontWeight: 700 }}>Yordam (Chat)</span>
            {unreadCount > 0 && <span className="cart-badge" style={{ position: 'relative', top: 0, right: 0, background: 'white', color: 'var(--primary)' }}>{unreadCount}</span>}
          </button>
        )}
      </div>

      {/* Floating Cart Button */}
      {totalItems > 0 && !showChat && (
        <button className="fab" id="floating-cart-btn" onClick={() => navigate('/cart')}
          title={`Savat (${totalItems} ta)`} style={{ bottom: 32, right: 32 }}>
          <ShoppingCart size={24}/>
          <span className="cart-badge" style={{ top: -4, right: -4 }}>{totalItems}</span>
        </button>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ width: 420 }}>
            <button className="modal-close" onClick={() => setShowSettingsModal(false)}>✕</button>
            <h2 className="modal-title">⚙️ Sozlamalar</h2>
            
            <form onSubmit={handleUpdateCreds}>
              <div className="form-group">
                <label className="form-label">Yangi Email (ixtiyoriy)</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder={user?.email || 'Yangi Email'} 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Yangi Parol (ixtiyoriy)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Yangi Parol" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                />
              </div>
              
              <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
                <strong>Diqqat!</strong> Email yoki parolni o'zgartirgandan so'ng xavfsizlik maqsadida tizimdan avtomatik ravishda chiqib ketasiz. Yangi ma'lumotlar bilan qayta kirishingiz kerak bo'ladi.
              </div>

              <button 
                type="submit" 
                className={`btn btn-primary ${updatingCreds ? 'btn-loading' : ''}`} 
                style={{ width: '100%' }} 
                disabled={updatingCreds || (!newEmail && !newPassword)}
              >
                {updatingCreds ? <span className="spinner" /> : <CheckCircle size={16} />}
                {updatingCreds ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Store Details Modal */}
      {selectedStore && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: 600, width: '90%', padding: 0, overflow: 'hidden' }}>
            <button className="modal-close" style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', zIndex: 10 }} onClick={() => setSelectedStore(null)}>✕</button>

            {selectedStore.images && selectedStore.images.length > 0 ? (
              <div style={{ height: 250, width: '100%', background: '#eee', position: 'relative' }}>
                <img src={selectedStore.images[0]} alt={selectedStore.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
                  {selectedStore.type === 'restaurant' ? '🍽️ Restoran' : selectedStore.type === 'cafe' ? '☕ Kafe' : '🏪 Do\'kon'}
                </div>
              </div>
            ) : (
              <div style={{ height: 100, width: '100%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 700 }}>
                {selectedStore.name}
              </div>
            )}

            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
                {selectedStore.name}
              </h2>
              {selectedStore.bossName && (
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  <strong>Boss:</strong> {selectedStore.bossName}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                <MapPin size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary)' }} />
                <span>{selectedStore.address || 'Manzil kiritilmagan'}</span>
              </div>
              {selectedStore.phone && (
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  <strong>Telefon:</strong> {selectedStore.phone}
                </div>
              )}
              {selectedStore.hours && (
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  <strong>Ish vaqti:</strong> {selectedStore.hours}
                </div>
              )}
              {selectedStore.description && (
                <div style={{ fontSize: 14, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: 12, borderRadius: 'var(--radius-md)', fontStyle: 'italic', marginBottom: 12 }}>
                  "{selectedStore.description}"
                </div>
              )}
              {selectedStore.images && selectedStore.images.length > 1 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Rasmlar</h4>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                    {selectedStore.images.map((img, idx) => (
                      <img key={idx} src={img} alt={`${selectedStore.name} ${idx + 1}`} style={{ width: 80, height: 80, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

                        <ProductCard
                          key={selectedProduct.id}
                          product={selectedProduct}
                          index={0}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {unratedOrder && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal" style={{ width: 420 }}>
            <h2 className="modal-title">🎉 Buyurtma Baholash</h2>
            
            {/* Order Details */}
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                📅 {unratedOrder.createdAt?.toLocaleDateString('uz-UZ')} {unratedOrder.createdAt?.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                <strong>Buyurtma raqami:</strong> #{unratedOrder.id?.slice(-6).toUpperCase()}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
                <strong>Taomlar:</strong>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 16, marginBottom: 12 }}>
                {unratedOrder.items?.map(i => (
                  <div key={i.productId}>• {i.name} × {i.quantity}</div>
                ))}
              </div>
              <div style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: 10,
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--primary)',
              }}>
                Jami: {unratedOrder.totalPrice.toLocaleString('ru-RU')} so'm
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14, textAlign: 'center' }}>
              Xizmatingizdan xursandmiz. Iltimos, mahsulot va xizmat sifatini baholang!
            </p>
            
            <form onSubmit={handleSubmitRating}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={36}
                    fill={star <= rating ? '#f59e0b' : 'none'}
                    color={star <= rating ? '#f59e0b' : 'var(--text-muted)'}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">IZOH QOLDIRING (IXTIYORIY)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Taom mazalimi? Kuryer xushmuomalaydimi?"
                  value={ratingComment}
                  onChange={e => setRatingComment(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className={`btn btn-primary ${submittingRating ? 'btn-loading' : ''}`}
                style={{ width: '100%', marginBottom: 10 }}
                disabled={submittingRating || rating === 0}
              >
                {submittingRating ? <span className="spinner" /> : 'Bahoni yuborish'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%' }}
                onClick={handleDismissRating}
              >
                Keyinroq
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPage;
