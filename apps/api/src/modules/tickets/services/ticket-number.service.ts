import type { PoolClient } from 'pg';
import {
  ticketCounterRepository,
  TicketCounterRepository,
} from '../repositories/ticket-counter.repository.js';

export class TicketNumberService {
  constructor(private counterRepo: TicketCounterRepository = ticketCounterRepository) {}

  async getNextTicketNumber(organizationId: string, client?: PoolClient): Promise<number> {
    return this.counterRepo.getNextTicketNumber(organizationId, client);
  }

  formatTicketNumber(ticketNumber: number | string): string {
    return this.counterRepo.formatTicketNumber(ticketNumber);
  }
}

export const ticketNumberService = new TicketNumberService();
