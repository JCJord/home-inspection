import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Inspection } from '../inspections/inspection.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';

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

  @Column({
    type: 'varchar',
    default: SubscriptionStatus.FREE,
  })
  subscription_status: SubscriptionStatus;

  @Column({ default: 0 })
  free_inspections_used: number;

  @OneToMany(() => Inspection, (inspection) => inspection.inspector)
  inspections: Inspection[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

