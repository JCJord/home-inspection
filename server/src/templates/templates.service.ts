import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Template, TemplatePreset } from './template.entity';
import { Inspection } from '../inspections/inspection.entity';
import { Section } from '../findings/enums';

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
        description: `Observed a typical wear and tear issue in the ${section} component. Recommendations include professional evaluation.`, 
        severity: 'Minor' 
      },
      { 
        title: `Major ${section} Defect`, 
        description: `Identified a significant defect in the ${section} system that may affect safety or structural integrity. Immediate repair advised.`, 
        severity: 'Major' 
      }
    ];
  }
}
