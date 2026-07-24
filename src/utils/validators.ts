// Security validators and sanitizers

// File validation constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
export const MAX_IMAGE_WIDTH = 2400;
export const MAX_IMAGE_HEIGHT = 2400;

/**
 * Validate file size and type
 * @param file - File to validate
 * @returns { valid: boolean, error?: string }
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Fayl hajmi 5MB dan oshmasligi kerak. Hozirgi hajm: ${(file.size / 1024 / 1024).toFixed(1)}MB`
    };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Faqat JPEG, PNG, WebP formatlar qabul qilinadi. Sizning formatiniz: ${file.type || 'Noma\'lum'}`
    };
  }

  return { valid: true };
};

/**
 * Validate image dimensions
 * @param file - File to validate
 * @returns Promise<{ valid: boolean, error?: string }>
 */
export const validateImageDimensions = (file: File): Promise<{ valid: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width > MAX_IMAGE_WIDTH || img.height > MAX_IMAGE_HEIGHT) {
          resolve({
            valid: false,
            error: `Rasm hajmi maksimum ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT} piksel bo'lishi kerak. Siznikining: ${img.width}x${img.height}px`
          });
        } else {
          resolve({ valid: true });
        }
      };
      img.onerror = () => {
        resolve({
          valid: false,
          error: 'Rasm yuklanib bo\'lmadi. Fayl damaged bo\'lishi mumkin.'
        });
      };
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      resolve({
        valid: false,
        error: 'Fayl o\'qilmadi'
      });
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Sanitize text input (prevent XSS)
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  return text
    .trim()
    .slice(0, 500) // Max 500 characters
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, ''); // Remove javascript protocol
};

/**
 * Validate product name
 * @param name - Product name to validate
 * @returns { valid: boolean, error?: string }
 */
export const validateProductName = (name: string): { valid: boolean; error?: string } => {
  const sanitized = sanitizeText(name);
  
  if (!sanitized || sanitized.length < 2) {
    return {
      valid: false,
      error: 'Mahsulot nomi kamida 2 ta belgidan iborat bo\'lishi kerak'
    };
  }
  
  if (sanitized.length > 100) {
    return {
      valid: false,
      error: 'Mahsulot nomi 100 ta belgidan oshmasligi kerak'
    };
  }
  
  return { valid: true };
};

/**
 * Validate description
 * @param desc - Description to validate
 * @returns { valid: boolean, error?: string }
 */
export const validateDescription = (desc: string): { valid: boolean; error?: string } => {
  if (!desc || desc.trim().length === 0) {
    return { valid: true }; // Optional field
  }
  
  const sanitized = sanitizeText(desc);
  
  if (sanitized.length > 500) {
    return {
      valid: false,
      error: 'Tavsif 500 ta belgidan oshmasligi kerak'
    };
  }
  
  return { valid: true };
};

/**
 * Validate phone number (Uzbek format)
 * @param phone - Phone number to validate
 * @returns { valid: boolean, error?: string }
 */
export const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
  const cleaned = phone.replace(/\D/g, '');
  
  // Uzbekistan phone: +998 XX XXX XXXX
  if (!cleaned.match(/^998\d{9}$/) && !cleaned.match(/^\d{9}$/) && !cleaned.match(/^\+998\d{9}$/)) {
    return {
      valid: false,
      error: 'Telefon raqami noto\'g\'ri. Misol: +998 90 123 45 67'
    };
  }
  
  return { valid: true };
};

/**
 * Validate user name
 * @param name - User name to validate
 * @returns { valid: boolean, error?: string }
 */
export const validateUserName = (name: string): { valid: boolean; error?: string } => {
  const sanitized = sanitizeText(name);
  
  if (!sanitized || sanitized.length < 2) {
    return {
      valid: false,
      error: 'Ismingiz kamita 2 ta belgidan iborat bo\'lishi kerak'
    };
  }
  
  if (sanitized.length > 50) {
    return {
      valid: false,
      error: 'Ismingiz 50 ta belgidan oshmasligi kerak'
    };
  }
  
  return { valid: true };
};

/**
 * Validate address
 * @param address - Address to validate
 * @returns { valid: boolean, error?: string }
 */
export const validateAddress = (address: string): { valid: boolean; error?: string } => {
  const sanitized = sanitizeText(address);
  
  if (!sanitized || sanitized.length < 5) {
    return {
      valid: false,
      error: 'Manzil kamita 5 ta belgidan iborat bo\'lishi kerak'
    };
  }
  
  if (sanitized.length > 200) {
    return {
      valid: false,
      error: 'Manzil 200 ta belgidan oshmasligi kerak'
    };
  }
  
  return { valid: true };
};

/**
 * Check rate limiting - prevent rapid order creation
 * @param userId - User ID
 * @param maxOrdersPerHour - Maximum orders allowed per hour (default: 5)
 * @returns { allowed: boolean, remainingTime?: number }
 */
export const checkOrderRateLimit = (userId: string, maxOrdersPerHour: number = 5): { allowed: boolean; remainingTime?: number } => {
  const key = `order_limit_${userId}`;
  const now = Date.now();
  const limit = localStorage.getItem(key);
  
  if (!limit) {
    // First order, store timestamp
    localStorage.setItem(key, JSON.stringify({ count: 1, timestamp: now }));
    return { allowed: true };
  }
  
  try {
    const data = JSON.parse(limit);
    const timeDiff = now - data.timestamp;
    const oneHour = 60 * 60 * 1000;
    
    if (timeDiff > oneHour) {
      // Reset after 1 hour
      localStorage.setItem(key, JSON.stringify({ count: 1, timestamp: now }));
      return { allowed: true };
    }
    
    if (data.count >= maxOrdersPerHour) {
      const remainingTime = Math.ceil((oneHour - timeDiff) / 1000 / 60); // in minutes
      return {
        allowed: false,
        remainingTime
      };
    }
    
    // Increment counter
    localStorage.setItem(key, JSON.stringify({ count: data.count + 1, timestamp: data.timestamp }));
    return { allowed: true };
  } catch (e) {
    // Reset on error
    localStorage.setItem(key, JSON.stringify({ count: 1, timestamp: now }));
    return { allowed: true };
  }
};

/**
 * Mask sensitive data (phone, card number)
 * @param text - Text to mask
 * @param type - Type of sensitive data ('phone' | 'card')
 * @returns Masked text
 */
export const maskSensitiveData = (text: string, type: 'phone' | 'card' = 'phone'): string => {
  if (type === 'phone') {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 9) {
      return `+998 ${cleaned.slice(-9, -4)} ${cleaned.slice(-4).split('').join(' ')}`;
    }
    return text;
  }
  
  if (type === 'card') {
    // Show only last 4 digits
    const last4 = text.slice(-4);
    const masked = '*'.repeat(Math.max(0, text.length - 4)) + last4;
    return masked.replace(/(.{4})/g, '$1 ').trim();
  }
  
  return text;
};

/**
 * Validate price
 * @param price - Price to validate
 * @returns { valid: boolean, error?: string }
 */
export const validatePrice = (price: string | number): { valid: boolean; error?: string } => {
  const numPrice = typeof price === 'string' ? Number(price) : price;
  
  if (isNaN(numPrice) || numPrice <= 0) {
    return {
      valid: false,
      error: 'Narx 0 dan katta bo\'lishi kerak'
    };
  }
  
  if (numPrice > 1000000) {
    return {
      valid: false,
      error: 'Narx 1,000,000 so\'mdan oshmasligi kerak'
    };
  }
  
  return { valid: true };
};
