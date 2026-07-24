import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem } from '../types';
import { saveCart, getCart } from '../firebase/firestore';
import { useAuth } from '../App';

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string) => void;
  incrementItem: (productId: string) => void;
  decrementItem: (productId: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  incrementItem: () => {},
  decrementItem: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
});

export const useCart = () => useContext(CartContext);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from Firestore when user logs in
  useEffect(() => {
    if (user && user.email !== 'admin@admin.com') {
      getCart(user.uid).then(cartItems => {
        if (cartItems.length > 0) setItems(cartItems);
      }).catch(console.error);
    } else if (!user) {
      setItems([]);
    }
  }, [user]);

  // Save cart to Firestore whenever items change
  const syncCart = useCallback(async (newItems: CartItem[]) => {
    if (user && user.email !== 'admin@admin.com') {
      try {
        await saveCart(user.uid, newItems);
      } catch (e) {
        console.error('Cart sync error:', e);
      }
    }
  }, [user]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      let newItems: CartItem[];
      if (existing) {
        newItems = prev.map(i =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        newItems = [...prev, { ...item, quantity: 1 }];
      }
      syncCart(newItems);
      return newItems;
    });
  }, [syncCart]);

  const incrementItem = useCallback((productId: string) => {
    setItems(prev => {
      const newItems = prev.map(i =>
        i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
      );
      syncCart(newItems);
      return newItems;
    });
  }, [syncCart]);

  const decrementItem = useCallback((productId: string) => {
    setItems(prev => {
      const newItems = prev
        .map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0);
      syncCart(newItems);
      return newItems;
    });
  }, [syncCart]);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => {
      const newItems = prev.filter(i => i.productId !== productId);
      syncCart(newItems);
      return newItems;
    });
  }, [syncCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    if (user) syncCart([]);
  }, [user, syncCart]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => {
    const price = typeof i.price === 'number' ? i.price : 0;
    return sum + price * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, incrementItem, decrementItem, clearCart, totalItems, totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};
