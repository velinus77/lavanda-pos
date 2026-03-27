import { FastifyInstance } from 'fastify';
import { db } from '@lavanda/db';

export interface AuditEntry {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: object;
  ipAddress?: string;
}

export async function writeAuditLog(app: FastifyInstance, entry: AuditEntry): Promise<void> {
  try {
    await db.run(
      `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, ip_address, created_at)
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
               ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        entry.userId,
        entry.action,
        entry.entity,
        entry.entityId || null,
        JSON.stringify(entry.details || {}),
        entry.ipAddress || null,
      ]
    );
  } catch (err) {
    app.log.warn({ err }, 'Audit log write failed (non-fatal)');
  }
}
