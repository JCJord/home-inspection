import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Inspection } from '../inspections/inspection.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inspection_id' })
  inspection_id: string;

  @OneToOne(() => Inspection, (inspection) => inspection.report, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inspection_id' })
  inspection: Inspection;

  @Column({ nullable: true })
  pdf_key?: string;

  // Dynamically populated, not saved in DB
  pdf_url?: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  published_at: Date;
}
