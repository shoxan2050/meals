// Firebase types

export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number | string;
  type: 'ovqat' | 'ichimlik' | 'desert';
  imageUrl?: string;
  storeId?: string;
  createdAt?: Date;
}

export interface CourierUser {
  id?: string;
  username: string;
  password: string;
  role: 'courier' | 'user';
  avatar?: string;
  phone?: string;
  createdAt?: Date;
}

export type ProductType = 'hammasi' | 'ovqat' | 'ichimlik' | 'desert';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

// Cart
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  type: string;
  quantity: number;
}

// Order
export interface Order {
  id?: string;
  userId: string;
  userName: string;
  userPhone: string;
  userLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  comment: string;
  items: CartItem[];
  totalPrice: number;
  status: 'awaiting_payment' | 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
  courierId?: string;
  courierUsername?: string;
  estimatedTime?: number;
  storeId?: string;
  createdAt?: Date;
  // Payment fields
  paymentMethod?: 'cash' | 'card';
  receiptUrl?: string;
  receiptStatus?: 'unread' | 'read';
  paymentNote?: string;
  // Rating fields
  rating?: number;
  ratingComment?: string;
  isRated?: boolean;
}

// Store (Do'kon)
export interface Store {
  id?: string;
  name: string;
  type: 'restaurant' | 'cafe' | 'shop';
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  phone?: string;
  hours?: string;
  comment?: string;
  images?: string[];
  description?: string;
  bossName?: string;
  createdAt?: Date;
}

// Courier session (localStorage)
export interface CourierSession {
  id: string;
  username: string;
  role: 'courier';
}

// Chat system
export interface Message {
  id?: string;
  chatId: string;
  sender: 'user' | 'admin';
  text: string;
  createdAt?: Date;
}

export interface Chat {
  id?: string;
  userId: string;
  userName: string;
  lastMessage: string;
  unreadCountAdmin: number;
  unreadCountUser: number;
  updatedAt?: Date;
}
