import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Minus, Plus, Trash2, MapPin, Phone,
  MessageSquare, ArrowLeft, CheckCircle, Loader, Store
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../App';
import { createOrder } from '../firebase/firestore';
import { uploadReceiptImage } from '../firebase/storage';
import { validatePhoneNumber, validateUserName, validateAddress, checkOrderRateLimit, maskSensitiveData } from '../utils/validators';
import toast from 'react-hot-toast';


declare global {
  interface Window {
    ymaps3: {
      ready: Promise<void>;
      YMap: new (el: HTMLElement, opts: object) => YMap;
      YMapDefaultSchemeLayer: new (opts?: object) => object;
      YMapDefaultFeaturesLayer: new () => object;
      YMapMarker: new (opts: object, el: HTMLElement) => object;
      YMapControls: new (opts: object) => object;
      YMapGeolocationControl: new (opts?: object) => object;
    };
  }
  interface YMap {
    addChild: (child: object) => void;
    destroy: () => void;
  }
}

const YANDEX_API_KEY = 'ada6b1c6-e5b3-4316-a8f4-61ff91cdb1e2';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, incrementItem, decrementItem, removeItem, clearCart, totalPrice } = useCart();

  const [userName, setUserName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [forMyself, setForMyself] = useState(false);
  
  // Payment flow state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'card'>('cash');
  const [receiptFile, setReceiptFile] = useState<File|null>(null);
  const [receiptPreview, setReceiptPreview] = useState('');

  const mapRef = useRef<HTMLDivElement>(null);
  const ymap = useRef<YMap | null>(null);
  const mapLoaded = useRef(false);

  // Load Yandex Maps script
  useEffect(() => {
    if (mapLoaded.current) return;
    mapLoaded.current = true;
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${YANDEX_API_KEY}&lang=uz_UZ`;
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initMap = (lat: number, lng: number) => {
    if (!mapRef.current || !window.ymaps3) return;

    if (ymap.current) {
      ymap.current.destroy();
      ymap.current = null;
    }

    window.ymaps3.ready.then(() => {
      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = window.ymaps3;

      const map = new YMap(mapRef.current!, {
        location: { center: [lng, lat], zoom: 15 },
      });
      map.addChild(new YMapDefaultSchemeLayer());
      map.addChild(new YMapDefaultFeaturesLayer());

      const markerEl = document.createElement('div');
      markerEl.innerHTML = '📍';
      markerEl.style.fontSize = '32px';
      markerEl.style.cursor = 'pointer';

      const marker = new YMapMarker({ coordinates: [lng, lat] }, markerEl);
      map.addChild(marker);

      ymap.current = map;
    });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Brauzeringiz lokatsiyani qo\'llab-quvvatlamaydi');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });

        // Reverse geocoding with OpenStreetMap Nominatim (Free, no API key needed)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          const addrText = data?.display_name || data?.address?.road || '';
          if (addrText) {
            setAddress(addrText);
          } else {
            setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } catch {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }

        initMap(lat, lng);
        setLocating(false);
        toast.success('Lokatsiya aniqlandi! ✅');
      },
      (err) => {
        setLocating(false);
        toast.error('Lokatsiyani aniqlashda xato: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
    setPhone(value);
  };

  const handleForMyselfToggle = () => {
    if (!forMyself) {
      setForMyself(true);
      setUserName(user?.displayName || '');
      // Phone would need to be stored in user profile - for now just pre-fill name
      toast.success('Ma\'lumotlar avtomatik to\'ldirildi');
    } else {
      setForMyself(false);
      setUserName('');
      setPhone('');
    }
  };

  const handleCheckoutClick = () => {
    if (!userName.trim()) { toast.error('Ismingizni kiriting'); return; }
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length !== 9) { toast.error('Telefon raqami 9 ta raqamdan iborat bo\'lishi kerak'); return; }
    if (!location) { toast.error('Lokatsiyangizni aniqlang'); return; }
    if (items.length === 0) { toast.error("Savat bo'sh"); return; }
    setShowPayment(true);
  };

  const finalizeOrder = async () => {
    if (paymentMethod === 'card' && !receiptFile) {
      toast.error('Iltimos, chek rasmini yuklang');
      return;
    }

    if (!location) {
      toast.error('Lokatsiyangizni aniqlang');
      return;
    }

    setSubmitting(true);
    let receiptUrl = '';

    try {
      if (paymentMethod === 'card' && receiptFile) {
        toast.loading('Chek yuklanmoqda...', { id: 'receipt' });
        receiptUrl = await uploadReceiptImage(receiptFile);
        toast.dismiss('receipt');
      }

      const finalStatus = paymentMethod === 'card' ? 'awaiting_payment' : 'pending';

      const orderData: any = {
        userId: user!.uid,
        userName,
        userPhone: phone,
        userLocation: { lat: location.lat, lng: location.lng, address },
        comment,
        items,
        totalPrice,
        status: finalStatus,
        paymentMethod,
      };

      if (receiptUrl) {
        orderData.receiptUrl = receiptUrl;
        orderData.receiptStatus = 'unread';
      }

      await createOrder(orderData);

      clearCart();
      setShowPayment(false);
      setOrderPlaced(true);
      toast.success('Buyurtma qabul qilindi! 🎉');
    } catch (err: any) {
      toast.dismiss('receipt');
      toast.error('Buyurtma berishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  if (orderPlaced) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <CheckCircle size={48} />
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, color: 'var(--text-primary)' }}>
          Buyurtma qabul qilindi!
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 30, maxWidth: 400 }}>
          {paymentMethod === 'card' ? 'To\'lov tekshirilmoqda... ⏳' : 'Kuryer qidirilmoqda... 🚴'}<br />
          Tez orada siz bilan bog'lanamiz
        </p>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={() => navigate('/userpage')}>
            Asosiy menyuga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '24px 0' }}>
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14 }}>
          <ArrowLeft size={16} /> Orqaga
        </button>
        
        <h1 className="page-title" style={{ marginBottom: 24, fontSize: 28, fontWeight: 800 }}>
          Savat
        </h1>

        {items.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            <div className="empty-state-icon" style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
            <div className="empty-state-title" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Savatingiz bo'sh</div>
            <div className="empty-state-text" style={{ color: 'var(--text-secondary)' }}>Menyudan mazzali taomlarni tanlang!</div>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/')}>
              Menyuga qaytish
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 32, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(item => (
                <div key={item.productId} className="cart-item-row" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                  <img src={item.imageUrl} alt={item.name} style={{ width: 64, height: 64, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{(typeof item.price === 'number' ? item.price : Number(item.price) || 0).toLocaleString('ru-RU')} so'm × {item.quantity} = {((typeof item.price === 'number' ? item.price : Number(item.price) || 0) * item.quantity).toLocaleString('ru-RU')} so'm</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => decrementItem(item.productId)}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => incrementItem(item.productId)}><Plus size={14} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeItem(item.productId)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius-lg)' }}>
              <h3 className="admin-card-title" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Store size={18} /> Buyurtma berish
              </h3>
              
              <div style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={forMyself}
                    onChange={handleForMyselfToggle}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  O'zim uchun (avtomatik to'ldirish)
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Ismingiz <span style={{ color: 'var(--primary)' }}>*</span></label>
                <input type="text" className="form-input" placeholder="Ismingizni kiriting" value={userName} onChange={e => setUserName(e.target.value)} disabled={forMyself} />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Telefon raqamingiz <span style={{ color: 'var(--primary)' }}>*</span></label>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder="+998 ** *** ** **" 
                  value={phone ? `+998 ${phone.slice(0,2)} ${phone.slice(2,5)} ${phone.slice(5,7)} ${phone.slice(7)}` : ''}
                  onChange={handlePhoneChange}
                  maxLength={17}
                  disabled={forMyself}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Yetkazib berish manzili <span style={{ color: 'var(--primary)' }}>*</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" className="form-input" placeholder="Manzil" value={address} onChange={e => setAddress(e.target.value)} />
                  <button type="button" className="btn btn-outline" onClick={handleGetLocation} disabled={locating}>{locating ? '...' : '📍'}</button>
                </div>
                {location && <div ref={mapRef} style={{ width: '100%', height: 150, marginTop: 10, borderRadius: 'var(--radius-sm)' }} />}
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleCheckoutClick}>
                Buyurtmani tasdiqlash
              </button>
            </div>
          </div>
        )}
      </div>

      {showPayment && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="modal" style={{ width: 400, background: 'var(--bg-card)', padding: 24, borderRadius: 'var(--radius-lg)' }}>
            <button className="modal-close" onClick={() => setShowPayment(false)} style={{ float: 'right' }}>✕</button>
            <h2 className="modal-title" style={{ marginBottom: 20 }}>To'lov turi</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button className={`btn ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setPaymentMethod('cash')}>💵 Naqd pul</button>
              <button className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setPaymentMethod('card')}>💳 Karta orqali</button>
            </div>
            {paymentMethod === 'card' && (
              <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 20, textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: 14 }}>Iltimos, ushbu karta raqamiga yuboring:</p>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: 'var(--primary)', marginBottom: 8 }}>
                  8600 1234 5678 9012
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
                  Umumiy summa: {totalPrice.toLocaleString('ru-RU')} so'm
                </div>

                <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 12 }}>To'lov chekini yuklang (Majburiy)</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  id="receipt-upload" 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setReceiptFile(file);
                      const reader = new FileReader();
                      reader.onload = ev => setReceiptPreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} 
                />
                
                {receiptPreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={receiptPreview} alt="Receipt" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
                    <button className="btn btn-danger btn-sm" style={{ position: 'absolute', top: 4, right: 4 }} onClick={() => { setReceiptFile(null); setReceiptPreview(''); }}>✕</button>
                  </div>
                ) : (
                  <label htmlFor="receipt-upload" className="btn btn-outline" style={{ width: '100%', cursor: 'pointer' }}>
                    Tashladim (Chekni yuklash)
                  </label>
                )}
              </div>
            )}

            <button 
              className={`btn btn-primary btn-lg ${submitting ? 'btn-loading' : ''}`} 
              style={{ width: '100%' }} 
              onClick={finalizeOrder} 
              disabled={submitting || (paymentMethod === 'card' && !receiptFile)}
            >
              {submitting ? <span className="spinner" /> : <CheckCircle size={16} />}
              {submitting ? 'Yuborilmoqda...' : 'Tasdiqlash va Buyurtma berish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
