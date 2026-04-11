import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Inspection } from '../inspections/inspection.entity';

@Entity('inspectors')
export class Inspector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  company_name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  license_number: string;

  @Column({ nullable: true })
  logo_url: string;

  @Column({ default: 'free' })
  subscription_status: string;

  @Column({ default: 0 })
  free_inspections_used: number;

  @OneToMany(() => Inspection, (inspection) => inspection.inspector)
  inspections: Inspection[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

