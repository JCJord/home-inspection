import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Finding } from '../findings/finding.entity';

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'finding_id' })
  finding_id: string;

  @ManyToOne(() => Finding, (finding) => finding.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'finding_id' })
  finding: Finding;

  @Column()
  photo_key: string;

  // Dynamically populated, not saved in DB
  storage_url?: string;

  @Column({ default: 0 })
  sort_order: number;

  @Column({ nullable: true })
  caption: string;

  @CreateDateColumn()
  uploaded_at: Date;
}
