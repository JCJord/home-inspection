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

  @Column()
  client_email: string;

  @Column()
  year_built: number;

  @Column({ nullable: true })
  square_footage: number;

  @Column({ default: 'in_progress' })
  status: string;

  @OneToMany(() => Finding, (finding) => finding.inspection, { cascade: true, eager: true })
  findings: Finding[];

  @OneToOne(() => Report, (report) => report.inspection, { cascade: true })
  report: Report;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
