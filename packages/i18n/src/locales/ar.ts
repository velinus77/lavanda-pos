export const common = {
  // General
  appName: 'لافندا POS',
  loading: 'جاري التحميل...',
  error: 'خطأ',
  success: 'نجاح',
  cancel: 'إلغاء',
  confirm: 'تأكيد',
  save: 'حفظ',
  delete: 'حذف',
  edit: 'تعديل',
  add: 'إضافة',
  search: 'بحث',
  filter: 'تصفية',
  clear: 'مسح',
  close: 'إغلاق',
  back: 'رجوع',
  next: 'التالي',
  previous: 'السابق',
  yes: 'نعم',
  no: 'لا',
  
  // Actions
  create: 'إنشاء',
  update: 'تحديث',
  remove: 'إزالة',
  export: 'تصدير',
  import: 'استيراد',
  print: 'طباعة',
  refresh: 'تحديث',
  
  // Status
  active: 'نشط',
  inactive: 'غير نشط',
  pending: 'قيد الانتظار',
  completed: 'مكتمل',
  failed: 'فشل',
  
  // Messages
  noData: 'لا توجد بيانات',
  confirmDelete: 'هل أنت متأكد من حذف هذا العنصر؟',
  saveSuccess: 'تم الحفظ بنجاح',
  saveError: 'فشل الحفظ',
  deleteSuccess: 'تم الحذف بنجاح',
  deleteError: 'فشل الحذف',
  
  // Validation
  required: 'هذا الحقل مطلوب',
  invalidEmail: 'عنوان البريد الإلكتروني غير صالح',
  invalidPhone: 'رقم الهاتف غير صالح',
  minLength: 'يجب أن يكون {min} أحرف على الأقل',
  maxLength: 'يجب ألا يزيد عن {max} أحرف',
  
  // Pagination
  page: 'صفحة',
  of: 'من',
  showing: 'عرض',
  results: 'نتائج',
} as const;

export const auth = {
  login: 'تسجيل الدخول',
  logout: 'تسجيل الخروج',
  username: 'اسم المستخدم',
  password: 'كلمة المرور',
  rememberMe: 'تذكرني',
  forgotPassword: 'نسيت كلمة المرور؟',
  resetPassword: 'إعادة تعيين كلمة المرور',
  signUp: 'إنشاء حساب',
  welcome: 'مرحباً',
  loginSuccess: 'تم تسجيل الدخول بنجاح',
  loginError: 'بيانات الاعتماد غير صحيحة',
  logoutSuccess: 'تم تسجيل الخروج بنجاح',
} as const;

export const dashboard = {
  title: 'لوحة التحكم',
  overview: 'نظرة عامة',
  todaySales: 'مبيعات اليوم',
  totalProducts: 'إجمالي المنتجات',
  lowStock: 'مخزون منخفض',
  recentTransactions: 'المعاملات الأخيرة',
  revenue: 'الإيرادات',
  orders: 'الطلبات',
  customers: 'العملاء',
} as const;

export const products = {
  title: 'المنتجات',
  addProduct: 'إضافة منتج',
  editProduct: 'تعديل المنتج',
  deleteProduct: 'حذف المنتج',
  productDetails: 'تفاصيل المنتج',
  sku: 'رمز المنتج',
  barcode: 'الباركود',
  name: 'الاسم',
  nameAr: 'الاسم (العربية)',
  description: 'الوصف',
  descriptionAr: 'الوصف (العربية)',
  category: 'الفئة',
  price: 'السعر',
  cost: 'التكلفة',
  quantity: 'الكمية',
  minQuantity: 'الحد الأدنى للكمية',
  status: 'الحالة',
  inStock: 'متوفر',
  outOfStock: 'نفذت الكمية',
  lowStock: 'مخزون منخفض',
} as const;

export const categories = {
  title: 'الفئات',
  addCategory: 'إضافة فئة',
  editCategory: 'تعديل الفئة',
  parentCategory: 'الفئة الأم',
  none: 'لا يوجد',
} as const;

export const inventory = {
  title: 'المخزون',
  stockLevel: 'مستوى المخزون',
  adjustStock: 'تعديل المخزون',
  stockAdjustment: 'تعديل المخزون',
  currentStock: 'المخزون الحالي',
  newStock: 'المخزون الجديد',
  reason: 'السبب',
  lastUpdated: 'آخر تحديث',
  location: 'الموقع',
} as const;

export const sales = {
  title: 'المبيعات',
  newSale: 'بيع جديد',
  completeSale: 'إتمام البيع',
  subtotal: 'المجموع الجزئي',
  discount: 'الخصم',
  tax: 'الضريبة',
  total: 'الإجمالي',
  payment: 'الدفع',
  paymentMethod: 'طريقة الدفع',
  change: 'الباقي',
  receipt: 'الإيصال',
  printReceipt: 'طباعة الإيصال',
  cash: 'نقدي',
  card: 'بطاقة',
  credit: 'آجل',
} as const;

export const settings = {
  title: 'الإعدادات',
  general: 'عام',
  language: 'اللغة',
  theme: 'السمة',
  lightMode: 'الوضع الفاتح',
  darkMode: 'الوضع الداكن',
  english: 'الإنجليزية',
  arabic: 'العربية',
  pharmacy: 'الصيدلية',
  pharmacyName: 'اسم الصيدلية',
  address: 'العنوان',
  phone: 'الهاتف',
  email: 'البريد الإلكتروني',
  taxRate: 'معدل الضريبة',
  currency: 'العملة',
} as const;

export const ar = {
  common,
  auth,
  dashboard,
  products,
  categories,
  inventory,
  sales,
  settings,
} as const;

export type Translations = typeof ar;
