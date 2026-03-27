export const common = {
  // General
  appName: 'Lavanda POS',
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',
  cancel: 'Cancel',
  confirm: 'Confirm',
  save: 'Save',
  delete: 'Delete',
  edit: 'Edit',
  add: 'Add',
  search: 'Search',
  filter: 'Filter',
  clear: 'Clear',
  close: 'Close',
  back: 'Back',
  next: 'Next',
  previous: 'Previous',
  yes: 'Yes',
  no: 'No',
  
  // Actions
  create: 'Create',
  update: 'Update',
  remove: 'Remove',
  export: 'Export',
  import: 'Import',
  print: 'Print',
  refresh: 'Refresh',
  
  // Status
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  
  // Messages
  noData: 'No data available',
  confirmDelete: 'Are you sure you want to delete this item?',
  saveSuccess: 'Saved successfully',
  saveError: 'Failed to save',
  deleteSuccess: 'Deleted successfully',
  deleteError: 'Failed to delete',
  
  // Validation
  required: 'This field is required',
  invalidEmail: 'Invalid email address',
  invalidPhone: 'Invalid phone number',
  minLength: 'Must be at least {min} characters',
  maxLength: 'Must be no more than {max} characters',
  
  // Pagination
  page: 'Page',
  of: 'of',
  showing: 'Showing',
  results: 'results',
} as const;

export const auth = {
  login: 'Login',
  logout: 'Logout',
  username: 'Username',
  password: 'Password',
  rememberMe: 'Remember me',
  forgotPassword: 'Forgot password?',
  resetPassword: 'Reset password',
  signUp: 'Sign up',
  welcome: 'Welcome',
  loginSuccess: 'Logged in successfully',
  loginError: 'Invalid credentials',
  logoutSuccess: 'Logged out successfully',
} as const;

export const dashboard = {
  title: 'Dashboard',
  overview: 'Overview',
  todaySales: "Today's Sales",
  totalProducts: 'Total Products',
  lowStock: 'Low Stock',
  recentTransactions: 'Recent Transactions',
  revenue: 'Revenue',
  orders: 'Orders',
  customers: 'Customers',
} as const;

export const products = {
  title: 'Products',
  addProduct: 'Add Product',
  editProduct: 'Edit Product',
  deleteProduct: 'Delete Product',
  productDetails: 'Product Details',
  sku: 'SKU',
  barcode: 'Barcode',
  name: 'Name',
  nameAr: 'Name (Arabic)',
  description: 'Description',
  descriptionAr: 'Description (Arabic)',
  category: 'Category',
  price: 'Price',
  cost: 'Cost',
  quantity: 'Quantity',
  minQuantity: 'Minimum Quantity',
  status: 'Status',
  inStock: 'In Stock',
  outOfStock: 'Out of Stock',
  lowStock: 'Low Stock',
} as const;

export const categories = {
  title: 'Categories',
  addCategory: 'Add Category',
  editCategory: 'Edit Category',
  parentCategory: 'Parent Category',
  none: 'None',
} as const;

export const inventory = {
  title: 'Inventory',
  stockLevel: 'Stock Level',
  adjustStock: 'Adjust Stock',
  stockAdjustment: 'Stock Adjustment',
  currentStock: 'Current Stock',
  newStock: 'New Stock',
  reason: 'Reason',
  lastUpdated: 'Last Updated',
  location: 'Location',
} as const;

export const sales = {
  title: 'Sales',
  newSale: 'New Sale',
  completeSale: 'Complete Sale',
  subtotal: 'Subtotal',
  discount: 'Discount',
  tax: 'Tax',
  total: 'Total',
  payment: 'Payment',
  paymentMethod: 'Payment Method',
  change: 'Change',
  receipt: 'Receipt',
  printReceipt: 'Print Receipt',
  cash: 'Cash',
  card: 'Card',
  credit: 'Credit',
} as const;

export const settings = {
  title: 'Settings',
  general: 'General',
  language: 'Language',
  theme: 'Theme',
  lightMode: 'Light Mode',
  darkMode: 'Dark Mode',
  english: 'English',
  arabic: 'Arabic',
  pharmacy: 'Pharmacy',
  pharmacyName: 'Pharmacy Name',
  address: 'Address',
  phone: 'Phone',
  email: 'Email',
  taxRate: 'Tax Rate',
  currency: 'Currency',
} as const;

export const en = {
  common,
  auth,
  dashboard,
  products,
  categories,
  inventory,
  sales,
  settings,
} as const;

export type Translations = typeof en;
