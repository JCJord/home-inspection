import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Inspector } from '../inspectors/inspector.entity';
import { Finding } from '../findings/finding.entity';
import { Report } from '../reports/report.entity';
import { Template } from '../templates/template.entity';
import type { TemplateStructure } from '../templates/template.entity';

@Entity('inspections')
export class Inspection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inspector_id' })
  inspector_id: string;

  @ManyToOne(() => Inspector, (inspector) => inspector.inspections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inspector_id' })
  inspector: Inspector;

  @Column()
  address: string;

  @Column()
  client_name: string;

  @Column({ nullable: true })
  client_email: string;

  @Column({ nullable: true })
  client_phone: string;

  @Column()
  year_built: number;

  @Column({ nullable: true })
  square_footage: number;

  @Column({ default: 'in_progress' })
  status: string;

  @Column({ nullable: true })
  weather: string;

  @Column({ type: 'float', nullable: true })
  temperature: number;

  @Column({ nullable: true })
  occupancy: string;

  @Column({ nullable: true })
  attendees: string;

  @Column({ nullable: true })
  foundation_type: string;

  @Column({ nullable: true })
  cover_photo_url: string;

  @Column({ name: 'template_id', nullable: true })
  template_id: string;

  @ManyToOne(() => Template, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @Column({ type: 'jsonb', nullable: true })
  template_snapshot: TemplateStructure;

  @Column({ type: 'jsonb', nullable: true })
  metadata_values: Record<string, string>;

  @OneToMany(() => Finding, (finding) => finding.inspection, { cascade: true })
  findings: Finding[];

  @OneToOne(() => Report, (report) => report.inspection, { cascade: true })
  report: Report;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
