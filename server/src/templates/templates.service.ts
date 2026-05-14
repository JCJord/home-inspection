import { Injectable, OnApplicationBootstrap, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Template, TemplatePreset } from './template.entity';
import { Inspection } from '../inspections/inspection.entity';
import { Section } from '../findings/enums';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(Inspection)
    private readonly inspectionRepository: Repository<Inspection>,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureDefaultTemplate();
    await this.migrateExistingInspections();
  }

  async ensureDefaultTemplate(): Promise<Template> {
    let defaultTemplate = await this.templateRepository.findOne({ where: { name: 'System Default' } });
    if (!defaultTemplate) {
      const structure = {
        sections: Object.values(Section).map(section => ({
          name: section,
          icon_key: this.getIconKeyForSection(section),
          fields: [
            { key: `${section.toLowerCase().replace(/[^a-z0-9]/g, '_')}_material`, label: 'Material / Type', type: 'text' },
            { key: `${section.toLowerCase().replace(/[^a-z0-9]/g, '_')}_method`, label: 'Inspection Method', type: 'text' }
          ],
          presets: this.getPresetsForSection(section)
        }))
      };

      defaultTemplate = this.templateRepository.create({
        name: 'System Default',
        structure,
      });
      await this.templateRepository.save(defaultTemplate);
    }
    return defaultTemplate;
  }

  async migrateExistingInspections() {
    const defaultTemplate = await this.ensureDefaultTemplate();
    // Find all inspections where template_snapshot is null
    const inspections = await this.inspectionRepository.find({
      where: { template_snapshot: IsNull() }
    });

    for (const inspection of inspections) {
      inspection.template_id = defaultTemplate.id;
      inspection.template_snapshot = defaultTemplate.structure;
      if (!inspection.metadata_values) {
        inspection.metadata_values = {};
      }
      await this.inspectionRepository.save(inspection);
    }
  }
  async findAll(inspectorId: string): Promise<Template[]> {
    return this.templateRepository.find({
      where: [
        { inspector_id: IsNull() },
        { inspector_id: inspectorId }
      ],
      order: { name: 'ASC' }
    });
  }

  async findOne(id: string, inspectorId?: string): Promise<Template> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    if (inspectorId && template.inspector_id !== null && template.inspector_id !== inspectorId) {
      throw new ForbiddenException('Not authorized to access this template');
    }
    return template;
  }

  async create(inspectorId: string, dto: CreateTemplateDto, sourceTemplateId?: string): Promise<Template> {
    let structure = dto.structure;

    if (sourceTemplateId) {
      const source = await this.findOne(sourceTemplateId, inspectorId);
      structure = source.structure;
    }

    const template = this.templateRepository.create({
      name: dto.name,
      inspector_id: inspectorId,
      structure: structure || { sections: [] }
    });

    return this.templateRepository.save(template);
  }

  async update(id: string, inspectorId: string, dto: UpdateTemplateDto): Promise<Template> {
    const template = await this.findOne(id);

    if (template.inspector_id === null) {
      throw new ForbiddenException('Cannot update system default template');
    }

    if (template.inspector_id !== inspectorId) {
      throw new ForbiddenException('Not authorized to update this template');
    }

    if (dto.name !== undefined) {
      template.name = dto.name;
    }

    if (dto.structure !== undefined) {
      template.structure = dto.structure as any; // Cast to any to bypass TypeORM JSONB type constraints safely if needed
    }

    return this.templateRepository.save(template);
  }

  async remove(id: string, inspectorId: string): Promise<void> {
    const template = await this.findOne(id);

    if (template.inspector_id === null) {
      throw new ForbiddenException('Cannot delete system default template');
    }

    if (template.inspector_id !== inspectorId) {
      throw new ForbiddenException('Not authorized to delete this template');
    }

    await this.templateRepository.remove(template);
  }

  getAvailableIcons(): string[] {
    return [
      'Home', 'ChevronUp', 'ChevronDown', 'Hammer', 'Zap', 'Droplets', 'Wind', 'Flame', 
      'Box', 'Grid', 'Monitor', 'Car', 'Shield', 'Search', 'Info', 'AlertTriangle',
      'Wrench', 'Thermometer', 'Lightbulb', 'Paintbrush', 'Sun', 'Key', 'Eye', 'Power', 
      'FileCheck', 'HardHat', 'Construction', 'Ruler', 'ShieldCheck', 'ShieldAlert', 
      'BrickWall', 'Trees', 'Fan', 'Sparkles', 'Wifi', 'WifiOff', 'Trash', 'Settings', 
      'Check', 'X', 'Users', 'FileText', 'Image', 'Cloud', 'CloudRain', 'CloudLightning', 
      'Snowflake', 'Umbrella', 'Compass', 'MapPin', 'Clock', 'Calendar', 'Activity', 
      'Scissors', 'Heart', 'AlertCircle', 'HelpCircle', 'Ban', 'LockOpen', 'Send', 
      'Download', 'Loader2', 'CheckCircle2', 'Layers'
    ];
  }

  private getIconKeyForSection(section: Section): string {
    const map: Record<string, string> = {
      [Section.EXTERIOR]: 'Home',
      [Section.ROOF]: 'ChevronUp',
      [Section.BASEMENT]: 'ChevronDown',
      [Section.STRUCTURE]: 'Hammer',
      [Section.ELECTRICAL]: 'Zap',
      [Section.PLUMBING]: 'Droplets',
      [Section.HVAC]: 'Wind',
      [Section.FIREPLACE]: 'Flame',
      [Section.ATTIC]: 'Box',
      [Section.INTERIOR]: 'Grid',
      [Section.APPLIANCES]: 'Monitor',
      [Section.GARAGE]: 'Car',
    };
    return map[section] || 'Home';
  }

  private getPresetsForSection(section: Section): TemplatePreset[] {
    return [
      { 
        title: `Common ${section} Issue`, 
        description: `Observed a typical wear and tear issue in the ${section} component.`, 
        recommendation: `Professional evaluation by a qualified ${section.toLowerCase()} contractor is recommended for further assessment and repair.`,
        severity: 'Minor' 
      },
      { 
        title: `Major ${section} Defect`, 
        description: `Identified a significant defect in the ${section} system that may affect safety or structural integrity.`, 
        recommendation: `Immediate repair or replacement by a licensed ${section.toLowerCase()} professional is required to ensure safety and functionality.`,
        severity: 'Major' 
      }
    ];
  }
}
