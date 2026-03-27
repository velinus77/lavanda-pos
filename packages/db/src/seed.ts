#!/usr/bin/env tsx
/**
 * Seed script for Lavanda Pharmacy POS
 * Creates default roles, admin user, initial settings, and sample pharmacy data
 */

import { getDb, closeDb } from './db';
import * as schema from './schema/index';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

// Utility to generate UUIDs
function generateId(): string {
  return randomBytes(16).toString('hex');
}

// Utility to hash passwords using bcrypt
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Helper to calculate days from now
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// Helper to calculate days ago
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function seed() {
  const db = getDb();
  
  console.log('🌱 Starting database seeding...\n');
  
  try {
    // ============== SEED ROLES ==============
    console.log('📋 Seeding roles...');
    
    const roles = [
      {
        id: 'role_admin',
        name: 'admin',
        description: 'Full system access - manage users, settings, inventory, and sales',
        permissions: [
          'users:read', 'users:write', 'users:delete',
          'roles:read', 'roles:write',
          'products:read', 'products:write', 'products:delete',
          'inventory:read', 'inventory:write',
          'sales:read', 'sales:write', 'sales:refund',
          'reports:read', 'reports:write',
          'settings:read', 'settings:write',
          'audit:read',
          'sync:manage',
        ],
      },
      {
        id: 'role_manager',
        name: 'manager',
        description: 'Manage inventory, sales, and reports - no user management',
        permissions: [
          'products:read', 'products:write',
          'inventory:read', 'inventory:write',
          'sales:read', 'sales:write', 'sales:refund',
          'reports:read',
          'settings:read',
          'audit:read',
        ],
      },
      {
        id: 'role_cashier',
        name: 'cashier',
        description: 'Process sales and view basic inventory',
        permissions: [
          'products:read',
          'inventory:read',
          'sales:read', 'sales:write',
        ],
      },
    ];
    
    for (const role of roles) {
      const existing = await db.query.roles.findFirst({
        where: eq(schema.roles.name, role.name),
      });
      
      if (!existing) {
        await db.insert(schema.roles).values(role);
        console.log(`  ✓ Created role: ${role.name}`);
      } else {
        console.log(`  • Role exists: ${role.name}`);
      }
    }
    
    // ============== SEED ADMIN USER ==============
    console.log('\n👤 Seeding admin user...');
    
    const adminExists = await db.query.users.findFirst({
      where: eq(schema.users.username, 'admin'),
    });
    
    if (!adminExists) {
      await db.insert(schema.users).values({
        id: generateId(),
        username: 'admin',
        email: 'admin@lavanda-pos.localhost',
        passwordHash: await hashPassword('admin123'), // Default password - change immediately!
        fullName: 'System Administrator',
        roleId: 'role_admin',
        isActive: true,
      });
      console.log('  ✓ Created admin user');
      console.log('  ⚠️  Default credentials: admin / admin123');
      console.log('  ⚠️  Change password immediately in production!');
    } else {
      console.log('  • Admin user exists');
    }
    
    // ============== SEED CATEGORIES ==============
    console.log('\n📂 Seeding pharmacy categories...');
    
    const categories = [
      { id: 'cat_medications', name: 'Medications', nameAr: 'أدوية', description: 'Prescription and over-the-counter medications' },
      { id: 'cat_vitamins', name: 'Vitamins & Supplements', nameAr: 'فيتامينات ومكملات', description: 'Vitamins, minerals, and dietary supplements' },
      { id: 'cat_first_aid', name: 'First Aid', nameAr: 'الإسعافات الأولية', description: 'Bandages, antiseptics, and first aid supplies' },
      { id: 'cat_skincare', name: 'Skincare', nameAr: 'العناية بالبشرة', description: 'Skincare products and dermatological items' },
      { id: 'cat_baby_care', name: 'Baby Care', nameAr: 'العناية بالطفل', description: 'Baby products, diapers, and infant care' },
      { id: 'cat_personal_hygiene', name: 'Personal Hygiene', nameAr: 'النظافة الشخصية', description: 'Personal care and hygiene products' },
      { id: 'cat_medical_devices', name: 'Medical Devices', nameAr: 'الأجهزة الطبية', description: 'Medical equipment and devices' },
      { id: 'cat_antibiotics', name: 'Antibiotics', nameAr: 'مضادات حيوية', description: 'Antibiotic medications (prescription required)' },
      { id: 'cat_pain_relief', name: 'Pain Relief', nameAr: 'مسكنات الألم', description: 'Pain relievers and anti-inflammatory medications' },
      { id: 'cat_chronic_diseases', name: 'Chronic Diseases', nameAr: 'الأمراض المزمنة', description: 'Medications for diabetes, hypertension, etc.' },
    ];
    
    for (const category of categories) {
      const existing = await db.query.categories.findFirst({
        where: eq(schema.categories.id, category.id),
      });
      
      if (!existing) {
        await db.insert(schema.categories).values({
          id: category.id,
          name: category.name,
          nameAr: category.nameAr,
          description: category.description,
          isActive: true,
        });
        console.log(`  ✓ Created category: ${category.name} (${category.nameAr})`);
      } else {
        console.log(`  • Category exists: ${category.name}`);
      }
    }
    
    // ============== SEED SUPPLIERS ==============
    console.log('\n🚚 Seeding Egyptian pharmaceutical suppliers...');
    
    const suppliers = [
      {
        id: 'sup_epico',
        name: 'EPICO Pharmaceutical Industries',
        nameAr: 'شركة اپيكو للصناعات الدوائية',
        contactName: 'Ahmed Hassan',
        email: 'sales@epico-egypt.com',
        phone: '+20 2 2691 0000',
        address: '10th of Ramadan City, Sharkia Governorate',
        addressAr: 'مدينة العاشر من رمضان، محافظة الشرقية',
        taxId: '123-456-789',
        notes: 'Major Egyptian pharmaceutical manufacturer',
      },
      {
        id: 'sup_amriya',
        name: 'Amriya Pharmaceutical Industries',
        nameAr: 'شركة عامرية للصناعات الدوائية',
        contactName: 'Mohamed Abdel-Rahman',
        email: 'info@amriyapharma.com',
        phone: '+20 3 4599 000',
        address: 'Alexandria-Cairo Desert Road, Alexandria',
        addressAr: 'طريق الإسكندرية - القاهرة الصحراوي، الإسكندرية',
        taxId: '234-567-890',
        notes: 'Leading generic medications supplier',
      },
      {
        id: 'sup_phrasco',
        name: 'Pharcopharm (Pharco Pharmaceuticals)',
        nameAr: 'شركة فاركو للأدوية',
        contactName: 'Sarah Ibrahim',
        email: 'orders@pharcopharm.com',
        phone: '+20 3 5696 000',
        address: 'Cleopatra, Alexandria',
        addressAr: 'كليوباترا، الإسكندرية',
        taxId: '345-678-901',
        notes: 'One of the largest pharmaceutical companies in Egypt',
      },
      {
        id: 'sup_sedico',
        name: 'Sedico Pharmaceutical',
        nameAr: 'شركة صديكو للأدوية',
        contactName: 'Karim Mahmoud',
        email: 'sales@sedico-egypt.com',
        phone: '+20 2 3835 4000',
        address: 'Obour City, Qalyubia',
        addressAr: 'مدينة العبور، القليوبية',
        taxId: '456-789-012',
        notes: 'Specializes in chronic disease medications',
      },
      {
        id: 'sup_merck',
        name: 'Merck Sharp & Dohme Egypt',
        nameAr: 'شركة ميرك شارب ودوم مصر',
        contactName: 'Nadia Samir',
        email: 'egypt@merck.com',
        phone: '+20 2 3303 5000',
        address: 'Maadi, Cairo',
        addressAr: 'المعادي، القاهرة',
        taxId: '567-890-123',
        notes: 'International pharmaceutical company - Egyptian branch',
      },
      {
        id: 'sup_gsk',
        name: 'GlaxoSmithKline Egypt',
        nameAr: 'شركة جلاكسو سميث كلاين مصر',
        contactName: 'Tarek Fouad',
        email: 'contact.egypt@gsk.com',
        phone: '+20 2 3851 9900',
        address: '6th of October City, Giza',
        addressAr: 'مدينة السادس من أكتوبر، الجيزة',
        taxId: '678-901-234',
        notes: 'Global pharmaceuticals - vaccines and respiratory focus',
      },
      {
        id: 'sup_nile',
        name: 'Nile Pharmaceutical',
        nameAr: 'شركة النيل للأدوية',
        contactName: 'Hassan Ali',
        email: 'info@nilepharma.com',
        phone: '+20 2 2456 7890',
        address: 'Cairo Industrial Zone',
        addressAr: 'المنطقة الصناعية، القاهرة',
        taxId: '789-012-345',
        notes: 'Local distributor for imported medications',
      },
      {
        id: 'sup_redsea',
        name: 'Red Sea Medical Supplies',
        nameAr: 'شركة البحر الأحمر للإمدادات الطبية',
        contactName: 'OmarFarouk',
        email: 'sales@redseamedical.com',
        phone: '+20 65 3445 566',
        address: 'Industrial Zone, Hurghada, Red Sea',
        addressAr: 'المنطقة الصناعية، الغردقة، البحر الأحمر',
        taxId: '890-123-456',
        notes: 'Hurghada-based local supplier - fast delivery to Red Sea pharmacies',
      },
    ];
    
    for (const supplier of suppliers) {
      const existing = await db.query.suppliers.findFirst({
        where: eq(schema.suppliers.id, supplier.id),
      });
      
      if (!existing) {
        await db.insert(schema.suppliers).values({
          id: supplier.id,
          name: supplier.name,
          nameAr: supplier.nameAr,
          contactName: supplier.contactName,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          addressAr: supplier.addressAr,
          taxId: supplier.taxId,
          notes: supplier.notes,
          isActive: true,
        });
        console.log(`  ✓ Created supplier: ${supplier.name}`);
      } else {
        console.log(`  • Supplier exists: ${supplier.name}`);
      }
    }
    
    // ============== SEED PRODUCTS ==============
    console.log('\n💊 Seeding pharmacy products...');
    
    const products = [
      // Medications - Controlled substances
      {
        id: 'prod_panadol',
        name: 'Panadol Extra',
        nameAr: 'بانادول إكسترا',
        barcode: '6220012345670',
        categoryId: 'cat_pain_relief',
        supplierId: 'sup_gsk',
        costPrice: 25.00,
        sellingPrice: 35.00,
        minSellingPrice: 30.00,
        taxRate: 0,
        unit: 'box',
        minStockLevel: 20,
        maxStockLevel: 200,
        isControlled: false,
        description: 'Paracetamol + Caffeine for pain relief and fever',
        descriptionAr: 'باراسيتامول + كافيين لتسكين الألم وخفض الحرارة',
      },
      {
        id: 'prod_voltaren',
        name: 'Voltaren Emulgel 50g',
        nameAr: 'فولتارين جل 50 جم',
        barcode: '6220012345687',
        categoryId: 'cat_pain_relief',
        supplierId: 'sup_gsk',
        costPrice: 85.00,
        sellingPrice: 120.00,
        minSellingPrice: 100.00,
        taxRate: 0,
        unit: 'tube',
        minStockLevel: 10,
        maxStockLevel: 100,
        isControlled: false,
        description: 'Topical anti-inflammatory gel for muscle and joint pain',
        descriptionAr: 'جل مضاد للإلتهاب لآلام العضلات والمفاصل',
      },
      {
        id: 'prod_augmentin',
        name: 'Augmentin 1g',
        nameAr: 'أوجمنتين 1 جم',
        barcode: '6220012345694',
        categoryId: 'cat_antibiotics',
        supplierId: 'sup_gsk',
        costPrice: 45.00,
        sellingPrice: 65.00,
        minSellingPrice: 55.00,
        taxRate: 0,
        unit: 'box',
        minStockLevel: 15,
        maxStockLevel: 150,
        isControlled: true,
        description: 'Amoxicillin + Clavulanic acid - Antibiotic (prescription required)',
        descriptionAr: 'أموكسيسيلين + حمض الكلافولانيك - مضاد حيوي (يحتاج روشتة)',
      },
      {
        id: 'prod_azithromycin',
        name: 'Azithromycin 500mg',
        nameAr: 'أزيثروميسين 500 مجم',
        barcode: '6220012345700',
        categoryId: 'cat_antibiotics',
        supplierId: 'sup_epico',
        costPrice: 30.00,
        sellingPrice: 48.00,
        minSellingPrice: 40.00,
        taxRate: 0,
        unit: 'box',
        minStockLevel: 20,
        maxStockLevel: 200,
        isControlled: true,
        description: 'Macrolide antibiotic for bacterial infections',
        descriptionAr: 'مضاد حيوي ماكروليد للعدوى البكتيرية',
      },
      {
        id: 'prod_diamicro',
        name: 'Diamicron MR 60mg',
        nameAr: 'دياميكرون إم آر 60 مجم',
        barcode: '6220012345717',
        categoryId: 'cat_chronic_diseases',
        supplierId: 'sup_sedico',
        costPrice: 55.00,
        sellingPrice: 78.00,
        minSellingPrice: 65.00,
        taxRate: 0,
        unit: 'box',
        minStockLevel: 25,
        maxStockLevel: 250,
        isControlled: false,
        description: 'Gliclazide for type 2 diabetes management',
        descriptionAr: 'جليكلازيد لإدارة مرض السكري من النوع الثاني',
      },
      {
        id: 'prod_coveram',
        name: 'Coveram 5mg/10mg',
        nameAr: 'كوفيرام 5 مجم/10 مجم',
        barcode: '6220012345724',
        categoryId: 'cat_chronic_diseases',
        supplierId: 'sup_phrasco',
        costPrice: 65.00,
        sellingPrice: 92.00,
        minSellingPrice: 80.00,
        taxRate: 0,
        unit: 'box',
        minStockLevel: 20,
        maxStockLevel: 180,
        isControlled: false,
        description: 'Perindopril + Amlodipine for hypertension',
        descriptionAr: 'بيريندوبريل + أملوديبين لارتفاع ضغط الدم',
      },
      // Vitamins
      {
        id: 'prod_vitamin_d',
        name: 'Vitamin D3 50000 IU',
        nameAr: 'فيتامين د3 50000 وحدة',
        barcode: '6220012345731',
        categoryId: 'cat_vitamins',
        supplierId: 'sup_amriya',
        costPrice: 40.00,
        sellingPrice: 60.00,
        minSellingPrice: 50.00,
        taxRate: 0,
        unit: 'capsule',
        minStockLevel: 30,
        maxStockLevel: 300,
        isControlled: false,
        description: 'High dose Vitamin D3 for deficiency treatment',
        descriptionAr: 'جرعة عالية من فيتامين د3 لعلاج النقص',
      },
      {
        id: 'prod_becozinc',
        name: 'Beco-Zinc',
        nameAr: 'بيكو-زينك',
        barcode: '6220012345748',
        categoryId: 'cat_vitamins',
        supplierId: 'sup_phrasco',
        costPrice: 35.00,
        sellingPrice: 52.00,
        minSellingPrice: 45.00,
        taxRate: 0,
        unit: 'box',
        minStockLevel: 25,
        maxStockLevel: 250,
        isControlled: false,
        description: 'B-complex vitamins + Vitamin C + Zinc',
        descriptionAr: 'مجموعة فيتامينات ب + فيتامين ج + زنك',
      },
      // First Aid
      {
        id: 'prod_bandage',
        name: 'Sterile Bandage 5cm',
        nameAr: 'ضمادة معقمة 5 سم',
        barcode: '6220012345755',
        categoryId: 'cat_first_aid',
        supplierId: 'sup_redsea',
        costPrice: 8.00,
        sellingPrice: 15.00,
        minSellingPrice: 12.00,
        taxRate: 0,
        unit: 'roll',
        minStockLevel: 50,
        maxStockLevel: 500,
        isControlled: false,
        description: 'Sterile elastic bandage roll',
        descriptionAr: 'لفة ضمادة مرنة معقمة',
      },
      {
        id: 'prod_betadine',
        name: 'Betadine Solution 30ml',
        nameAr: 'محلول بيتادين 30 مل',
        barcode: '6220012345762',
        categoryId: 'cat_first_aid',
        supplierId: 'sup_nile',
        costPrice: 22.00,
        sellingPrice: 35.00,
        minSellingPrice: 28.00,
        taxRate: 0,
        unit: 'bottle',
        minStockLevel: 30,
        maxStockLevel: 300,
        isControlled: false,
        description: 'Povidone-iodine antiseptic solution',
        descriptionAr: 'محلول مطهر بوفيدون-يود',
      },
      // Skincare
      {
        id: 'prod_cetaphil',
        name: 'Cetaphil Gentle Cleanser 236ml',
        nameAr: 'سيتافيل غسول لطيف 236 مل',
        barcode: '6220012345779',
        categoryId: 'cat_skincare',
        supplierId: 'sup_merck',
        costPrice: 180.00,
        sellingPrice: 250.00,
        minSellingPrice: 220.00,
        taxRate: 0,
        unit: 'bottle',
        minStockLevel: 15,
        maxStockLevel: 150,
        isControlled: false,
        description: 'Gentle facial cleanser for sensitive skin',
        descriptionAr: 'غسول وجه لطيف للبشرة الحساسة',
      },
      {
        id: 'prod_sunscreen',
        name: 'Nivea Sun SPF 50+',
        nameAr: 'نيفيا صن SPF 50+',
        barcode: '6220012345786',
        categoryId: 'cat_skincare',
        supplierId: 'sup_merck',
        costPrice: 95.00,
        sellingPrice: 140.00,
        minSellingPrice: 120.00,
        taxRate: 0,
        unit: 'tube',
        minStockLevel: 20,
        maxStockLevel: 200,
        isControlled: false,
        description: 'High protection sunscreen for Hurghada sun',
        descriptionAr: 'واقي شمس عالي الحماية لشمس الغردقة',
      },
      // Baby Care
      {
        id: 'prod_diapers_s',
        name: 'Pampers Diapers Size S',
        nameAr: 'بامبرز حفاضات حجم صغير',
        barcode: '6220012345793',
        categoryId: 'cat_baby_care',
        supplierId: 'sup_redsea',
        costPrice: 85.00,
        sellingPrice: 120.00,
        minSellingPrice: 100.00,
        taxRate: 0,
        unit: 'pack',
        minStockLevel: 30,
        maxStockLevel: 300,
        isControlled: false,
        description: 'Baby diapers size small (3-6kg)',
        descriptionAr: 'حفاضات أطفال حجم صغير (3-6 كجم)',
      },
      {
        id: 'prod_baby_oil',
        name: 'Johnson\'s Baby Oil 200ml',
        nameAr: 'جونسون زيت أطفال 200 مل',
        barcode: '6220012345809',
        categoryId: 'cat_baby_care',
        supplierId: 'sup_nile',
        costPrice: 45.00,
        sellingPrice: 68.00,
        minSellingPrice: 58.00,
        taxRate: 0,
        unit: 'bottle',
        minStockLevel: 25,
        maxStockLevel: 250,
        isControlled: false,
        description: 'Gentle baby oil for massage and moisturizing',
        descriptionAr: 'زيت أطفال لطيف للتدليك والترطيب',
      },
      // Personal Hygiene
      {
        id: 'prod_toothbrush',
        name: 'Oral-B Toothbrush Soft',
        nameAr: 'أورال-بي فرشاة أسنان ناعمة',
        barcode: '6220012345816',
        categoryId: 'cat_personal_hygiene',
        supplierId: 'sup_redsea',
        costPrice: 25.00,
        sellingPrice: 40.00,
        minSellingPrice: 35.00,
        taxRate: 0,
        unit: 'piece',
        minStockLevel: 40,
        maxStockLevel: 400,
        isControlled: false,
        description: 'Soft bristle toothbrush',
        descriptionAr: 'فرشاة أسنان بشعيرات ناعمة',
      },
      // Medical Devices
      {
        id: 'prod_thermometer',
        name: 'Digital Thermometer',
        nameAr: 'تيرمومتر رقمي',
        barcode: '6220012345823',
        categoryId: 'cat_medical_devices',
        supplierId: 'sup_redsea',
        costPrice: 60.00,
        sellingPrice: 95.00,
        minSellingPrice: 80.00,
        taxRate: 0,
        unit: 'piece',
        minStockLevel: 15,
        maxStockLevel: 150,
        isControlled: false,
        description: 'Digital thermometer with LCD display',
        descriptionAr: 'تيرمومتر رقمي بشاشة LCD',
      },
      {
        id: 'prod_bp_monitor',
        name: 'Omron BP Monitor',
        nameAr: 'جهاز قياس ضغط أومرون',
        barcode: '6220012345830',
        categoryId: 'cat_medical_devices',
        supplierId: 'sup_phrasco',
        costPrice: 450.00,
        sellingPrice: 650.00,
        minSellingPrice: 580.00,
        taxRate: 0,
        unit: 'piece',
        minStockLevel: 5,
        maxStockLevel: 50,
        isControlled: false,
        description: 'Automatic blood pressure monitor',
        descriptionAr: 'جهاز قياس ضغط الدم تلقائي',
      },
      // Pain Relief
      {
        id: 'prod_nurofen',
        name: 'Nurofen 400mg',
        nameAr: 'نوروفين 400 مجم',
        barcode: '6220012345847',
        categoryId: 'cat_pain_relief',
        supplierId: 'sup_phrasco',
        costPrice: 28.00,
        sellingPrice: 42.00,
        minSellingPrice: 36.00,
        taxRate: 0,
        unit: 'box',
        minStockLevel: 30,
        maxStockLevel: 300,
        isControlled: false,
        description: 'Ibuprofen 400mg for pain and inflammation',
        descriptionAr: 'إيبوبروفين 400 مجم للألم والالتهاب',
      },
      {
        id: 'prod_catafast',
        name: 'Catafast 50mg',
        nameAr: 'كاتافاست 50 مجم',
        barcode: '6220012345854',
        categoryId: 'cat_pain_relief',
        supplierId: 'sup_phrasco',
        costPrice: 32.00,
        sellingPrice: 48.00,
        minSellingPrice: 42.00,
        taxRate: 0,
        unit: 'sachet',
        minStockLevel: 25,
        maxStockLevel: 250,
        isControlled: false,
        description: 'Diclofenac potassium fast-acting pain relief',
        descriptionAr: 'ديكلوفيناك بوتاسيوم تسكين سريع للألم',
      },
      // Antibiotics - More
      {
        id: 'prod_cipro',
        name: 'Ciprocin 500mg',
        nameAr: 'سيبروسين 500 مجم',
        barcode: '6220012345861',
        categoryId: 'cat_antibiotics',
        supplierId: 'sup_epico',
        costPrice: 25.00,
        sellingPrice: 38.00,
        minSellingPrice: 32.00,
        taxRate: 0,
        unit: 'box',
        minStockLevel: 20,
        maxStockLevel: 200,
        isControlled: true,
        description: 'Ciprofloxacin antibiotic (prescription required)',
        descriptionAr: 'مضاد حيوي سيبروفلوكساسين (يحتاج روشتة)',
      },
    ];
    
    // Store product IDs for batch creation
    const productIds: Record<string, string> = {};
    
    for (const product of products) {
      const existing = await db.query.products.findFirst({
        where: eq(schema.products.id, product.id),
      });
      
      if (!existing) {
        await db.insert(schema.products).values({
          id: product.id,
          name: product.name,
          nameAr: product.nameAr,
          barcode: product.barcode,
          description: product.description,
          categoryId: product.categoryId,
          supplierId: product.supplierId,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          minSellingPrice: product.minSellingPrice,
          taxRate: product.taxRate,
          unit: product.unit,
          minStockLevel: product.minStockLevel,
          maxStockLevel: product.maxStockLevel,
          isActive: true,
          isControlled: product.isControlled,
        });
        productIds[product.id] = product.id;
        console.log(`  ✓ Created product: ${product.name} (${product.nameAr}) - EGP ${product.sellingPrice}`);
      } else {
        productIds[product.id] = product.id;
        console.log(`  • Product exists: ${product.name}`);
      }
    }
    
    // ============== SEED PRODUCT BATCHES ==============
    console.log('\n📦 Seeding product batches with varied expiry dates...');
    
    // Calculate dates for varied expiry scenarios
    const today = new Date();
    
    // Helper to format date for SQLite (ISO string)
    const formatDate = (date: Date): string => date.toISOString();
    
    const batches = [
      // Panadol batches - mix of expiry dates
      {
        id: 'batch_panadol_1',
        productId: 'prod_panadol',
        batchNumber: 'PAN-2024-001',
        costPrice: 24.00,
        initialQuantity: 100,
        currentQuantity: 75,
        expiryDate: daysFromNow(365), // Valid - 1 year
        supplierId: 'sup_gsk',
      },
      {
        id: 'batch_panadol_2',
        productId: 'prod_panadol',
        batchNumber: 'PAN-2024-002',
        costPrice: 24.50,
        initialQuantity: 100,
        currentQuantity: 90,
        expiryDate: daysFromNow(180), // Valid - 6 months
        supplierId: 'sup_gsk',
      },
      {
        id: 'batch_panadol_3',
        productId: 'prod_panadol',
        batchNumber: 'PAN-2023-015',
        costPrice: 23.00,
        initialQuantity: 50,
        currentQuantity: 12,
        expiryDate: daysFromNow(20), // Expiring soon - 20 days
        supplierId: 'sup_gsk',
      },
      // Augmentin batches
      {
        id: 'batch_augmentin_1',
        productId: 'prod_augmentin',
        batchNumber: 'AUG-2024-003',
        costPrice: 44.00,
        initialQuantity: 80,
        currentQuantity: 65,
        expiryDate: daysFromNow(400), // Valid - over 1 year
        supplierId: 'sup_gsk',
      },
      {
        id: 'batch_augmentin_2',
        productId: 'prod_augmentin',
        batchNumber: 'AUG-2023-018',
        costPrice: 42.00,
        initialQuantity: 60,
        currentQuantity: 8,
        expiryDate: daysFromNow(-15), // EXPIRED - 15 days ago
        supplierId: 'sup_gsk',
      },
      // Azithromycin batches
      {
        id: 'batch_azithro_1',
        productId: 'prod_azithromycin',
        batchNumber: 'AZI-2024-001',
        costPrice: 29.00,
        initialQuantity: 150,
        currentQuantity: 120,
        expiryDate: daysFromNow(270), // Valid - 9 months
        supplierId: 'sup_epico',
      },
      {
        id: 'batch_azithro_2',
        productId: 'prod_azithromycin',
        batchNumber: 'AZI-2023-022',
        costPrice: 28.00,
        initialQuantity: 100,
        currentQuantity: 5,
        expiryDate: daysFromNow(-30), // EXPIRED - 30 days ago
        supplierId: 'sup_epico',
      },
      // Diamicron batches (Chronic disease - needs consistent stock)
      {
        id: 'batch_diamicro_1',
        productId: 'prod_diamicro',
        batchNumber: 'DIA-2024-005',
        costPrice: 54.00,
        initialQuantity: 120,
        currentQuantity: 95,
        expiryDate: daysFromNow(450), // Valid - over 1 year
        supplierId: 'sup_sedico',
      },
      {
        id: 'batch_diamicro_2',
        productId: 'prod_diamicro',
        batchNumber: 'DIA-2024-002',
        costPrice: 53.00,
        initialQuantity: 100,
        currentQuantity: 40,
        expiryDate: daysFromNow(25), // Expiring soon - 25 days
        supplierId: 'sup_sedico',
      },
      // Coveram batches
      {
        id: 'batch_coveram_1',
        productId: 'prod_coveram',
        batchNumber: 'COV-2024-003',
        costPrice: 64.00,
        initialQuantity: 90,
        currentQuantity: 70,
        expiryDate: daysFromNow(380), // Valid
        supplierId: 'sup_phrasco',
      },
      // Vitamin D batches
      {
        id: 'batch_vitd_1',
        productId: 'prod_vitamin_d',
        batchNumber: 'VTD-2024-001',
        costPrice: 38.00,
        initialQuantity: 200,
        currentQuantity: 150,
        expiryDate: daysFromNow(540), // Valid - 18 months
        supplierId: 'sup_amriya',
      },
      {
        id: 'batch_vitd_2',
        productId: 'prod_vitamin_d',
        batchNumber: 'VTD-2023-012',
        costPrice: 36.00,
        initialQuantity: 150,
        currentQuantity: 22,
        expiryDate: daysFromNow(10), // Expiring soon - 10 days
        supplierId: 'sup_amriya',
      },
      // Becozinc batches
      {
        id: 'batch_becozinc_1',
        productId: 'prod_becozinc',
        batchNumber: 'BCZ-2024-002',
        costPrice: 34.00,
        initialQuantity: 150,
        currentQuantity: 100,
        expiryDate: daysFromNow(300), // Valid
        supplierId: 'sup_phrasco',
      },
      // Betadine batches
      {
        id: 'batch_betadine_1',
        productId: 'prod_betadine',
        batchNumber: 'BET-2024-001',
        costPrice: 20.00,
        initialQuantity: 100,
        currentQuantity: 80,
        expiryDate: daysFromNow(730), // Valid - 2 years
        supplierId: 'sup_nile',
      },
      // Cetaphil batches
      {
        id: 'batch_cetaphil_1',
        productId: 'prod_cetaphil',
        batchNumber: 'CET-2024-A1',
        costPrice: 175.00,
        initialQuantity: 50,
        currentQuantity: 35,
        expiryDate: daysFromNow(600), // Valid - cosmetics have longer shelf life
        supplierId: 'sup_merck',
      },
      // Sunscreen batches (important for Hurghada!)
      {
        id: 'batch_sunscreen_1',
        productId: 'prod_sunscreen',
        batchNumber: 'SUN-2024-002',
        costPrice: 92.00,
        initialQuantity: 100,
        currentQuantity: 85,
        expiryDate: daysFromNow(450), // Valid
        supplierId: 'sup_merck',
      },
      {
        id: 'batch_sunscreen_2',
        productId: 'prod_sunscreen',
        batchNumber: 'SUN-2023-008',
        costPrice: 88.00,
        initialQuantity: 60,
        currentQuantity: 18,
        expiryDate: daysFromNow(-7), // EXPIRED - 1 week ago
        supplierId: 'sup_merck',
      },
      // Diapers batches
      {
        id: 'batch_diapers_1',
        productId: 'prod_diapers_s',
        batchNumber: 'DIA-S-2024-01',
        costPrice: 82.00,
        initialQuantity: 200,
        currentQuantity: 165,
        expiryDate: daysFromNow(1095), // Valid - 3 years (non-medical)
        supplierId: 'sup_redsea',
      },
      // Nurofen batches
      {
        id: 'batch_nurofen_1',
        productId: 'prod_nurofen',
        batchNumber: 'NUR-2024-003',
        costPrice: 27.00,
        initialQuantity: 150,
        currentQuantity: 110,
        expiryDate: daysFromNow(400),
        supplierId: 'sup_phrasco',
      },
      {
        id: 'batch_nurofen_2',
        productId: 'prod_nurofen',
        batchNumber: 'NUR-2023-020',
        costPrice: 26.00,
        initialQuantity: 100,
        currentQuantity: 15,
        expiryDate: daysFromNow(28), // Expiring soon - 28 days
        supplierId: 'sup_phrasco',
      },
      // Ciprocin batches
      {
        id: 'batch_cipro_1',
        productId: 'prod_cipro',
        batchNumber: 'CIP-2024-002',
        costPrice: 24.00,
        initialQuantity: 120,
        currentQuantity: 90,
        expiryDate: daysFromNow(320),
        supplierId: 'sup_epico',
      },
      {
        id: 'batch_cipro_2',
        productId: 'prod_cipro',
        batchNumber: 'CIP-2023-016',
        costPrice: 23.00,
        initialQuantity: 80,
        currentQuantity: 3,
        expiryDate: daysFromNow(-45), // EXPIRED - 45 days ago
        supplierId: 'sup_epico',
      },
    ];
    
    for (const batch of batches) {
      const existing = await db.query.productBatches.findFirst({
        where: eq(schema.productBatches.id, batch.id),
      });
      
      if (!existing) {
        await db.insert(schema.productBatches).values({
          id: batch.id,
          productId: batch.productId,
          batchNumber: batch.batchNumber,
          costPrice: batch.costPrice,
          initialQuantity: batch.initialQuantity,
          currentQuantity: batch.currentQuantity,
          expiryDate: batch.expiryDate,
          supplierId: batch.supplierId,
          isActive: true,
        });
        
        // Calculate days until expiry for display
        const daysUntilExpiry = Math.round((batch.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let status = 'Valid';
        if (daysUntilExpiry < 0) status = 'EXPIRED';
        else if (daysUntilExpiry < 30) status = 'Expiring Soon';
        
        console.log(`  ✓ Created batch: ${batch.batchNumber} -> ${batch.currentQuantity} units - ${status} (${daysUntilExpiry} days)`);
      } else {
        console.log(`  • Batch exists: ${batch.batchNumber}`);
      }
    }
    
    // ============== SEED APP SETTINGS ==============
    console.log('\n⚙️  Seeding app settings...');
    
    const settings = [
      // General settings
      {
        key: 'app.name',
        value: JSON.stringify('Lavanda Pharmacy POS'),
        description: 'Application name displayed in UI',
        category: 'general',
        isPublic: true,
      },
      {
        key: 'app.timezone',
        value: JSON.stringify('Africa/Cairo'),
        description: 'System timezone',
        category: 'general',
        isPublic: true,
      },
      {
        key: 'app.locale',
        value: JSON.stringify('en'),
        description: 'Default language (en, ar)',
        category: 'general',
        isPublic: true,
      },
      
      // Currency settings
      {
        key: 'currency.base',
        value: JSON.stringify('EGP'),
        description: 'Base currency for all pricing',
        category: 'currency',
        isPublic: true,
      },
      {
        key: 'currency.allowed',
        value: JSON.stringify(['EGP', 'USD', 'EUR', 'GBP']),
        description: 'Allowed checkout currencies',
        category: 'currency',
        isPublic: true,
      },
      {
        key: 'currency.decimal_places',
        value: JSON.stringify(2),
        description: 'Decimal places for currency display',
        category: 'currency',
        isPublic: true,
      },
      
      // Tax settings
      {
        key: 'tax.enabled',
        value: JSON.stringify(true),
        description: 'Enable tax calculations',
        category: 'tax',
        isPublic: false,
      },
      {
        key: 'tax.default_rate',
        value: JSON.stringify(0.14),
        description: 'Default tax rate (14% for Egypt)',
        category: 'tax',
        isPublic: false,
      },
      {
        key: 'tax.inclusive',
        value: JSON.stringify(false),
        description: 'Are prices tax-inclusive by default',
        category: 'tax',
        isPublic: false,
      },
      
      // Inventory settings
      {
        key: 'inventory.fifo_enabled',
        value: JSON.stringify(false),
        description: 'Enable FIFO batch deduction',
        category: 'inventory',
        isPublic: false,
      },
      {
        key: 'inventory.fefo_enabled',
        value: JSON.stringify(true),
        description: 'Enable FEFO batch deduction (First Expired, First Out)',
        category: 'inventory',
        isPublic: false,
      },
      {
        key: 'inventory.track_expiry',
        value: JSON.stringify(true),
        description: 'Track batch expiry dates',
        category: 'inventory',
        isPublic: false,
      },
      {
        key: 'inventory.warn_before_expiry_days',
        value: JSON.stringify(30),
        description: 'Warn when products expire within N days',
        category: 'inventory',
        isPublic: false,
      },
      {
        key: 'inventory.allow_negative_stock',
        value: JSON.stringify(false),
        description: 'Allow sales when stock is zero',
        category: 'inventory',
        isPublic: false,
      },
      
      // POS settings
      {
        key: 'pos.receipt_prefix',
        value: JSON.stringify('REC'),
        description: 'Receipt number prefix',
        category: 'pos',
        isPublic: false,
      },
      {
        key: 'pos.receipt_digits',
        value: JSON.stringify(6),
        description: 'Receipt number digit count',
        category: 'pos',
        isPublic: false,
      },
      {
        key: 'pos.allow_price_override',
        value: JSON.stringify(true),
        description: 'Allow cashiers to override prices',
        category: 'pos',
        isPublic: false,
      },
      {
        key: 'pos.require_price_override_reason',
        value: JSON.stringify(true),
        description: 'Require reason for price overrides',
        category: 'pos',
        isPublic: false,
      },
      {
        key: 'pos.allow_discounts',
        value: JSON.stringify(true),
        description: 'Allow discounts on sales',
        category: 'pos',
        isPublic: false,
      },
      {
        key: 'pos.max_discount_percent',
        value: JSON.stringify(20),
        description: 'Maximum discount percentage without approval',
        category: 'pos',
        isPublic: false,
      },
      
      // Sync settings
      {
        key: 'sync.enabled',
        value: JSON.stringify(false),
        description: 'Enable cloud sync (future feature)',
        category: 'sync',
        isPublic: false,
      },
      {
        key: 'sync.auto_retry',
        value: JSON.stringify(true),
        description: 'Automatically retry failed sync operations',
        category: 'sync',
        isPublic: false,
      },
      {
        key: 'sync.max_retries',
        value: JSON.stringify(3),
        description: 'Maximum sync retry attempts',
        category: 'sync',
        isPublic: false,
      },
    ];
    
    for (const setting of settings) {
      const existing = await db.query.appSettings.findFirst({
        where: eq(schema.appSettings.key, setting.key),
      });
      
      if (!existing) {
        await db.insert(schema.appSettings).values({
          id: generateId(),
          ...setting,
        });
        console.log(`  ✓ Created setting: ${setting.key}`);
      } else {
        console.log(`  • Setting exists: ${setting.key}`);
      }
    }
    
    // ============== SEED INITIAL EXCHANGE RATES ==============
    console.log('\n💱 Seeding exchange rates...');
    
    const rates = [
      { currency: 'USD', rate: 49.50 }, // Example rate
      { currency: 'EUR', rate: 53.80 },
      { currency: 'GBP', rate: 62.50 },
    ];
    
    for (const rate of rates) {
      const existing = await db.query.exchangeRates.findFirst({
        where: eq(schema.exchangeRates.currency, rate.currency),
      });
      
      if (!existing) {
        await db.insert(schema.exchangeRates).values({
          id: generateId(),
          ...rate,
          source: 'manual',
          isValid: true,
          validFrom: new Date(),
        });
        console.log(`  ✓ Created rate: 1 ${rate.currency} = ${rate.rate} EGP`);
      } else {
        console.log(`  • Rate exists: ${rate.currency}`);
      }
    }
    
    // ============== SUMMARY ==============
    console.log('\n' + '='.repeat(60));
    console.log('✅ Seeding completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   • ${categories.length} categories created`);
    console.log(`   • ${suppliers.length} suppliers created`);
    console.log(`   • ${products.length} products created`);
    console.log(`   • ${batches.length} product batches created`);
    console.log('\n⚠️  Batch Expiry Status:');
    console.log(`   • Expired batches: ${batches.filter(b => b.expiryDate < today).length}`);
    console.log(`   • Expiring soon (<30 days): ${batches.filter(b => b.expiryDate >= today && b.expiryDate <= daysFromNow(30)).length}`);
    console.log(`   • Valid batches: ${batches.filter(b => b.expiryDate > daysFromNow(30)).length}`);
    console.log('\n🏥 Hurghada Pharmacy Sample Data Ready!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  } finally {
    closeDb();
  }
}

// Run seed
seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
