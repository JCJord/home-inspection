import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Inspection } from '../inspections/inspection.entity';
import { Photo } from '../photos/photo.entity';

@Entity('findings')
export class Finding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inspection_id' })
  inspection_id: string;

  @ManyToOne(() => Inspection, (inspection) => inspection.findings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inspection_id' })
  inspection: Inspection;

  @Column({ type: 'varchar' })
  section: string;

  @Column({ type: 'varchar' })
  severity: string;

  @Column({ nullable: true })
  location: string;

  @Column({ default: '' })
  description: string;

  @Column({ nullable: true })
  recommendation: string;

  @Column({ default: 0 })
  sort_order: number;

  @OneToMany(() => Photo, (photo) => photo.finding, { cascade: true })
  photos: Photo[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
