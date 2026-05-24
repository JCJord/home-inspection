import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Inspector } from '../inspectors/inspector.entity';

export interface TemplatePreset {
  title: string;
  description: string;
  recommendation?: string;
  severity: string;
}

export interface TemplateField {
  key: string;
  label: string;
  type: string;
  options?: string[];
}

export interface TemplateSection {
  name: string;
  icon_key: string;
  fields: TemplateField[];
  presets: TemplatePreset[];
  location_presets?: string[];
}

export interface TemplateStructure {
  sections: TemplateSection[];
}

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'inspector_id', nullable: true })
  inspector_id: string;

  @ManyToOne(() => Inspector, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inspector_id' })
  inspector: Inspector;

  @Column({ type: 'jsonb' })
  structure: TemplateStructure;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
