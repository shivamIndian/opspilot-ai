import type { Pool, PoolClient } from 'pg';
import { pool } from '../../../database/index.js';

export class TicketCounterRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  /**
   * Concurrency-safe atomic increment of the organization-specific ticket counter.
   * Uses an atomic UPSERT that row-locks the counter for this organization.
   */
  async getNextTicketNumber(organizationId: string, client?: PoolClient): Promise<number> {
    const executor = client || this.db;
    const query = `
      INSERT INTO app.organization_ticket_counters (organization_id, last_ticket_number, updated_at)
      VALUES ($1, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (organization_id)
      DO UPDATE SET 
        last_ticket_number = app.organization_ticket_counters.last_ticket_number + 1,
        updated_at = CURRENT_TIMESTAMP
      RETURNING last_ticket_number;
    `;

    const result = await executor.query(query, [organizationId]);
    return parseInt(result.rows[0].last_ticket_number, 10);
  }

  /**
   * Formats a raw ticket number into a standardized human-readable identifier.
   * e.g., 1 -> 'TKT-000001', 42 -> 'TKT-000042'
   */
  formatTicketNumber(ticketNumber: number | string): string {
    const num = typeof ticketNumber === 'string' ? parseInt(ticketNumber, 10) : ticketNumber;
    return `TKT-${String(num).padStart(6, '0')}`;
  }
}

export const ticketCounterRepository = new TicketCounterRepository();
