import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../plugins/auth.js';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@lavanda-pos/db';
import { appSettings } from '@lavanda-pos/db/schema';

// Validation schemas
const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.any()).describe('Key-value pairs of settings to update')
});

// Valid setting categories
const SETTING_CATEGORIES = ['general', 'localized', 'financial', 'inventory'] as const;

// Default settings structure
const DEFAULT_SETTINGS = {
  // General settings
  'general.pharmacy_name': 'Lavanda Pharmacy',
  'general.timezone': 'Africa/Cairo',
  'general.currency': 'EGP',
  'general.language': 'en',
  
  // Localized names
  'localized.pharmacy_name_ar': 'صيدلية لافندا',
  'localized.pharmacy_name_en': 'Lavanda Pharmacy',
  'localized.address_ar': '',
  'localized.address_en': '',
  'localized.phone': '',
  
  // Financial settings
  'financial.tax_rate': 0.14, // 14% VAT
  'financial.default_currency': 'EGP',
  'financial.accept_foreign_currency': true,
  'financial.foreign_currencies': ['USD', 'EUR', 'GBP'],
  
  // Inventory settings
  'inventory.low_stock_threshold': 10,
  'inventory.expiry_alert_days': 30,
  'inventory.fefo_enabled': true,
  'inventory.track_batch_cost': true,
  'inventory.auto_dispose_expired': false
};

/**
 * Initialize default settings if table is empty
 */
async function initializeDefaultSettings(): Promise<void> {
  try {
    const existingSettings = await db.select().from(appSettings).limit(1);
    
    if (existingSettings.length === 0) {
      const defaultEntries = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
        id: crypto.randomUUID(),
        key,
        value: JSON.stringify(value),
        category: key.split('.')[0] as string,
        description: `Default setting for ${key}`,
        isPublic: true,
        updatedAt: new Date()
      }));
      
      await db.insert(appSettings).values(defaultEntries);
    }
  } catch (error) {
    console.error('Error initializing default settings:', error);
  }
}

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize default settings on startup
  await initializeDefaultSettings();

  /**
   * GET /api/settings
   * Returns all settings grouped by category (general, localized, financial, inventory)
   * Requires authentication
   */
  fastify.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      // Fetch all settings from database
      const settingsList = await db.select().from(appSettings);
      
      // Group settings by category
      const groupedSettings: Record<string, Record<string, any>> = {
        general: {},
        localized: {},
        financial: {},
        inventory: {}
      };
      
      // Parse and organize settings
      settingsList.forEach((setting) => {
        const category = setting.category || 'general';
        const key = setting.key;
        
        try {
          const value = JSON.parse(setting.value as string);
          
          // Short key (without category prefix)
          const shortKey = key.replace(`${category}.`, '');
          
          if (groupedSettings[category]) {
            groupedSettings[category][shortKey] = value;
          }
        } catch (parseError) {
          // If parsing fails, store raw value
          if (category in groupedSettings) {
            const shortKey = key.replace(`${category}.`, '');
            groupedSettings[category][shortKey] = setting.value;
          }
        }
      });
      
      // Also return raw list for reference
      const rawSettings = settingsList.map((setting) => ({
        key: setting.key,
        value: JSON.parse(setting.value as string),
        category: setting.category,
        description: setting.description,
        updatedAt: setting.updatedAt
      }));
      
      return reply.code(200).send({
        success: true,
        settings: groupedSettings,
        raw: rawSettings
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Get settings error');
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve settings'
        }
      });
    }
  });

  /**
   * PUT /api/settings
   * Updates settings (admin only, bulk update)
   * Expects { settings: { "general.pharmacy_name": "New Name", ... } }
   * Role protection: requireRole('admin')
   */
  fastify.put('/', { preHandler: [requireAuth, requireRole('admin')] }, async (request, reply) => {
    try {
      // Validate request body
      const validatedData = updateSettingsSchema.parse(request.body);
      const { settings } = validatedData;
      
      const updatePromises = Object.entries(settings).map(async ([key, value]) => {
        const category = key.split('.')[0];
        
        // Validate category
        if (!SETTING_CATEGORIES.includes(category as any)) {
          throw new Error(`Invalid category: ${category}`);
        }
        
        // Update or insert setting
        const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
        
        if (existing.length > 0) {
          // Update existing setting
          return db.update(appSettings)
            .set({
              value: JSON.stringify(value),
              updatedAt: new Date(),
              updatedBy: request.user?.userId?.toString() || null
            })
            .where(eq(appSettings.key, key));
        } else {
          // Insert new setting
          return db.insert(appSettings).values({
            id: crypto.randomUUID(),
            key,
            value: JSON.stringify(value),
            category,
            description: `Setting for ${key}`,
            isPublic: false,
            updatedAt: new Date(),
            updatedBy: request.user?.userId?.toString() || null
          });
        }
      });
      
      await Promise.all(updatePromises);
      
      // Fetch updated settings to return
      const updatedSettingsList = await db.select().from(appSettings);
      
      // Group by category
      const groupedSettings: Record<string, Record<string, any>> = {
        general: {},
        localized: {},
        financial: {},
        inventory: {}
      };
      
      updatedSettingsList.forEach((setting) => {
        const category = setting.category || 'general';
        const key = setting.key;
        
        try {
          const value = JSON.parse(setting.value as string);
          const shortKey = key.replace(`${category}.`, '');
          
          if (groupedSettings[category]) {
            groupedSettings[category][shortKey] = value;
          }
        } catch (parseError) {
          if (category in groupedSettings) {
            const shortKey = key.replace(`${category}.`, '');
            groupedSettings[category][shortKey] = setting.value;
          }
        }
      });
      
      return reply.code(200).send({
        success: true,
        message: 'Settings updated successfully',
        settings: groupedSettings,
        updated_count: Object.keys(settings).length
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.errors.map((e: any) => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }
        });
      }
      
      fastify.log.error({ err: error }, 'Update settings error');
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update settings'
        }
      });
    }
  });
};
