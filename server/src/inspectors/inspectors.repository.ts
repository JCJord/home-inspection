import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inspector } from './inspector.entity';

@Injectable()
export class InspectorsRepository {
  constructor(
    @InjectRepository(Inspector)
    private readonly repository: Repository<Inspector>,
  ) {}

  async create(data: Partial<Inspector>): Promise<Inspector> {
    const inspector = this.repository.create(data);
    return await this.repository.save(inspector);
  }

  async findAll(): Promise<Inspector[]> {
    return await this.repository.find();
  }

  async findById(id: string): Promise<Inspector | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<Inspector | null> {
    return await this.repository.findOne({ where: { email } });
  }

  async update(id: string, data: Partial<Inspector>): Promise<Inspector | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
