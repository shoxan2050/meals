import React from 'react';
import { ImageIcon, Plus, Minus } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  index?: number;
  onClick?: (product: Product) => void;
}



const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0, onClick }) => {
  const { user } = useAuth();
  const { items, addItem, incrementItem, decrementItem } = useCart();

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ovqat': return '🍽️ Ovqat';
      case 'ichimlik': return '🥤 Ichimlik';
      case 'desert': return '🍰 Desert';
      default: return type;
    }
  };

  const cartItem = items.find(i => i.productId === product.id);
  const quantity = cartItem?.quantity || 0;

  const numericPrice = typeof product.price === 'number'
    ? product.price
    : (product.price && product.price !== 'Nothing' ? Number(product.price) : 0);

  const displayPrice = numericPrice > 0
    ? `${numericPrice.toLocaleString()} so'm`
    : 'Nothing';

  const handleAdd = () => {
    if (!user) {
      toast('Savatga qo\'shish uchun avval kiring!', { icon: '🔐' });
      return;
    }
    if (user.email === 'admin@admin.com') {
      toast('Admin sifatida buyurtma berish mumkin emas', { icon: '⚠️' });
      return;
    }
    addItem({
      productId: product.id!,
      name: product.name,
      price: numericPrice,
      imageUrl: product.imageUrl,
      type: product.type,
    });
    toast.success(`${product.name} savatga qo'shildi! 🛒`);
  };

  const handleIncrement = () => incrementItem(product.id!);
  const handleDecrement = () => decrementItem(product.id!);

  return (
    <div
      className="product-card card-enter"
      style={{ animationDelay: `${index * 60}ms`, cursor: onClick ? 'pointer' : 'default' }}
      id={`product-card-${product.id}`}
      onClick={(e) => {
        // Prevent click if clicking on cart controls
        if ((e.target as HTMLElement).closest('.cart-controls') || (e.target as HTMLElement).closest('.add-btn-large')) {
          return;
        }
        if (onClick) onClick(product);
      }}
    >
      {/* Image */}
      <div className="product-card-image">
        {product.imageUrl ? (
          <>
            <img src={product.imageUrl} alt={product.name} loading="lazy" />
            <div className="product-card-badge">{getTypeLabel(product.type)}</div>
          </>
        ) : (
          <>
            <div className="product-card-image-placeholder">
              <ImageIcon size={40} />
              <span>Rasm yo'q</span>
            </div>
            <div className="product-card-badge">{getTypeLabel(product.type)}</div>
          </>
        )}
      </div>

      {/* Body */}
      <div className="product-card-body">
        <div className="product-card-type">{getTypeLabel(product.type)}</div>
        <div className="product-card-name">{product.name || 'Noma\'lum'}</div>
        <div className="product-card-desc">{product.description || 'Nothing'}</div>

        <div className="product-card-footer">
          <div className="product-card-price">
            {displayPrice}
          </div>

          {/* Cart controls */}
          {quantity > 0 ? (
            <div className="cart-controls">
              <button
                id={`decrement-${product.id}`}
                className="cart-ctrl-btn cart-ctrl-minus"
                onClick={handleDecrement}
              >
                <Minus size={14} />
              </button>
              <span className="cart-ctrl-count">{quantity}</span>
              <button
                id={`increment-${product.id}`}
                className="cart-ctrl-btn cart-ctrl-plus"
                onClick={handleIncrement}
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button
              id={`add-to-cart-${product.id}`}
              className="product-card-add-btn"
              onClick={handleAdd}
              title="Savatga qo'shish"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
