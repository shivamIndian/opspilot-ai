import type { PoolClient } from 'pg';
import {
  ticketActivityRepository,
  TicketActivityRepository,
  type CreateActivityLogParams,
} from '../repositories/ticket-activity.repository.js';
import type { SafeTicketActivityLog } from '../types/ticket.types.js';

export class TicketActivityService {
  constructor(private activityRepo: TicketActivityRepository = ticketActivityRepository) {}

  async logActivity(params: CreateActivityLogParams, client?: PoolClient) {
    return this.activityRepo.logActivity(params, client);
  }

  async listTicketActivity(
    organizationId: string,
    ticketId: string,
    limit = 50,
    offset = 0
  ): Promise<{ activity: SafeTicketActivityLog[]; total: number }> {
    const { logs, total } = await this.activityRepo.listByTicket(
      organizationId,
      ticketId,
      limit,
      offset
    );

    return {
      total,
      activity: logs.map(l => this.activityRepo.toSafeActivityLog(l)),
    };
  }
}

export const ticketActivityService = new TicketActivityService();
