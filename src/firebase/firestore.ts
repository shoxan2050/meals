import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  where,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from './config';
import { Product, CourierUser, Order, Store, CartItem, Message, Chat } from '../types';

// ============ PRODUCTS ============
export const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'products'), {
    ...product,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getProducts = async (): Promise<Product[]> => {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate()
  })) as Product[];
};

export const deleteProduct = async (productId: string) => {
  await deleteDoc(doc(db, 'products', productId));
};

export const updateProduct = async (productId: string, data: Partial<Product>) => {
  await updateDoc(doc(db, 'products', productId), data);
};

// ============ COURIER USERS ============
export const addCourierUser = async (user: Omit<CourierUser, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'courierUsers'), {
    ...user,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getCourierUsers = async (): Promise<CourierUser[]> => {
  const q = query(collection(db, 'courierUsers'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate()
  })) as CourierUser[];
};

export const deleteCourierUser = async (userId: string) => {
  await deleteDoc(doc(db, 'courierUsers', userId));
};

export const authenticateCourier = async (username: string, password: string): Promise<CourierUser | null> => {
  const q = query(
    collection(db, 'courierUsers'),
    where('username', '==', username),
    where('password', '==', password)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const data = snapshot.docs[0].data();
    return { id: snapshot.docs[0].id, ...data } as CourierUser;
  }
  return null;
};

export const loginCourier = async (username: string, password: string): Promise<CourierUser | null> => {
  const q = query(
    collection(db, 'courierUsers'),
    where('username', '==', username),
    where('password', '==', password)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docData = snapshot.docs[0];
  return { id: docData.id, ...docData.data() } as CourierUser;
};

// ============ CART ============
export const saveCart = async (userId: string, items: CartItem[]) => {
  await setDoc(doc(db, 'carts', userId), {
    items,
    updatedAt: serverTimestamp()
  });
};

export const getCart = async (userId: string): Promise<CartItem[]> => {
  const docRef = await getDoc(doc(db, 'carts', userId));
  if (!docRef.exists()) return [];
  return docRef.data().items || [];
};

// ============ ORDERS ============
export const createOrder = async (order: Omit<Order, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'orders'), {
    ...order,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getOrders = async (): Promise<Order[]> => {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: (d.data().createdAt as Timestamp)?.toDate()
  })) as Order[];
};

export const getPendingOrders = (callback: (orders: Order[]) => void) => {
  const q = query(
    collection(db, 'orders'),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: (d.data().createdAt as Timestamp)?.toDate()
    })) as Order[];
    orders.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    callback(orders);
  });
};

export const getCourierOrders = (courierId: string, callback: (orders: Order[]) => void) => {
  const q = query(
    collection(db, 'orders'),
    where('courierId', '==', courierId)
  );
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: (d.data().createdAt as Timestamp)?.toDate()
    })) as Order[];
    // Only show active orders, sorted by date
    const active = orders
      .filter(o => o.status === 'accepted' || o.status === 'picked_up')
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    callback(active);
  });
};

export const getUserOrders = (userId: string, callback: (orders: Order[]) => void) => {
  const q = query(
    collection(db, 'orders'),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: (d.data().createdAt as Timestamp)?.toDate()
    })) as Order[];
    // Sort client-side to avoid composite index
    orders.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    callback(orders);
  });
};

export const updateOrderStatus = async (
  orderId: string,
  status: Order['status'],
  extra?: Partial<Order>
) => {
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    ...extra
  });
};

export const updateOrderReceipt = async (orderId: string, status: 'read') => {
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, { receiptStatus: status });
};

export const updateOrderRating = async (orderId: string, rating: number, comment: string) => {
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, { rating, ratingComment: comment, isRated: true });
};

// ============ STORES ============
export const addStore = async (store: Omit<Store, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'stores'), {
    ...store,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getStores = async (): Promise<Store[]> => {
  const q = query(collection(db, 'stores'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: (d.data().createdAt as Timestamp)?.toDate()
  })) as Store[];
};

export const deleteStore = async (storeId: string) => {
  await deleteDoc(doc(db, 'stores', storeId));
};

// ============ CHATS ============
export const sendMessage = async (chatId: string, userId: string, userName: string, text: string, sender: 'user' | 'admin') => {
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  
  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      userId,
      userName,
      lastMessage: text,
      unreadCountAdmin: sender === 'user' ? 1 : 0,
      unreadCountUser: sender === 'admin' ? 1 : 0,
      updatedAt: serverTimestamp()
    });
  } else {
    const data = chatSnap.data();
    await updateDoc(chatRef, {
      lastMessage: text,
      unreadCountAdmin: sender === 'user' ? (data.unreadCountAdmin || 0) + 1 : data.unreadCountAdmin || 0,
      unreadCountUser: sender === 'admin' ? (data.unreadCountUser || 0) + 1 : data.unreadCountUser || 0,
      updatedAt: serverTimestamp()
    });
  }

  await addDoc(collection(db, `chats/${chatId}/messages`), {
    chatId,
    sender,
    text,
    createdAt: serverTimestamp()
  });
};

export const subscribeToMessages = (chatId: string, callback: (msgs: Message[]) => void) => {
  const q = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: (d.data().createdAt as Timestamp)?.toDate()
    })) as Message[];
    callback(msgs);
  });
};

export const subscribeToChats = (callback: (chats: Chat[]) => void) => {
  const q = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      updatedAt: (d.data().updatedAt as Timestamp)?.toDate()
    })) as Chat[];
    callback(chats);
  });
};

export const markChatRead = async (chatId: string, by: 'admin' | 'user') => {
  const updateData = by === 'admin' ? { unreadCountAdmin: 0 } : { unreadCountUser: 0 };
  await updateDoc(doc(db, 'chats', chatId), updateData);
};


