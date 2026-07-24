import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, LogOut, Plus, Trash2,
  Upload, ImageIcon, Save, X, Shield, MapPin, Store,
  ShoppingBag, RefreshCw, FileText, MessageSquare
} from 'lucide-react';
import { logoutUser } from '../firebase/auth';
import {
  addProduct, getProducts, deleteProduct,
  addCourierUser, getCourierUsers, deleteCourierUser,
  addStore, getStores, deleteStore, getOrders,
  updateOrderStatus, subscribeToChats, markChatRead, sendMessage, updateOrderReceipt, subscribeToMessages
} from '../firebase/firestore';
import { uploadProductImage } from '../firebase/storage';
import { Product, CourierUser, Store as StoreType, Order, Chat, Message } from '../types';
import toast from 'react-hot-toast';

type AdminTab = 'dashboard' | 'products' | 'users' | 'stores' | 'orders' | 'receipts' | 'chats' | 'ratings';

const typeLabels: Record<string, string> = {
  ovqat: '🍽️ Ovqat',
  ichimlik: '🥤 Ichimlik',
  desert: '🍰 Desert',
};
const typeBadgeClass: Record<string, string> = {
  ovqat: 'ovqat', ichimlik: 'ichimlik', desert: 'desert',
};
const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: '🔍 Kuryer qidirilmoqda', color: 'var(--primary)',  bg: 'rgba(252,76,2,0.12)' },
  accepted:   { label: '✅ Qabul qilindi',       color: '#3b82f6',        bg: 'rgba(59,130,246,0.12)' },
  picked_up:  { label: '🚴 Yo\'lda',              color: '#f59e0b',        bg: 'rgba(245,158,11,0.12)' },
  delivered:  { label: '🎉 Yetkazildi',           color: '#22c55e',        bg: 'rgba(34,197,94,0.12)' },
  cancelled:  { label: '❌ Bekor qilindi',        color: '#ef4444',        bg: 'rgba(239,68,68,0.12)' },
};

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  /* ---- Products ---- */
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productType, setProductType] = useState<'ovqat'|'ichimlik'|'desert'>('ovqat');
  const [productStoreId, setProductStoreId] = useState('');
  const [productLiters, setProductLiters] = useState<string>('');
  const [customLiters, setCustomLiters] = useState('');
  const [productImage, setProductImage] = useState<File|null>(null);
  const [productImagePreview, setProductImagePreview] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- Courier users ---- */
  const [courierUsers, setCourierUsers] = useState<CourierUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [courierUsername, setCourierUsername] = useState('');
  const [courierPassword, setCourierPassword] = useState('');
  const [addingUser, setAddingUser] = useState(false);

  /* ---- Stores ---- */
  const [stores, setStores] = useState<StoreType[]>([]);
  const [showAddStore, setShowAddStore] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeType, setStoreType] = useState<'restaurant'|'cafe'|'shop'>('restaurant');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeHours, setStoreHours] = useState('');
  const [storeComment, setStoreComment] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [storeBossName, setStoreBossName] = useState('');
  const [storeImages, setStoreImages] = useState<File[]>([]);
  const [storeLocating, setStoreLocating] = useState(false);
  const [storeLocation, setStoreLocation] = useState<{lat:number;lng:number}|null>(null);
  const [addingStore, setAddingStore] = useState(false);

  /* ---- Orders ---- */
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  /* ---- Chats ---- */
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);
  const prevUnreadRef = useRef(0);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCourierUsers();
    loadStores();
    loadOrders();
    const unsubChats = subscribeToChats((data) => {
      setChats(data);
      const currentUnread = data.reduce((sum, c) => sum + (c.unreadCountAdmin || 0), 0);
      if (currentUnread > prevUnreadRef.current) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Yangi xabar (Support)', { body: 'Mijozdan yangi xabar keldi!' });
        }
      }
      prevUnreadRef.current = currentUnread;
      setTotalUnread(currentUnread);
    });
    return () => {
      unsubChats();
    };
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      markChatRead(selectedChatId, 'admin');
      const unsub = subscribeToMessages(selectedChatId, (msgs) => setMessages(msgs));
      return () => unsub();
    }
  }, [selectedChatId]);

  /* ===== LOADERS ===== */
  const loadProducts = async () => {
    setProductsLoading(true);
    try { setProducts(await getProducts()); }
    catch { toast.error('Mahsulotlarni yuklashda xato'); }
    finally { setProductsLoading(false); }
  };
  const loadCourierUsers = async () => {
    setUsersLoading(true);
    try { setCourierUsers(await getCourierUsers()); }
    catch { toast.error('Kuryerlarni yuklashda xato'); }
    finally { setUsersLoading(false); }
  };
  const loadStores = async () => {
    try { setStores(await getStores()); }
    catch { console.error('stores load error'); }
  };
  const loadOrders = async () => {
    setOrdersLoading(true);
    try { setOrders(await getOrders()); }
    catch { console.error('orders load error'); }
    finally { setOrdersLoading(false); }
  };

  /* ===== LOGOUT ===== */
  const handleLogout = async () => {
    await logoutUser();
    toast.success('Admin chiqdi');
    navigate('/');
  };

  /* ===== PRODUCT HANDLERS ===== */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProductImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const resetProductForm = () => {
    setProductName(''); setProductDesc(''); setProductPrice('');
    setProductType('ovqat'); setProductStoreId(''); setProductLiters(''); setCustomLiters('');
    setProductImage(null); setProductImagePreview(''); setShowAddProduct(false);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) { toast.error('Mahsulot nomini kiriting'); return; }
    if (stores.length > 0 && !productStoreId) { toast.error('Do\'konni tanlang!'); return; }
    if (!productPrice || Number(productPrice) <= 0) { toast.error('Narx ni kiriting (0 dan katta)'); return; }
    setAddingProduct(true);
    let imageUrl = '';
    try {
      if (productImage) {
        toast.loading('Rasm yuklanmoqda...', { id: 'upload' });
        try {
          imageUrl = await uploadProductImage(productImage);
          toast.dismiss('upload');
          toast.success('Rasm yuklandi ✅');
        } catch (imgErr: unknown) {
          toast.dismiss('upload');
          const code = (imgErr as {code?:string})?.code || '';
          const msg  = (imgErr as Error)?.message || '';
          if (code === 'storage/unauthorized' || msg.includes('TIMEOUT')) {
            toast.error('⚠️ Rasm yuklanmadi (Storage rules). Rasmsiz saqlanadi.', { duration: 5000 });
          } else {
            toast.error(`⚠️ Rasm yuklanmadi: ${code||msg}. Rasmsiz saqlanadi.`, { duration: 5000 });
          }
          imageUrl = '';
        }
      }
      await addProduct({
        name: productName,
        description: productDesc || 'Nothing',
        price: productPrice || 'Nothing',
        type: productType, imageUrl,
        storeId: productStoreId || undefined,
      });
      toast.success('Mahsulot qo\'shildi! ✅');
      resetProductForm();
      await loadProducts();
    } catch (err) {
      console.error(err);
      toast.error('Mahsulot qo\'shishda xato');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`"${name}" mahsulotini o'chirasizmi?`)) return;
    try { await deleteProduct(id); toast.success('O\'chirildi'); await loadProducts(); }
    catch { toast.error('Xato'); }
  };

  /* ===== COURIER HANDLERS ===== */
  const handleAddCourierUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierUsername.trim() || !courierPassword.trim()) { toast.error('Login va parolni kiriting'); return; }
    setAddingUser(true);
    try {
      await addCourierUser({ username: courierUsername, password: courierPassword, role: 'courier' });
      toast.success('Kuryer qo\'shildi! ✅');
      setCourierUsername(''); setCourierPassword(''); setShowAddUser(false);
      await loadCourierUsers();
    } catch { toast.error('Kuryer qo\'shishda xato'); }
    finally { setAddingUser(false); }
  };

  const handleDeleteCourierUser = async (id: string, username: string) => {
    if (!confirm(`"${username}" ni o'chirasizmi?`)) return;
    try { await deleteCourierUser(id); toast.success('O\'chirildi'); await loadCourierUsers(); }
    catch { toast.error('Xato'); }
  };

  /* ===== STORE HANDLERS ===== */
  const handleGetStoreLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation ishlamaydi'); return; }
    setStoreLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setStoreLocation({ lat, lng });
        try {
          const res = await fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=ada6b1c6-e5b3-4316-a8f4-61ff91cdb1e2&geocode=${lng},${lat}&format=json&lang=uz_UZ`);
          const data = await res.json();
          const addr = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.metaDataProperty?.GeocoderMetaData?.text;
          setStoreAddress(addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch { setStoreAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
        setStoreLocating(false);
        toast.success('Do\'kon lokatsiyasi aniqlandi! ✅');
      },
      () => { setStoreLocating(false); toast.error('Lokatsiya aniqlashda xato'); }
    );
  };

  const handleStoreImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setStoreImages(Array.from(e.target.files));
    }
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) { toast.error('Do\'kon nomini kiriting'); return; }
    if (!storeLocation) { toast.error('Lokatsiyani aniqlang'); return; }
    setAddingStore(true);
    let uploadedImages: string[] = [];
    try {
      if (storeImages.length > 0) {
        toast.loading('Rasmlar yuklanmoqda...', { id: 'storeUpload' });
        for (const file of storeImages) {
          try {
            const url = await uploadProductImage(file);
            uploadedImages.push(url);
          } catch (e) {
            console.error('Rasm yuklashda xato', e);
          }
        }
        toast.dismiss('storeUpload');
      }
      await addStore({
        name: storeName,
        type: storeType,
        address: storeAddress,
        phone: storePhone,
        hours: storeHours,
        location: storeLocation,
        comment: storeComment,
        description: storeDesc,
        bossName: storeBossName,
        images: uploadedImages
      });
      toast.success('Do\'kon qo\'shildi! ✅');
      setStoreName(''); setStoreAddress(''); setStorePhone(''); setStoreHours(''); setStoreComment(''); setStoreLocation(null);
      setStoreImages([]); setStoreDesc(''); setStoreBossName(''); setShowAddStore(false);
      await loadStores();
    } catch { toast.error('Do\'kon qo\'shishda xato'); }
    finally { setAddingStore(false); }
  };

  const handleDeleteStore = async (id: string, name: string) => {
    if (!confirm(`"${name}" do'konini o'chirasizmi?`)) return;
    try { await deleteStore(id); toast.success('O\'chirildi'); await loadStores(); }
    catch { toast.error('Xato'); }
  };

  /* ===== ORDER HANDLERS ===== */
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Buyurtmani bekor qilasizmi?')) return;
    try { await updateOrderStatus(orderId, 'cancelled'); toast.success('Bekor qilindi'); await loadOrders(); }
    catch { toast.error('Xato'); }
  };

  /* ===== NAV ===== */
  const navItems = [
    { id: 'dashboard' as AdminTab,  icon: <LayoutDashboard size={18}/>, label: 'Bosh sahifa' },
    { id: 'products'  as AdminTab,  icon: <Package size={18}/>,         label: 'Mahsulotlar' },
    { id: 'users'     as AdminTab,  icon: <Users size={18}/>,            label: 'Kuryerlar' },
    { id: 'stores'    as AdminTab,  icon: <Store size={18}/>,            label: 'Do\'konlar' },
    { id: 'orders'    as AdminTab,  icon: <ShoppingBag size={18}/>,      label: 'Buyurtmalar', badge: orders.filter(o => o.status === 'pending').length },
    { id: 'receipts'  as AdminTab,  icon: <FileText size={18}/>,         label: 'Cheklar', badge: orders.filter(o => o.receiptStatus === 'unread').length },
    { id: 'ratings'   as AdminTab,  icon: <Shield size={18}/>,           label: 'Mahsulot sifati' },
    { id: 'chats'     as AdminTab,  icon: <MessageSquare size={18}/>,    label: 'Chatlar (Support)', badge: chats.filter(c => c.unreadCountAdmin > 0).length },
  ];

  /* ========== RENDER ========== */
  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="navbar-logo-icon" style={{ width: 36, height: 36, fontSize: 18 }}>🍽️</div>
          <div>
            <div className="navbar-logo-text" style={{ fontSize: 16 }}>Meals</div>
            <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, marginTop: -2 }}>Admin Panel</div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              id={`admin-nav-${item.id}`}
              className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}{item.label}
              {item.badge ? (
                <span style={{
                  marginLeft: 'auto', background: 'var(--primary)', color: 'white',
                  borderRadius: '50%', width: 18, height: 18, fontSize: 11,
                  fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div style={{
          padding: '12px 14px', background: 'rgba(252,76,2,0.08)',
          borderRadius: 'var(--radius-md)', border: '1px solid rgba(252,76,2,0.2)', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={14} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>Administrator</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>admin@admin.com</div>
        </div>

        <button id="admin-logout-btn" className="admin-nav-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
          <LogOut size={18} /> Chiqish
        </button>
      </aside>

      {/* Main */}
      <main className="admin-main">

        {/* ===== DASHBOARD ===== */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="admin-header">
              <h1 className="admin-header-title">Bosh Sahifa</h1>
              <p className="admin-header-subtitle">Admin panelga xush kelibsiz</p>
            </div>
            <div className="admin-stats-row">
              {[
                { icon: <Package size={24}/>, value: products.length,     label: 'Mahsulotlar' },
                { icon: <Users size={24}/>,   value: courierUsers.length, label: 'Kuryerlar' },
                { icon: <Store size={24}/>,   value: stores.length,       label: 'Do\'konlar' },
                { icon: <ShoppingBag size={24}/>, value: orders.filter(o=>o.status==='pending').length, label: 'Yangi buyurtma' },
              ].map((s, i) => (
                <div key={i} className="admin-stat-card">
                  <div className="admin-stat-icon">{s.icon}</div>
                  <div>
                    <div className="admin-stat-value">{s.value}</div>
                    <div className="admin-stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-card">
              <h3 className="admin-card-title"><LayoutDashboard size={18}/> Tezkor amallar</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <button className="btn btn-primary" onClick={() => { setActiveTab('products'); setShowAddProduct(true); }}>
                  <Plus size={16}/> Mahsulot qo'shish
                </button>
                <button className="btn btn-outline" onClick={() => { setActiveTab('users'); setShowAddUser(true); }}>
                  <Users size={16}/> Kuryer qo'shish
                </button>
                <button className="btn btn-outline" onClick={() => { setActiveTab('stores'); setShowAddStore(true); }}>
                  <Store size={16}/> Do'kon qo'shish
                </button>
                <button className="btn btn-outline" onClick={() => { setActiveTab('orders'); loadOrders(); }}>
                  <ShoppingBag size={16}/> Buyurtmalar
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('/')}>Saytga qaytish</button>
              </div>
            </div>

            {/* Recent orders */}
            {orders.length > 0 && (
              <div className="admin-card">
                <h3 className="admin-card-title"><ShoppingBag size={18}/> So'nggi buyurtmalar</h3>
                <table className="admin-table">
                  <thead><tr><th>Mijoz</th><th>Telefon</th><th>Status</th><th>Narx</th></tr></thead>
                  <tbody>
                    {orders.slice(0,5).map(o => {
                      const st = statusLabels[o.status] || statusLabels.pending;
                      return (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 600 }}>{o.userName}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{o.userPhone}</td>
                          <td>
                            <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 700 }}>
                              {st.label}
                            </span>
                          </td>
                          <td style={{ color: 'var(--primary)', fontWeight: 700 }}>
                            {o.totalPrice > 0 ? `${o.totalPrice.toLocaleString()} so'm` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== PRODUCTS ===== */}
        {activeTab === 'products' && (
          <div>
            <div className="admin-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="admin-header-title">Mahsulotlar</h1>
                  <p className="admin-header-subtitle">Barcha mahsulotlarni boshqarish</p>
                </div>
                <button id="add-product-btn" className="btn btn-primary" onClick={() => setShowAddProduct(v => !v)}>
                  <Plus size={16}/> {showAddProduct ? 'Bekor qilish' : 'Mahsulot qo\'shish'}
                </button>
              </div>
            </div>

            {/* Add form */}
            {showAddProduct && (
              <div className="admin-card" style={{ marginBottom: 24, border: '1px solid rgba(252,76,2,0.3)' }}>
                <h3 className="admin-card-title"><Plus size={18}/> Yangi mahsulot qo'shish</h3>
                
                {stores.length === 0 ? (
                  <div style={{ padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>⚠️ Mahsulot qo'shish uchun avval Do'kon qo'shing!</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Restoran, Cafe yoki Do'konni qo'shib boshlagin, shundan keyin mahsulot qo'shishingiz mumkin.</div>
                  </div>
                ) : (
                  <div style={{ padding: '16px', backgroundColor: 'rgba(252, 76, 2, 0.08)', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(252, 76, 2, 0.3)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Tanlangan Do'kon:</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)' }}>
                      {productStoreId ? (
                        <>
                          {stores.find(s => s.id === productStoreId)?.name} • {stores.find(s => s.id === productStoreId)?.type === 'restaurant' ? '🍽️ Restoran' : stores.find(s => s.id === productStoreId)?.type === 'cafe' ? '☕ Cafe' : '🏪 Do\'kon'}
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Umumiy (Hech qaysi do'kon uchun emas)</span>
                      )}
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleAddProduct} id="add-product-form" style={{ opacity: stores.length === 0 ? 0.5 : 1, pointerEvents: stores.length === 0 ? 'none' : 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <div className="form-group">
                        <label className="form-label">Mahsulot nomi *</label>
                        <input id="product-name-input" type="text" className="form-input"
                          placeholder="Masalan: Plov, Burger..." value={productName}
                          onChange={e => setProductName(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tavsif (Description)</label>
                        <textarea id="product-desc-input" className="form-textarea"
                          placeholder="Mahsulot haqida..." value={productDesc}
                          onChange={e => setProductDesc(e.target.value)} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                          <label className="form-label">Narx (so'm) *</label>
                          <input id="product-price-input" type="number" className="form-input"
                            placeholder="25000" value={productPrice}
                            onChange={e => setProductPrice(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Turi *</label>
                          <select id="product-type-select" className="form-select"
                            value={productType} onChange={e => setProductType(e.target.value as 'ovqat'|'ichimlik'|'desert')}>
                            <option value="ovqat">🍽️ Ovqat</option>
                            <option value="ichimlik">🥤 Ichimlik</option>
                            <option value="desert">🍰 Desert</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Do'kon tanlang</label>
                        <select className="form-select" value={productStoreId} onChange={e => setProductStoreId(e.target.value)}>
                          <option value="">Umumiy (Tanlanmagan)</option>
                          {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                          ))}
                        </select>
                      </div>
                      {productType === 'ichimlik' && (
                        <div className="form-group">
                          <label className="form-label">Hajm (litr)</label>
                          <select className="form-select" value={productLiters} onChange={e => setProductLiters(e.target.value)}>
                            <option value="">Tanlang</option>
                            <option value="0.5">0.5 litr</option>
                            <option value="1">1 litr</option>
                            <option value="1.5">1.5 litr</option>
                            <option value="2">2 litr</option>
                            <option value="5">5 litr</option>
                            <option value="10">10 litr</option>
                            <option value="custom">Boshqa (qo'lda kiritish)</option>
                          </select>
                          {productLiters === 'custom' && (
                            <input
                              type="text"
                              className="form-input"
                              style={{ marginTop: 8 }}
                              placeholder="Hajmni kiriting (masalan: 3 litr)"
                              value={customLiters}
                              onChange={e => setCustomLiters(e.target.value)}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="form-group">
                        <label className="form-label">Mahsulot rasmi</label>
                        <div id="product-image-upload"
                          className={`file-upload ${productImage ? 'has-file' : ''}`}
                          onClick={() => fileInputRef.current?.click()}>
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} />
                          {productImagePreview ? (
                            <div className="image-preview"><img src={productImagePreview} alt="Preview" /></div>
                          ) : (
                            <>
                              <div className="file-upload-icon">
                                <Upload size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                              </div>
                              <div className="file-upload-text">
                                <span>Rasm tanlang</span> yoki bu yerga torting<br/>
                                <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>PNG, JPG, WEBP</small>
                              </div>
                            </>
                          )}
                        </div>
                        {productImage && (
                          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8, color: '#ef4444' }}
                            onClick={e => { e.stopPropagation(); setProductImage(null); setProductImagePreview(''); }}>
                            <X size={14}/> Rasmni olib tashlash
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <button id="save-product-btn" type="submit" className={`btn btn-primary ${addingProduct ? 'btn-loading' : ''}`} disabled={addingProduct}>
                      {addingProduct ? <span className="spinner"/> : <Save size={16}/>}
                      {addingProduct ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={resetProductForm}>Bekor qilish</button>
                  </div>
                </form>
              </div>
            )}

            {/* Table */}
            <div className="admin-card">
              <h3 className="admin-card-title"><Package size={18}/> Barcha mahsulotlar ({products.length})</h3>
              {productsLoading ? (
                <div className="loading-overlay" style={{ minHeight: 200 }}><div className="loading-spinner"/></div>
              ) : products.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">📦</div>
                  <div className="empty-state-title">Mahsulotlar yo'q</div>
                </div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>Rasm</th><th>Nom</th><th>Tavsif</th><th>Do'kon</th><th>Tur</th><th>Narx</th><th>Amal</th></tr></thead>
                  <tbody>
                    {products.map(p => {
                      const store = stores.find(s => s.id === p.storeId);
                      return (
                        <tr key={p.id} id={`product-row-${p.id}`} style={{ cursor: 'pointer' }} onClick={() => setSelectedProductForDetails(p)}>
                          <td onClick={(e) => e.stopPropagation()}>
                            {p.imageUrl
                              ? <img src={p.imageUrl} alt={p.name} className="admin-table-image" style={{ objectFit: 'cover' }}/>
                              : <div className="admin-table-image"><ImageIcon size={20}/></div>}
                          </td>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 180 }}>
                            {(p.description||'Nothing').slice(0,60)}{(p.description||'').length>60?'...':''}
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {store ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>{store.type === 'restaurant' ? '🍽️' : store.type === 'cafe' ? '☕' : '🏪'}</span>
                                {store.name}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                          <td><span className={`type-badge ${typeBadgeClass[p.type]}`}>{typeLabels[p.type]}</span></td>
                          <td style={{ color: 'var(--primary)', fontWeight: 700 }}>
                            {p.price==='Nothing'||!p.price ? 'Nothing' : `${Number(p.price).toLocaleString('ru-RU')} so'm`}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button id={`delete-product-${p.id}`} className="btn btn-danger btn-sm btn-icon"
                              onClick={() => handleDeleteProduct(p.id!, p.name)} title="O'chirish">
                              <Trash2 size={14}/>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ===== COURIER USERS ===== */}
        {activeTab === 'users' && (
          <div>
            <div className="admin-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="admin-header-title">Kuryerlar</h1>
                  <p className="admin-header-subtitle">Login va parollarni boshqarish</p>
                </div>
                <button id="add-user-btn" className="btn btn-primary" onClick={() => setShowAddUser(v => !v)}>
                  <Plus size={16}/> {showAddUser ? 'Bekor qilish' : 'Kuryer qo\'shish'}
                </button>
              </div>
            </div>

            {showAddUser && (
              <div className="admin-card" style={{ marginBottom: 24, border: '1px solid rgba(252,76,2,0.3)' }}>
                <h3 className="admin-card-title"><Plus size={18}/> Yangi kuryer qo'shish</h3>
                <form onSubmit={handleAddCourierUser} id="add-courier-form">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 600 }}>
                    <div className="form-group">
                      <label className="form-label">Login</label>
                      <input id="courier-username-input" type="text" className="form-input"
                        placeholder="kuryer01" value={courierUsername}
                        onChange={e => setCourierUsername(e.target.value)} required/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Parol</label>
                      <input id="courier-password-input" type="text" className="form-input"
                        placeholder="Parol" value={courierPassword}
                        onChange={e => setCourierPassword(e.target.value)} required/>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button id="save-courier-btn" type="submit" className={`btn btn-primary ${addingUser?'btn-loading':''}`} disabled={addingUser}>
                      {addingUser ? <span className="spinner"/> : <Save size={16}/>}
                      {addingUser ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                    <button type="button" className="btn btn-ghost"
                      onClick={() => { setShowAddUser(false); setCourierUsername(''); setCourierPassword(''); }}>
                      Bekor qilish
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="admin-card">
              <h3 className="admin-card-title"><Users size={18}/> Kuryerlar ro'yxati ({courierUsers.length})</h3>
              {usersLoading ? (
                <div className="loading-overlay" style={{ minHeight: 200 }}><div className="loading-spinner"/></div>
              ) : courierUsers.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">👥</div><div className="empty-state-title">Kuryerlar yo'q</div>
                </div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>#</th><th>Login</th><th>Parol</th><th>Rol</th><th>Amal</th></tr></thead>
                  <tbody>
                    {courierUsers.map((u, i) => (
                      <tr key={u.id} id={`courier-row-${u.id}`}>
                        <td style={{ color: 'var(--text-muted)', width: 40 }}>{i+1}</td>
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, background: 'rgba(252,76,2,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: 12, fontWeight: 700 }}>
                              {u.username[0].toUpperCase()}
                            </div>
                            {u.username}
                          </div>
                        </td>
                        <td><code style={{ background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{u.password}</code></td>
                        <td><span className="type-badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>🚴 Kuryer</span></td>
                        <td>
                          <button id={`delete-courier-${u.id}`} className="btn btn-danger btn-sm btn-icon"
                            onClick={() => handleDeleteCourierUser(u.id!, u.username)} title="O'chirish">
                            <Trash2 size={14}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ===== STORES ===== */}
        {activeTab === 'stores' && (
          <div>
            <div className="admin-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="admin-header-title">ReCaSo (Restoran, Cafe, Store)</h1>
                  <p className="admin-header-subtitle">Mahsulot olinadigan joylar (faqat admin va kuryer ko'radi)</p>
                </div>
                <button id="add-store-btn" className="btn btn-primary" onClick={() => setShowAddStore(v => !v)}>
                  <Plus size={16}/> {showAddStore ? 'Bekor qilish' : 'Do\'kon qo\'shish'}
                </button>
              </div>
            </div>

            {showAddStore && (
              <div className="admin-card" style={{ marginBottom: 24, border: '1px solid rgba(252,76,2,0.3)' }}>
                <h3 className="admin-card-title"><Store size={18}/> Yangi do'kon qo'shish</h3>
                <form onSubmit={handleAddStore} id="add-store-form">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <div className="form-group">
                        <label className="form-label">ReCaSo (Do'kon) nomi *</label>
                        <input id="store-name-input" type="text" className="form-input"
                          placeholder="Masalan: Rayhon Milliy Taomlar" value={storeName}
                          onChange={e => setStoreName(e.target.value)} required/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Telefon raqam</label>
                        <input type="tel" className="form-input" placeholder="+998" value={storePhone} onChange={e => setStorePhone(e.target.value)}/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Boss ismi</label>
                        <input type="text" className="form-input" placeholder="Do'kon egasi ismi" value={storeBossName} onChange={e => setStoreBossName(e.target.value)}/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ish vaqti</label>
                        <input type="text" className="form-input" placeholder="09:00 - 22:00" value={storeHours} onChange={e => setStoreHours(e.target.value)}/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Turi *</label>
                        <select className="form-input" value={storeType} onChange={e => setStoreType(e.target.value as any)}>
                          <option value="restaurant">🍽️ Restoran</option>
                          <option value="cafe">☕ Kafe</option>
                          <option value="shop">🏪 Do'kon</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Maqola / Izoh</label>
                        <textarea className="form-textarea" placeholder="Joy haqida batafsil..." value={storeDesc}
                          onChange={e => setStoreDesc(e.target.value)} style={{ minHeight: 80 }}/>
                      </div>
                    </div>
                    <div>
                      <div className="form-group">
                        <label className="form-label"><MapPin size={13} style={{ display: 'inline', marginRight: 4 }}/>Lokatsiya</label>
                        <button type="button"
                          className={`btn btn-primary ${storeLocating ? 'btn-loading' : ''}`}
                          style={{ width: '100%', marginBottom: 10 }}
                          onClick={handleGetStoreLocation} disabled={storeLocating}>
                          {storeLocating ? <span className="spinner"/> : <MapPin size={16}/>}
                          {storeLocating ? 'Aniqlanmoqda...' : '📍 Lokatsiyani aniqlash'}
                        </button>
                        {storeLocation && (
                          <>
                            <input type="text" className="form-input" placeholder="Manzil"
                              value={storeAddress} onChange={e => setStoreAddress(e.target.value)}/>
                            <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6 }}>
                              ✅ {storeLocation.lat.toFixed(5)}, {storeLocation.lng.toFixed(5)}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label"><ImageIcon size={13} style={{ display: 'inline', marginRight: 4 }}/>Fasad / Ichki rasmlar</label>
                        <input type="file" multiple accept="image/*" onChange={handleStoreImagesChange} className="form-input" style={{ paddingTop: 8 }} />
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Ko'p rasm tanlashingiz mumkin</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button type="submit" className={`btn btn-primary ${addingStore?'btn-loading':''}`} disabled={addingStore}>
                      {addingStore ? <span className="spinner"/> : <Save size={16}/>}
                      {addingStore ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                    <button type="button" className="btn btn-ghost"
                      onClick={() => { setShowAddStore(false); setStoreName(''); setStoreAddress(''); setStoreComment(''); setStoreLocation(null); }}>
                      Bekor qilish
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="admin-card">
              <h3 className="admin-card-title"><Store size={18}/> ReCaSo ro'yxati ({stores.length})</h3>
              {stores.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">🏪</div>
                  <div className="empty-state-title">Do'konlar yo'q</div>
                  <div className="empty-state-text">Mahsulot olinadigan joy qo'shing</div>
                </div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>Nom</th><th>Manzil</th><th>Koordinata</th><th>Izoh</th><th>Amal</th></tr></thead>
                  <tbody>
                    {stores.map(s => (
                      <tr key={s.id} id={`store-row-${s.id}`}>
                        <td style={{ fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{s.type === 'restaurant' ? '🍽️' : s.type === 'cafe' ? '☕' : '🏪'}</span>{s.name}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 180 }}>{s.address}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {s.location.lat.toFixed(4)}, {s.location.lng.toFixed(4)}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{s.comment || '—'}</td>
                        <td>
                          <button className="btn btn-danger btn-sm btn-icon"
                            onClick={() => handleDeleteStore(s.id!, s.name)} title="O'chirish">
                            <Trash2 size={14}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ===== ORDERS ===== */}
        {activeTab === 'orders' && (
          <div>
            <div className="admin-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="admin-header-title">Buyurtmalar</h1>
                  <p className="admin-header-subtitle">Barcha buyurtmalarni kuzatish</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={loadOrders}>
                  <RefreshCw size={14}/> Yangilash
                </button>
              </div>
            </div>

            <div className="admin-card">
              <h3 className="admin-card-title"><ShoppingBag size={18}/> Buyurtmalar ({orders.length})</h3>
              {ordersLoading ? (
                <div className="loading-overlay" style={{ minHeight: 200 }}><div className="loading-spinner"/></div>
              ) : orders.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">📭</div>
                  <div className="empty-state-title">Buyurtmalar yo'q</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {orders.map(o => {
                    const st = statusLabels[o.status] || statusLabels.pending;
                    return (
                      <div key={o.id} className="admin-card" style={{ marginBottom: 0, border: `1px solid ${st.color}30` }} id={`order-admin-${o.id}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>👤 {o.userName}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📞 {o.userPhone}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ background: st.bg, color: st.color, padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 700 }}>
                              {st.label}
                            </span>
                            <div style={{ fontWeight: 800, color: 'var(--primary)', marginTop: 6 }}>
                              {o.totalPrice > 0 ? `${o.totalPrice.toLocaleString('ru-RU')} so'm` : '—'}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                          <MapPin size={12} style={{ display: 'inline', marginRight: 4 }}/>
                          {o.userLocation?.address || `${o.userLocation?.lat?.toFixed(4)}, ${o.userLocation?.lng?.toFixed(4)}`}
                        </div>

                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                          🛒 {o.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                        </div>

                        {o.comment && (
                          <div style={{ fontSize: 13, background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', marginBottom: 8, color: 'var(--text-secondary)' }}>
                            💬 {o.comment}
                          </div>
                        )}

                        {o.courierUsername && (
                          <div style={{ fontSize: 13, color: '#3b82f6' }}>🚴 Kuryer: {o.courierUsername}</div>
                        )}
                        {o.estimatedTime && (
                          <div style={{ fontSize: 13, color: '#22c55e' }}>⏱ ~{o.estimatedTime} daqiqa</div>
                        )}

                        {o.status === 'pending' && (
                          <button className="btn btn-danger btn-sm" style={{ marginTop: 10 }}
                            onClick={() => handleCancelOrder(o.id!)}>
                            <X size={14}/> Bekor qilish
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== RECEIPTS (CHEKLAR) ===== */}
        {activeTab === 'receipts' && (
          <div>
            <div className="admin-header">
              <h1 className="admin-header-title">Cheklar</h1>
              <p className="admin-header-subtitle">Mijozlar yuklagan to'lov kvitansiyalari</p>
            </div>
            
            <div className="admin-card">
              <h3 className="admin-card-title"><FileText size={18}/> Karta orqali to'lovlar</h3>
              {orders.filter(o => o.paymentMethod === 'card' && o.receiptUrl).length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">📄</div>
                  <div className="empty-state-title">Hozircha cheklar yo'q</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {orders.filter(o => o.paymentMethod === 'card' && o.receiptUrl).map(o => (
                    <div key={o.id} className="admin-card" style={{ marginBottom: 0, padding: 16, position: 'relative', border: o.receiptStatus === 'unread' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)' }}>
                      {o.receiptStatus === 'unread' && (
                        <span style={{ position: 'absolute', top: 12, right: 12, background: 'var(--primary)', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>YANGI</span>
                      )}
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>Mijoz: {o.userName}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>📞 {o.userPhone}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 12 }}>💰 {o.totalPrice.toLocaleString('ru-RU')} so'm</div>
                      <a href={o.receiptUrl} target="_blank" rel="noopener noreferrer">
                        <div style={{ width: '100%', height: 160, backgroundImage: `url(${o.receiptUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 'var(--radius-md)', marginBottom: 12 }} />
                      </a>
                      {o.status === 'awaiting_payment' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={async () => {
                            try {
                              await updateOrderStatus(o.id!, 'pending');
                              await updateOrderReceipt(o.id!, 'read');
                              toast.success("To'lov tasdiqlandi va kuryerlarga yuborildi!");
                              await loadOrders();
                            } catch { toast.error('Xato'); }
                          }}>✅ Tasdiqlash</button>
                          <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={async () => {
                            try {
                              await updateOrderStatus(o.id!, 'cancelled');
                              await updateOrderReceipt(o.id!, 'read');
                              toast.error("To'lov rad etildi!");
                              await loadOrders();
                            } catch { toast.error('Xato'); }
                          }}>❌ Rad etish</button>
                        </div>
                      ) : o.status === 'cancelled' ? (
                        <div style={{ textAlign: 'center', fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
                          ❌ To'lov rad etilgan
                        </div>
                      ) : o.receiptStatus === 'unread' ? (
                        <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={async () => {
                          try {
                            await updateOrderReceipt(o.id!, 'read');
                            toast.success("O'qildi deb belgilandi");
                            await loadOrders();
                          } catch { toast.error('Xato'); }
                        }}>O'qildi qilish</button>
                      ) : (
                        <div style={{ textAlign: 'center', fontSize: 13, color: '#22c55e', fontWeight: 600 }}>
                          To'lov tasdiqlangan
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== CHATS (SUPPORT) ===== */}
        {activeTab === 'chats' && (
          <div>
            <div className="admin-header">
              <h1 className="admin-header-title">Chatlar</h1>
              <p className="admin-header-subtitle">Mijozlar bilan yozishmalar</p>
            </div>
            
            <div style={{ display: 'flex', gap: 20, height: 500 }}>
              <div className="admin-card" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                {chats.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <div className="empty-state-icon">💬</div>
                    <div className="empty-state-title">Chatlar yo'q</div>
                  </div>
                ) : (
                  chats.map(chat => (
                    <div key={chat.id} onClick={() => setSelectedChatId(chat.id!)} style={{ padding: 16, borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', background: selectedChatId === chat.id ? 'var(--bg-elevated)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{chat.userName}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{(chat.lastMessage || '').slice(0, 30)}</div>
                      </div>
                      {chat.unreadCountAdmin > 0 && (
                        <div style={{ background: 'var(--primary)', color: 'white', fontSize: 12, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {chat.unreadCountAdmin}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div className="admin-card" style={{ flex: 2, display: 'flex', flexDirection: 'column', padding: 0 }}>
                {selectedChatId ? (
                  <>
                    <div style={{ padding: 16, borderBottom: '1px solid var(--border-subtle)', fontWeight: 700 }}>
                      Chat: {chats.find(c => c.id === selectedChatId)?.userName}
                    </div>
                    <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {messages.map(m => (
                        <div key={m.id} style={{ alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start', background: m.sender === 'admin' ? 'var(--primary)' : 'var(--bg-elevated)', color: m.sender === 'admin' ? 'white' : 'var(--text-primary)', padding: '8px 14px', borderRadius: 16, maxWidth: '80%' }}>
                          {m.text}
                        </div>
                      ))}
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!replyText.trim()) return;
                      const chat = chats.find(c => c.id === selectedChatId);
                      if (chat) {
                        sendMessage(chat.id!, chat.userId, chat.userName, replyText, 'admin');
                        setReplyText('');
                      }
                    }} style={{ padding: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
                      <input type="text" className="form-input" style={{ flex: 1 }} placeholder="Javob yozing..." value={replyText} onChange={e => setReplyText(e.target.value)} />
                      <button type="submit" className="btn btn-primary">Yuborish</button>
                    </form>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Chatni tanlang
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== RATINGS ===== */}
        {activeTab === 'ratings' && (
          <div>
            <div className="admin-header">
              <div>
                <h1 className="admin-header-title">Mahsulot Sifati</h1>
                <p className="admin-header-subtitle">Mijozlar tomonidan qoldirilgan baholar va izohlar</p>
              </div>
            </div>

            <div className="admin-card">
              <h3 className="admin-card-title"><Shield size={18}/> Barcha izohlar</h3>
              {orders.filter(o => o.isRated).length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">⭐</div>
                  <div className="empty-state-title">Hali baholar yo'q</div>
                </div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>Mijoz</th><th>Baho</th><th>Izoh</th><th>Do'kon (ReCaSo)</th><th>Vaqt</th></tr></thead>
                  <tbody>
                    {orders.filter(o => o.isRated).map(o => {
                      const store = stores.find(s => s.id === o.storeId);
                      return (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 600 }}>{o.userName}</td>
                          <td>
                            <div style={{ color: '#f59e0b', fontSize: 18 }}>
                              {'★'.repeat(o.rating || 0)}{'☆'.repeat(5 - (o.rating || 0))}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{o.ratingComment || '—'}</td>
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                            {store ? store.name : (o.storeId ? 'Noma\'lum do\'kon' : 'Umumiy')}
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                            {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Product Details Modal */}
        {selectedProductForDetails && (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal" style={{ maxWidth: 600, width: '90%', padding: 0, overflow: 'hidden' }}>
              <button className="modal-close" style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', zIndex: 10 }} onClick={() => setSelectedProductForDetails(null)}>✕</button>

              {selectedProductForDetails.imageUrl ? (
                <div style={{ height: 250, width: '100%', background: '#eee', position: 'relative' }}>
                  <img src={selectedProductForDetails.imageUrl} alt={selectedProductForDetails.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>
                    {typeLabels[selectedProductForDetails.type]}
                  </div>
                </div>
              ) : (
                <div style={{ height: 100, width: '100%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 700 }}>
                  {selectedProductForDetails.name}
                </div>
              )}

              <div style={{ padding: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
                  {selectedProductForDetails.name}
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                  {selectedProductForDetails.description}
                </p>

                {(() => {
                  const store = stores.find(s => s.id === selectedProductForDetails.storeId);
                  if (store) {
                    return (
                      <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                        <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{store.type === 'restaurant' ? '🍽️' : store.type === 'cafe' ? '☕' : '🏪'}</span>
                          {store.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>
                          <MapPin size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary)' }} />
                          <span>{store.address || 'Manzil kiritilmagan'}</span>
                        </div>
                        {store.bossName && (
                          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            <strong>Boss:</strong> {store.bossName}
                          </div>
                        )}
                        {store.phone && (
                          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                            <strong>Telefon:</strong> {store.phone}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedProductForDetails.price === 'Nothing' || !selectedProductForDetails.price
                      ? 'Narx: —'
                      : `${Number(selectedProductForDetails.price).toLocaleString('ru-RU')} so'm`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminPage;
