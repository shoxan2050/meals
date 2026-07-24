import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, LogOut, Package, CheckCircle, Clock, Navigation, Store, Bike
} from 'lucide-react';
import { getPendingOrders, getCourierOrders, updateOrderStatus, getStores, subscribeToChats, subscribeToMessages, markChatRead, sendMessage } from '../firebase/firestore';
import { Order, CourierSession, Store as StoreType, Message, Chat } from '../types';
import toast from 'react-hot-toast';

const YANDEX_API_KEY = 'ada6b1c6-e5b3-4316-a8f4-61ff91cdb1e2';

const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const CourierPage: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<CourierSession | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Notification request
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const prevUnreadCount = useRef(0);

  useEffect(() => {
    if (!session) return;
    const unsubChats = subscribeToChats((chats) => {
      const myChat = chats.find(c => c.userId === session.id);
      if (myChat) {
        const currentUnread = myChat.unreadCountUser || 0;
        setUnreadCount(currentUnread);
        
        if (currentUnread > prevUnreadCount.current) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Yangi xabar (Support)', { body: 'Admindan yangi xabar keldi!' });
          }
        }
        prevUnreadCount.current = currentUnread;
      }
    });
    return () => unsubChats();
  }, [session]);

  useEffect(() => {
    if (showChat && session) {
      markChatRead(session.id, 'user');
      const unsub = subscribeToMessages(session.id, (msgs) => setMessages(msgs));
      return () => unsub();
    }
  }, [showChat, session]);

  const mapRef = useRef<HTMLDivElement>(null);
  const orderMapRef = useRef<HTMLDivElement>(null);
  const ymapMain = useRef<YMap | null>(null);
  const mapLoaded = useRef(false);

  // Check courier session
  useEffect(() => {
    const saved = localStorage.getItem('courierSession');
    if (!saved) {
      navigate('/');
      return;
    }
    const s: CourierSession = JSON.parse(saved);
    setSession(s);

    // Load stores
    getStores().then(setStores).catch(console.error);

    // Get courier location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCourierLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.warn('Location error:', err)
      );
    }
  }, [navigate]);

  // Load Yandex Maps
  useEffect(() => {
    if (mapLoaded.current) return;
    mapLoaded.current = true;
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${YANDEX_API_KEY}&lang=uz_UZ`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Subscribe to orders
  useEffect(() => {
    if (!session) return;
    const unsubPending = getPendingOrders(orders => setPendingOrders(orders));
    const unsubActive = getCourierOrders(session.id, orders => setActiveOrders(orders));
    return () => { unsubPending(); unsubActive(); };
  }, [session]);

  // Show map when order is selected
  useEffect(() => {
    if (!selectedOrder || !orderMapRef.current || !window.ymaps3) return;
    window.ymaps3.ready.then(() => {
      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = window.ymaps3;
      const { lat, lng } = selectedOrder.userLocation;

      if (ymapMain.current) { ymapMain.current.destroy(); ymapMain.current = null; }

      const map = new YMap(orderMapRef.current!, {
        location: { center: [lng, lat], zoom: 13 },
      });
      map.addChild(new YMapDefaultSchemeLayer());
      map.addChild(new YMapDefaultFeaturesLayer());

      // User marker
      const userEl = document.createElement('div');
      userEl.innerHTML = '📍';
      userEl.style.fontSize = '28px';
      map.addChild(new YMapMarker({ coordinates: [lng, lat] }, userEl));

      // Courier marker
      if (courierLocation) {
        const courierEl = document.createElement('div');
        courierEl.innerHTML = '🚴';
        courierEl.style.fontSize = '28px';
        map.addChild(new YMapMarker(
          { coordinates: [courierLocation.lng, courierLocation.lat] }, courierEl
        ));
      }

      // Store markers
      stores.forEach(store => {
        const storeEl = document.createElement('div');
        storeEl.innerHTML = '🏪';
        storeEl.style.fontSize = '24px';
        map.addChild(new YMapMarker(
          { coordinates: [store.location.lng, store.location.lat] }, storeEl
        ));
      });

      ymapMain.current = map;
    });
  }, [selectedOrder, stores, courierLocation]);

  const handleLogout = () => {
    localStorage.removeItem('courierSession');
    navigate('/');
    toast.success('Chiqildi');
  };

  const handleAcceptOrder = async (order: Order) => {
    if (!session) return;

    // Estimate time based on distance
    let estimatedTime = 30;
    if (courierLocation) {
      const dist = getDistance(
        courierLocation.lat, courierLocation.lng,
        order.userLocation.lat, order.userLocation.lng
      );
      estimatedTime = Math.round(dist * 3 + 10); // ~3 min/km + 10 min base
    }

    try {
      const paymentLabel = order.paymentMethod === 'card' ? "Karta" : "Naqd";
      const paymentNote = `To'lov: ${paymentLabel} — ${order.totalPrice} so'm`;

      await updateOrderStatus(order.id!, 'accepted', {
        courierId: session.id,
        courierUsername: session.username,
        estimatedTime,
        paymentNote,
      });
      toast.success(`Buyurtma qabul qilindi! ~${estimatedTime} daqiqa`);
      setSelectedOrder(null);
    } catch {
      toast.error('Qabul qilishda xato');
    }
  };

  const handleMarkPickedUp = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'picked_up');
      toast.success('Mahsulot olindi! Yetkazish boshlandi 🚴');
    } catch {
      toast.error('Xato');
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'delivered');
      toast.success('Buyurtma yetkazildi! ✅');
      setSelectedOrder(null);
    } catch {
      toast.error('Xato');
    }
  };

  if (!session) return <div className="loading-overlay"><div className="loading-spinner" /></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Header */}
      <header style={{
        background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="navbar-logo-icon">🚴</div>
            <div>
              <div className="navbar-logo-text" style={{ fontSize: 16 }}>Kuryer Panel</div>
              <div style={{ fontSize: 12, color: 'var(--primary)' }}>{session.username}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {courierLocation && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: 'var(--primary)',
                background: 'rgba(252,76,2,0.1)',
                padding: '4px 10px', borderRadius: 'var(--radius-full)',
              }}>
                <Navigation size={12} /> Lokatsiya aniqlandi
              </div>
            )}
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>
              <LogOut size={14} /> Chiqish
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: '24px 24px' }}>
        {/* Courier Profile Card */}
        <div className="admin-card" style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), #ff6b35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: 'white'
          }}>
            {session.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{session.username}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Kuryer</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Yangi buyurtmalar', value: pendingOrders.length, icon: '📦', color: 'var(--primary)' },
            { label: 'Faol buyurtmalar', value: activeOrders.length, icon: '🚴', color: '#3b82f6' },
            { label: 'Do\'konlar', value: stores.length, icon: '🏪', color: '#22c55e' },
          ].map((s, i) => (
            <div key={i} className="admin-stat-card">
              <div style={{ fontSize: 32 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { id: 'pending' as const, label: `Yangi (${pendingOrders.length})`, icon: '📦' },
            { id: 'active' as const, label: `Faol (${activeOrders.length})`, icon: '🚴' },
          ].map(tab => (
            <button
              key={tab.id}
              id={`courier-tab-${tab.id}`}
              className={`category-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 440px' : '1fr', gap: 24, alignItems: 'start' }}>

          {/* Orders list */}
          <div>
            {activeTab === 'pending' && (
              <div>
                {pendingOrders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-title">Yangi buyurtma yo'q</div>
                    <div className="empty-state-text">Yangi buyurtmalar kelganda bu yerda ko'rinadi</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pendingOrders.map(order => {
                      const dist = courierLocation
                        ? getDistance(courierLocation.lat, courierLocation.lng, order.userLocation.lat, order.userLocation.lng)
                        : null;
                      return (
                        <div
                          key={order.id}
                          className="admin-card"
                          style={{
                            cursor: 'pointer',
                            borderColor: selectedOrder?.id === order.id ? 'var(--primary)' : 'var(--border-subtle)',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                          id={`order-card-${order.id}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                                👤 {order.userName}
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                📞 {order.userPhone}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 18 }}>
                                {order.totalPrice > 0 ? `${order.totalPrice.toLocaleString()} so'm` : '—'}
                              </div>
                              {dist !== null && (
                                <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>
                                  📍 {dist.toFixed(1)} km uzoqlikda
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                            <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                            {order.userLocation.address || `${order.userLocation.lat.toFixed(4)}, ${order.userLocation.lng.toFixed(4)}`}
                          </div>

                          {/* Items */}
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                            {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                          </div>

                          {order.paymentNote && (
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 8 }}>
                              🧾 {order.paymentNote}
                            </div>
                          )}

                          {order.comment && (
                            <div style={{
                              fontSize: 13, padding: '8px 12px',
                              background: 'var(--bg-elevated)',
                              borderRadius: 'var(--radius-sm)', marginBottom: 12,
                              color: 'var(--text-secondary)',
                            }}>
                              💬 {order.comment}
                            </div>
                          )}

                          <button
                            id={`accept-order-${order.id}`}
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            onClick={(e) => { e.stopPropagation(); handleAcceptOrder(order); }}
                          >
                            <CheckCircle size={16} /> Qabul qilish
                            {dist !== null && ` (~${Math.round(dist * 3 + 10)} daqiqa)`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'active' && (
              <div>
                {activeOrders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🚴</div>
                    <div className="empty-state-title">Faol buyurtma yo'q</div>
                    <div className="empty-state-text">Buyurtma qabul qilgandan keyin bu yerda ko'rinadi</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {activeOrders.map(order => (
                      <div key={order.id} className="admin-card" id={`active-order-${order.id}`} style={{ cursor: 'pointer', border: selectedOrder?.id === order.id ? '2px solid var(--primary)' : '1px solid var(--border-subtle)', position: 'relative' }} onClick={() => setSelectedOrder(order)}>
                        {order.status === 'delivered' && (
                          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 12 }}>
                            ✅ Yetkazildi
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>
                            {order.status === 'accepted' ? '🏪 Mahsulot olish' : order.status === 'picked_up' ? '🚴 Yetkazilmoqda' : '✅ Bajarildi'}
                          </div>
                          <span style={{
                            background: order.status === 'accepted' ? 'rgba(252,76,2,0.15)' : 'rgba(59,130,246,0.15)',
                            color: order.status === 'accepted' ? 'var(--primary)' : '#3b82f6',
                            padding: '4px 10px', borderRadius: 'var(--radius-full)',
                            fontSize: 12, fontWeight: 700,
                          }}>
                            {order.status === 'accepted' ? 'Kutilmoqda' : "Yo'lda"}
                          </span>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>👤 {order.userName} — 📞 <a href={`tel:${order.userPhone}`} style={{ color: 'var(--primary)' }}>{order.userPhone}</a></div>
                          
                          {order.paymentMethod === 'cash' && (
                            <div style={{
                              marginTop: 12, padding: '8px 12px', background: 'rgba(34, 197, 94, 0.15)',
                              border: '2px dashed #22c55e', borderRadius: 'var(--radius-sm)',
                              color: '#22c55e', fontSize: 16, fontWeight: 800, textAlign: 'center'
                            }}>
                              💵 NAQD pul: {order.totalPrice.toLocaleString('ru-RU')} so'm
                            </div>
                          )}

                          {/* Detailed location */}
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                            <MapPin size={14} style={{ display: 'inline', marginRight: 4, color: 'var(--primary)' }}/>
                            <strong style={{ color: 'var(--text-primary)' }}>Manzil:</strong> {order.userLocation?.address || 'Kiritilmagan'}
                          </div>
                          <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 4, marginLeft: 20 }}>
                            <a href={`https://yandex.uz/maps/?pt=${order.userLocation?.lng},${order.userLocation?.lat}&z=16&l=map`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
                              📍 Xaritada ochish ({order.userLocation?.lat.toFixed(4)}, {order.userLocation?.lng.toFixed(4)})
                            </a>
                          </div>

                          {order.paymentNote && (
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                              🧾 {order.paymentNote}
                            </div>
                          )}

                          {order.comment && (
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                              💬 <strong style={{ color: 'var(--text-primary)' }}>Mo'ljal/Izoh:</strong> {order.comment}
                            </div>
                          )}

                          <div style={{ fontSize: 13, color: '#22c55e', marginTop: 8 }}>
                            <Clock size={12} style={{ display: 'inline', marginRight: 4 }}/>
                            Taxminiy vaqt: ~{order.estimatedTime} daqiqa
                          </div>
                        </div>

                        {/* Store location for pickup */}
                        {order.status === 'accepted' && stores.length > 0 && (
                          <div style={{
                            background: 'rgba(34,197,94,0.08)',
                            border: '1px solid rgba(34,197,94,0.2)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px', marginBottom: 12,
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', marginBottom: 6 }}>
                              🏪 Mahsulot olish joyi:
                            </div>
                            {stores.map(store => (
                              <div key={store.id} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                <strong>{store.name}</strong> — {store.address}
                                {store.comment && <span> ({store.comment})</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                          {order.status === 'accepted' && (
                            <button
                              id={`pickup-${order.id}`}
                              className="btn btn-primary"
                              style={{ flex: 1 }}
                              onClick={() => handleMarkPickedUp(order.id!)}
                            >
                              <Store size={16} /> Mahsulot olindi
                            </button>
                          )}
                          {order.status === 'picked_up' && (
                            <button
                              id={`deliver-${order.id}`}
                              className="btn btn-primary"
                              style={{ flex: 1, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                              onClick={() => handleMarkDelivered(order.id!)}
                            >
                              <CheckCircle size={16} /> Yetkazildi ✅
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Map panel for selected order */}
          {selectedOrder && (
            <div style={{ position: 'sticky', top: 90 }}>
              <div className="admin-card" style={{ borderColor: 'var(--primary)' }}>
                <h3 className="admin-card-title">
                  <MapPin size={16} /> Buyurtma xaritasi
                </h3>
                <div
                  ref={orderMapRef}
                  style={{
                    width: '100%', height: 300,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-elevated)',
                    marginBottom: 12,
                  }}
                />
                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mijoz: </span>
                  <strong>{selectedOrder.userName}</strong> — {selectedOrder.userPhone}
                </div>
                {selectedOrder.paymentNote && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    🧾 {selectedOrder.paymentNote}
                  </div>
                )}
                <div style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>
                  📍 {selectedOrder.userLocation.address}
                </div>
                {courierLocation && (
                  <div style={{ fontSize: 13, color: '#3b82f6', marginBottom: 12 }}>
                    🚴 Sizdan masofa: {getDistance(
                      courierLocation.lat, courierLocation.lng,
                      selectedOrder.userLocation.lat, selectedOrder.userLocation.lng
                    ).toFixed(1)} km
                  </div>
                )}
                {selectedOrder.status === 'pending' && (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => handleAcceptOrder(selectedOrder)}
                  >
                    <CheckCircle size={16} /> Qabul qilish
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Support Chat Widget */}
      <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000 }}>
        {showChat ? (
          <div style={{ width: 320, height: 450, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '12px 16px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>💬 Admin bilan aloqa</span>
              <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} onClick={() => setShowChat(false)}>✕</button>
            </div>
            
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 20 }}>
                  Savollaringiz bormi? Admin bilan bog'laning!
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
              if (!chatInput.trim() || !session) return;
              sendMessage(session.id, session.id, `Kuryer: ${session.username}`, chatInput, 'user');
              setChatInput('');
            }} style={{ padding: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
              <input type="text" className="form-input" style={{ flex: 1, height: 36, fontSize: 14 }} placeholder="Xabar yozing..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
              <button type="submit" className="btn btn-primary btn-sm" style={{ height: 36 }}>Yuborish</button>
            </form>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ borderRadius: '50px', padding: '12px 24px', boxShadow: '0 4px 12px rgba(252,76,2,0.3)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }} onClick={() => setShowChat(true)}>
            💬 <span style={{ fontWeight: 600 }}>Aloqa (Admin)</span>
            {unreadCount > 0 && <span className="cart-badge" style={{ position: 'relative', top: 0, right: 0, background: 'white', color: 'var(--primary)' }}>{unreadCount}</span>}
          </button>
        )}
      </div>
    </div>
  );
};

export default CourierPage;
