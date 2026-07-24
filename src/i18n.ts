import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  uz: {
    translation: {
      nav: { search: 'Taom qidiring...', home: 'Bosh sahifa', login: 'Kirish', cart: 'Savat', settings: 'Sozlamalar', logout: 'Chiqish' },
      home: { 
        menu: 'Menyu', productsCount: 'ta mahsulot', emptyMenu: 'Mahsulotlar yo\'q', notFound: 'Natija topilmadi', 
        searchQueryEmpty: '"{{query}}" bo\'yicha hech narsa topilmadi', noProductsAdmin: 'Admin hali mahsulot qo\'shmagan', 
        all: 'Hammasi', food: 'Ovqatlar', drinks: 'Ichimliklar', desserts: 'Desertlar',
        heroBadge: '⚡ Tez yetkazib berish — 30 daqiqa ichida',
        heroTitle1: 'Eng Mazali',
        heroTitleHighlight: 'Taomlar',
        heroTitle2: 'Eshigingizda',
        heroSubtitle1: 'Sevimli restoranlaringizdan buyurtma bering,',
        heroSubtitle2: 'tez va qulay yetkazib beramiz',
        searchPlaceholder: 'Taom yoki restoran qidiring...',
        searchBtn: 'Ko\'rish',
        stat1Count: '500+',
        stat1Label: 'Taomlar',
        stat2Count: '30 min',
        stat2Label: 'Yetkazib berish',
        stat3Count: '4.9',
        stat3Label: 'Reyting',
        feat1Title: '30 daqiqa',
        feat1Desc: 'Tez yetkazib berish',
        feat2Title: 'Sifatli',
        feat2Desc: 'Eng yaxshi taomlar',
        feat3Title: 'Qulay',
        feat3Desc: 'Uyingizga yetkazamiz'
      },
      user: { 
        settings: 'Sozlamalar', logout: 'Chiqish', cart: 'Savat', search: 'Taom qidiring...', 
        changeLanguage: 'Tilni o\'zgartirish', support: 'Support (Chat)', newEmail: 'Yangi Email (ixtiyoriy)', 
        newPassword: 'Yangi Parol (ixtiyoriy)', saveChanges: 'O\'zgarishlarni saqlash', saving: 'Saqlanmoqda...',
        statusPayment: 'To\'lov tasdiqlanmoqda...', statusPending: 'Kuryer qidirilmoqda...', statusAccepted: 'Kuryer yo\'lda!',
        statusPicked: 'Yetkazilmoqda 🚴', statusDelivered: 'Yetkazildi ✅', statusCancelled: 'Bekor qilindi',
        rateThanks: 'Bahoingiz uchun rahmat! 😊', rateError: 'Baho yuborishda xato', loggedOut: 'Chiqildi!',
        settingsUpdated: 'Sozlamalar yangilandi! Xavfsizlik uchun tizimga qayta kiring.',
        settingsError: 'Xato yuz berdi. Iltimos oldin tizimdan chiqib yana kiring va takrorlang.'
      },
      product: { addToCart: 'Savatga qo\'shish', noImage: 'Rasm yo\'q', price: 'so\'m' },
      cart: {
        title: 'Savat', empty: 'Savatingiz bo\'sh', emptySub: 'Menyudan mazzali taomlarni tanlang!', backToMenu: 'Menyuga qaytish',
        total: 'Umumiy summa:', checkout: 'Buyurtma berish', checkoutDetails: 'Buyurtma ma\'lumotlari', name: 'Ismingiz',
        phone: 'Telefon raqamingiz', comment: 'Buyurtma uchun izoh (ixtiyoriy)', location: 'Yetkazib berish manzili',
        locationBtn: 'Lokatsiyani aniqlash', locating: 'Aniqlanmoqda...', paymentMethod: 'To\'lov turi', cash: 'Naqd pul',
        card: 'Karta orqali', uploadReceipt: 'To\'lov chekini yuklang (Majburiy)', confirmOrder: 'Tasdiqlash va Buyurtma berish',
        submitting: 'Yuborilmoqda...', orderPlaced: 'Buyurtma qabul qilindi!', lookingForCourier: 'Kuryer qidirilmoqda... 🚴',
        paymentVerifying: 'To\'lov tekshirilmoqda... ⏳', contactSoon: 'Tez orada siz bilan bog\'lanamiz', backToHome: 'Bosh sahifaga qaytish',
        error: 'Buyurtma berishda xato', success: 'Buyurtma qabul qilindi! 🎉', sendToCard: 'Iltimos, ushbu karta raqamiga yuboring:',
        uploadBtn: 'Tashladim (Chekni yuklash)'
      },
      rating: {
        title: '🎉 Buyurtma Yetkazildi!',
        subtitle: 'Xizmatingizdan xursandmiz. Iltimos, mahsulot va xizmat sifatini baholang!',
        commentLabel: 'IZOH QOLDIRING (IXTIYORIY)',
        commentPlaceholder: 'Taom mazalimi? Kuryer xushmuomalaydimi?',
        submit: 'Bahoni yuborish',
        later: 'Keyinroq',
        pleaseRate: 'Iltimos, yulduzchalarni belgilab baholang!'
      },
      common: { loading: 'Yuklanmoqda...', error: 'Xatolik yuz berdi', save: 'Saqlash', cancel: 'Bekor qilish', back: 'Orqaga' }
    }
  },
  ru: {
    translation: {
      nav: { search: 'Поиск блюд...', home: 'Главная', login: 'Войти', cart: 'Корзина', settings: 'Настройки', logout: 'Выйти' },
      home: { 
        menu: 'Меню', productsCount: 'продуктов', emptyMenu: 'Нет продуктов', notFound: 'Ничего не найдено', 
        searchQueryEmpty: 'По запросу "{{query}}" ничего не найдено', noProductsAdmin: 'Админ еще не добавил продукты', 
        all: 'Все', food: 'Еда', drinks: 'Напитки', desserts: 'Десерты',
        heroBadge: '⚡ Быстрая доставка — за 30 минут',
        heroTitle1: 'Самые вкусные',
        heroTitleHighlight: 'Блюда',
        heroTitle2: 'У ваших дверей',
        heroSubtitle1: 'Заказывайте из любимых ресторанов,',
        heroSubtitle2: 'доставим быстро и удобно',
        searchPlaceholder: 'Поиск блюд или ресторанов...',
        searchBtn: 'Найти',
        stat1Count: '500+',
        stat1Label: 'Блюд',
        stat2Count: '30 мин',
        stat2Label: 'Доставка',
        stat3Count: '4.9',
        stat3Label: 'Рейтинг',
        feat1Title: '30 минут',
        feat1Desc: 'Быстрая доставка',
        feat2Title: 'Качественно',
        feat2Desc: 'Лучшие блюда',
        feat3Title: 'Удобно',
        feat3Desc: 'Доставим домой'
      },
      user: { 
        settings: 'Настройки', logout: 'Выйти', cart: 'Корзина', search: 'Поиск блюд...', 
        changeLanguage: 'Изменить язык', support: 'Поддержка (Чат)', newEmail: 'Новый Email (необязательно)', 
        newPassword: 'Новый пароль (необязательно)', saveChanges: 'Сохранить изменения', saving: 'Сохранение...',
        statusPayment: 'Проверка оплаты...', statusPending: 'Поиск курьера...', statusAccepted: 'Курьер в пути!',
        statusPicked: 'Доставляется 🚴', statusDelivered: 'Доставлен ✅', statusCancelled: 'Отменен',
        rateThanks: 'Спасибо за оценку! 😊', rateError: 'Ошибка отправки оценки', loggedOut: 'Вы вышли!',
        settingsUpdated: 'Настройки обновлены! Пожалуйста, войдите снова.',
        settingsError: 'Произошла ошибка. Пожалуйста, выйдите и войдите снова.'
      },
      product: { addToCart: 'В корзину', noImage: 'Нет фото', price: 'сум' },
      cart: {
        title: 'Корзина', empty: 'Ваша корзина пуста', emptySub: 'Выберите вкусные блюда из меню!', backToMenu: 'Вернуться к меню',
        total: 'Итоговая сумма:', checkout: 'Оформить заказ', checkoutDetails: 'Детали заказа', name: 'Ваше имя',
        phone: 'Номер телефона', comment: 'Комментарий к заказу (необязательно)', location: 'Адрес доставки',
        locationBtn: 'Определить локацию', locating: 'Определение...', paymentMethod: 'Способ оплаты', cash: 'Наличные',
        card: 'Оплата картой', uploadReceipt: 'Загрузите чек оплаты (Обязательно)', confirmOrder: 'Подтвердить и заказать',
        submitting: 'Отправка...', orderPlaced: 'Заказ принят!', lookingForCourier: 'Поиск курьера... 🚴',
        paymentVerifying: 'Проверка оплаты... ⏳', contactSoon: 'Мы скоро с вами свяжемся', backToHome: 'Вернуться на главную',
        error: 'Ошибка при оформлении заказа', success: 'Заказ принят! 🎉', sendToCard: 'Пожалуйста, отправьте на эту карту:',
        uploadBtn: 'Отправил (Загрузить чек)'
      },
      rating: {
        title: '🎉 Заказ доставлен!',
        subtitle: 'Мы рады вам помочь. Пожалуйста, оцените качество продукта и обслуживания!',
        commentLabel: 'ОСТАВИТЬ ОТЗЫВ (НЕОБЯЗАТЕЛЬНО)',
        commentPlaceholder: 'Вкусная ли еда? Был ли курьер вежлив?',
        submit: 'Отправить оценку',
        later: 'Позже',
        pleaseRate: 'Пожалуйста, выберите количество звезд!'
      },
      common: { loading: 'Загрузка...', error: 'Произошла ошибка', save: 'Сохранить', cancel: 'Отмена', back: 'Назад' }
    }
  },
  en: {
    translation: {
      nav: { search: 'Search food...', home: 'Home', login: 'Login', cart: 'Cart', settings: 'Settings', logout: 'Logout' },
      home: { 
        menu: 'Menu', productsCount: 'products', emptyMenu: 'No products', notFound: 'Nothing found', 
        searchQueryEmpty: 'Nothing found for "{{query}}"', noProductsAdmin: 'Admin hasn\'t added products yet', 
        all: 'All', food: 'Food', drinks: 'Drinks', desserts: 'Desserts',
        heroBadge: '⚡ Fast delivery — in 30 minutes',
        heroTitle1: 'The Tastiest',
        heroTitleHighlight: 'Meals',
        heroTitle2: 'At Your Door',
        heroSubtitle1: 'Order from your favorite restaurants,',
        heroSubtitle2: 'we will deliver fast and easy',
        searchPlaceholder: 'Search food or restaurants...',
        searchBtn: 'Search',
        stat1Count: '500+',
        stat1Label: 'Meals',
        stat2Count: '30 min',
        stat2Label: 'Delivery',
        stat3Count: '4.9',
        stat3Label: 'Rating',
        feat1Title: '30 minutes',
        feat1Desc: 'Fast delivery',
        feat2Title: 'High Quality',
        feat2Desc: 'Best meals',
        feat3Title: 'Convenient',
        feat3Desc: 'Delivered to home'
      },
      user: { 
        settings: 'Settings', logout: 'Logout', cart: 'Cart', search: 'Search food...', 
        changeLanguage: 'Change language', support: 'Support (Chat)', newEmail: 'New Email (optional)', 
        newPassword: 'New Password (optional)', saveChanges: 'Save changes', saving: 'Saving...',
        statusPayment: 'Verifying payment...', statusPending: 'Looking for courier...', statusAccepted: 'Courier on the way!',
        statusPicked: 'Delivering 🚴', statusDelivered: 'Delivered ✅', statusCancelled: 'Cancelled',
        rateThanks: 'Thank you for your rating! 😊', rateError: 'Error submitting rating', loggedOut: 'Logged out!',
        settingsUpdated: 'Settings updated! Please log in again.',
        settingsError: 'An error occurred. Please log out and log in again.'
      },
      product: { addToCart: 'Add to cart', noImage: 'No image', price: 'sum' },
      cart: {
        title: 'Cart', empty: 'Your cart is empty', emptySub: 'Choose delicious meals from the menu!', backToMenu: 'Back to menu',
        total: 'Total amount:', checkout: 'Checkout', checkoutDetails: 'Order details', name: 'Your name',
        phone: 'Phone number', comment: 'Order comment (optional)', location: 'Delivery address',
        locationBtn: 'Detect location', locating: 'Detecting...', paymentMethod: 'Payment method', cash: 'Cash',
        card: 'Credit card', uploadReceipt: 'Upload payment receipt (Required)', confirmOrder: 'Confirm and place order',
        submitting: 'Submitting...', orderPlaced: 'Order placed!', lookingForCourier: 'Looking for courier... 🚴',
        paymentVerifying: 'Verifying payment... ⏳', contactSoon: 'We will contact you soon', backToHome: 'Back to home',
        error: 'Error placing order', success: 'Order placed! 🎉', sendToCard: 'Please send payment to this card:',
        uploadBtn: 'Sent (Upload receipt)'
      },
      rating: {
        title: '🎉 Order Delivered!',
        subtitle: 'We are glad to serve you. Please rate the quality of food and service!',
        commentLabel: 'LEAVE A COMMENT (OPTIONAL)',
        commentPlaceholder: 'Was the food tasty? Was the courier polite?',
        submit: 'Submit Rating',
        later: 'Later',
        pleaseRate: 'Please select stars to rate!'
      },
      common: { loading: 'Loading...', error: 'An error occurred', save: 'Save', cancel: 'Cancel', back: 'Back' }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['uz', 'ru', 'en'],
    nonExplicitSupportedLngs: true,
    fallbackLng: 'uz',
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
