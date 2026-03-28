import { FastifyInstance } from 'fastify';
import { getRawClient } from '@lavanda/db';

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
    const sqlite = getRawClient();
    sqlite.prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_value, ip_address, status, created_at)
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
               ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      entry.userId,
      entry.action,
      entry.entity,
      entry.entityId || null,
      JSON.stringify(entry.details || {}),
      entry.ipAddress || null
      ,
      'success'
    );
  } catch (err) {
    app.log.warn({ err }, 'Audit log write failed (non-fatal)');
  }
}
