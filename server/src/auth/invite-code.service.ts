import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InviteCode } from './invite-code.entity';
import * as crypto from 'crypto';

@Injectable()
export class InviteCodeService {
  constructor(
    @InjectRepository(InviteCode)
    private readonly inviteCodeRepository: Repository<InviteCode>,
  ) {}

  /**
   * Generates a new random invite code.
   */
  async generateCode(options?: {
    maxUses?: number;
    notes?: string;
    expiresAt?: Date;
  }): Promise<InviteCode> {
    const code = 'BETA-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const inviteCode = this.inviteCodeRepository.create({
      code,
      max_uses: options?.maxUses ?? 1,
      notes: options?.notes,
      expires_at: options?.expiresAt,
    });

    return await this.inviteCodeRepository.save(inviteCode);
  }

  /**
   * Atomically validates and consumes an invite code.
   * If a transaction manager is provided, it will be used.
   */
  async validateAndConsumeCode(code: string, manager?: EntityManager): Promise<void> {
    if (!code) {
      throw new BadRequestException('Invite code is required');
    }

    const normalizedCode = code.trim().toUpperCase();

    // Use the provided transaction manager if available, otherwise fallback to the default repository manager
    const entityManager = manager || this.inviteCodeRepository.manager;

    const result = await entityManager
      .createQueryBuilder()
      .update(InviteCode)
      .set({ used_count: () => 'used_count + 1' })
      .where('code = :code', { code: normalizedCode })
      .andWhere('used_count < max_uses')
      .andWhere('(expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)')
      .execute();

    if (result.affected === 0) {
      throw new BadRequestException('Invalid, expired, or fully used invite code');
    }
  }
}
