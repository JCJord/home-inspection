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
    await this.ensureFullResidentialTemplate();
    await this.ensureFourPointTemplate();
    await this.ensureWindMitigationTemplate();
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

  async ensureFullResidentialTemplate(): Promise<Template> {
    let template = await this.templateRepository.findOne({ where: { name: 'Full Residential (InterNACHI)' } });
    if (!template) {
      const structure = {
        sections: [
          {
            name: 'Roof',
            icon_key: 'ChevronUp',
            fields: [
              { key: 'roof_covering', label: 'Roof Covering Material', type: 'text' },
              { key: 'roof_style', label: 'Roof Style / Design', type: 'text' },
              { key: 'roof_age', label: 'Approximate Age (years)', type: 'text' },
              { key: 'roof_method', label: 'Inspection Method', type: 'text' },
            ],
            presets: [
              { title: 'Damaged or Missing Shingles', description: 'Several asphalt shingles on the roof slopes were found to be cracked, damaged, or completely missing.', recommendation: 'Recommend a licensed roofing contractor evaluate and repair the damaged shingle areas to prevent water intrusion.', severity: 'Major' },
              { title: 'Chimney Flashing Loose', description: 'The metal flashing around the chimney base is loose or detached in some sections, leaving gaps.', recommendation: 'Recommend a qualified roofing professional secure and seal all loose chimney flashings to prevent attic leaks.', severity: 'Minor' },
              { title: 'Ponding Water on Flat Roof', description: 'Observed standing water on the low-slope roof surface indicating inadequate pitch or drainage.', recommendation: 'Recommend evaluation by a licensed flat roof contractor to improve drainage run-off.', severity: 'Major' },
              { title: 'Granule Loss on Shingles', description: 'Significant granule loss observed on multiple asphalt shingles, exposing the underlying fiberglass mat.', recommendation: 'Recommend a licensed roofing contractor evaluate remaining service life of the roof covering.', severity: 'Major' },
            ],
          },
          {
            name: 'Exterior',
            icon_key: 'Home',
            fields: [
              { key: 'exterior_siding', label: 'Siding Material', type: 'text' },
              { key: 'exterior_trim', label: 'Trim Material', type: 'text' },
              { key: 'exterior_walkways', label: 'Walkways / Driveway Material', type: 'text' },
              { key: 'exterior_grade', label: 'Site Grading / Drainage', type: 'text' },
            ],
            presets: [
              { title: 'Negative Grade at Foundation', description: 'The ground slopes toward the foundation in one or more areas. Grade should fall at least 6 inches within the first 10 feet away from the structure.', recommendation: 'Recommend a qualified landscaper or foundation contractor regrade so water flows away from the home.', severity: 'Major' },
              { title: 'Siding Contact with Soil', description: 'The exterior siding material is in direct contact with or too close to the soil line with less than 6 inches of clearance.', recommendation: 'Recommend grading or lowering the soil line to prevent moisture damage and wood-destroying insect access.', severity: 'Minor' },
              { title: 'Loose Handrails on Stairs', description: 'The handrail at the main entry stairs is loose and wobbles under weight posing a fall hazard.', recommendation: 'Recommend a handyman or contractor secure the handrail firmly immediately.', severity: 'Safety' },
              { title: 'Wood Rot at Trim', description: 'Wood rot, damage, or deterioration was observed at one or more exterior trim locations allowing potential water and pest intrusion.', recommendation: 'Recommend repair or replacement of deteriorated wood trim by a qualified contractor.', severity: 'Minor' },
            ],
          },
          {
            name: 'Foundation & Structure',
            icon_key: 'Layers',
            fields: [
              { key: 'foundation_type', label: 'Foundation Type', type: 'text' },
              { key: 'foundation_material', label: 'Foundation Material', type: 'text' },
              { key: 'structure_framing', label: 'Visible Framing Type', type: 'text' },
              { key: 'structure_floor_system', label: 'Floor System', type: 'text' },
            ],
            presets: [
              { title: 'Horizontal Foundation Crack', description: 'Horizontal cracking observed on the foundation wall. Horizontal cracks indicate lateral soil pressure and are considered more serious than vertical cracks.', recommendation: 'Recommend immediate evaluation by a licensed structural engineer or foundation specialist.', severity: 'Safety' },
              { title: 'Stair-Step Cracking in Masonry', description: 'Stair-step cracking pattern observed in the block or brick foundation wall indicating differential settlement.', recommendation: 'Recommend evaluation by a licensed structural engineer to determine cause and extent of movement.', severity: 'Major' },
              { title: 'Efflorescence on Foundation Wall', description: 'White mineral deposits (efflorescence) observed on the foundation wall indicating water migration through the masonry.', recommendation: 'Recommend monitoring for active moisture intrusion and evaluation by a waterproofing contractor.', severity: 'Minor' },
              { title: 'Subfloor Damage Observed', description: 'Soft, spongy, or deteriorated subfloor material was observed in one or more areas indicating moisture damage or wood decay.', recommendation: 'Recommend evaluation and repair by a qualified contractor to prevent further structural deterioration.', severity: 'Major' },
            ],
          },
          {
            name: 'Attic',
            icon_key: 'Triangle',
            fields: [
              { key: 'attic_access', label: 'Access Location', type: 'text' },
              { key: 'attic_insulation_type', label: 'Insulation Type', type: 'text' },
              { key: 'attic_insulation_depth', label: 'Approximate Insulation Depth', type: 'text' },
              { key: 'attic_ventilation', label: 'Ventilation Type', type: 'text' },
            ],
            presets: [
              { title: 'Inadequate Attic Insulation', description: 'Attic insulation depth is below the recommended R-38 minimum for this climate zone resulting in energy loss.', recommendation: 'Recommend adding blown-in or batt insulation to achieve adequate thermal resistance.', severity: 'Maintenance' },
              { title: 'Bathroom Exhaust Venting into Attic', description: 'One or more bathroom exhaust fans are venting directly into the attic space instead of to the exterior.', recommendation: 'Recommend a qualified contractor reroute exhaust ducting to vent directly to the exterior to prevent moisture damage.', severity: 'Major' },
              { title: 'Active Roof Leak Staining', description: 'Water staining or active moisture damage observed on roof sheathing or framing members in the attic.', recommendation: 'Recommend a licensed roofing contractor locate and repair the source of water intrusion immediately.', severity: 'Major' },
              { title: 'Inadequate Attic Ventilation', description: 'Attic ventilation appears insufficient for the size of the space which can lead to heat buildup and premature roof deterioration.', recommendation: 'Recommend a roofing contractor evaluate and improve attic ventilation to meet current standards.', severity: 'Minor' },
            ],
          },
          {
            name: 'Interior',
            icon_key: 'Layout',
            fields: [
              { key: 'interior_walls', label: 'Wall Material', type: 'text' },
              { key: 'interior_floors', label: 'Floor Covering Types', type: 'text' },
              { key: 'interior_ceilings', label: 'Ceiling Material', type: 'text' },
              { key: 'interior_windows', label: 'Window Types', type: 'text' },
            ],
            presets: [
              { title: 'Water Staining on Ceiling', description: 'Water staining observed on ceiling surface in one or more rooms indicating a past or active moisture intrusion source above.', recommendation: 'Recommend locating and repairing the source of moisture intrusion before repainting or patching the affected area.', severity: 'Major' },
              { title: 'Failed Window Seal', description: 'Fogging or condensation between the panes of one or more double or triple pane insulated windows indicating seal failure.', recommendation: 'Recommend replacing the affected insulated glass units to restore thermal efficiency.', severity: 'Minor' },
              { title: 'Doors Not Latching Properly', description: 'One or more interior doors do not latch or close properly which may indicate settling, framing movement, or improper installation.', recommendation: 'Recommend adjustment or repair by a qualified contractor.', severity: 'Minor' },
              { title: 'Trip Hazard at Floor Transition', description: 'Raised or uneven floor transition observed between rooms creating a trip hazard.', recommendation: 'Recommend repair or replacement of transition strip by a qualified contractor.', severity: 'Safety' },
            ],
          },
          {
            name: 'Electrical',
            icon_key: 'Zap',
            fields: [
              { key: 'electrical_panel_location', label: 'Main Panel Location', type: 'text' },
              { key: 'electrical_amps', label: 'Service Amperage (Amps)', type: 'text' },
              { key: 'electrical_wiring_type', label: 'Branch Wiring Type', type: 'text' },
              { key: 'electrical_panel_brand', label: 'Panel Manufacturer', type: 'text' },
            ],
            presets: [
              { title: 'Double-Tapped Circuit Breakers', description: 'Observed multiple electrical wires sharing a single circuit breaker terminal in the main panel.', recommendation: 'Recommend a licensed electrician separate the double-tapped connections to dedicated circuit breakers.', severity: 'Safety' },
              { title: 'Missing GFCI Protection', description: 'Receptacles located within 6 feet of water sources in kitchen, bathrooms, and wet areas lack GFCI protection.', recommendation: 'Recommend a licensed electrician install GFCI-protected receptacles in all damp locations.', severity: 'Safety' },
              { title: 'Hazardous Panel Brand', description: 'Observed a Federal Pacific Stab-Lok or Zinsco main electrical panel. These panels have a documented high rate of breaker failure and fire risk.', recommendation: 'Recommend immediate evaluation and replacement by a licensed electrician.', severity: 'Safety' },
              { title: 'Open Junction Box', description: 'One or more electrical junction boxes observed without proper cover plates exposing live wiring.', recommendation: 'Recommend a licensed electrician install proper cover plates on all open junction boxes.', severity: 'Safety' },
            ],
          },
          {
            name: 'Plumbing',
            icon_key: 'Droplets',
            fields: [
              { key: 'plumbing_supply', label: 'Water Supply Piping', type: 'text' },
              { key: 'plumbing_waste', label: 'Waste Piping Material', type: 'text' },
              { key: 'plumbing_heater_source', label: 'Water Heater Fuel Source', type: 'text' },
              { key: 'plumbing_heater_age', label: 'Water Heater Age (years)', type: 'text' },
            ],
            presets: [
              { title: 'Active Pipe Leak', description: 'Active dripping leak observed at pipe connections in one or more locations.', recommendation: 'Recommend a licensed plumber repair or replace the leaking pipe components immediately.', severity: 'Major' },
              { title: 'TPR Valve Discharge Pipe Missing', description: 'The temperature-pressure relief safety valve on the water heater lacks a dedicated discharge pipe.', recommendation: 'Recommend a plumber install a proper discharge pipe pointing to the floor to prevent scald hazards.', severity: 'Safety' },
              { title: 'Water Heater at End of Service Life', description: 'The water heater is approximately at or beyond its typical 8-12 year service life and may fail without warning.', recommendation: 'Recommend budgeting for water heater replacement in the near term.', severity: 'Maintenance' },
              { title: 'Polybutylene Supply Piping', description: 'Observed polybutylene supply piping which has a history of premature failure and is no longer an accepted material.', recommendation: 'Recommend evaluation and replacement by a licensed plumber.', severity: 'Major' },
            ],
          },
          {
            name: 'HVAC',
            icon_key: 'Wind',
            fields: [
              { key: 'hvac_type', label: 'Heating / Cooling System Type', type: 'text' },
              { key: 'hvac_energy', label: 'Energy / Fuel Source', type: 'text' },
              { key: 'hvac_age', label: 'Approximate Age (years)', type: 'text' },
              { key: 'hvac_filter_location', label: 'Filter Location', type: 'text' },
            ],
            presets: [
              { title: 'Dirty or Clogged Air Filter', description: 'The primary HVAC air return filter is heavily soiled restricting airflow and degrading system performance.', recommendation: 'Recommend replacing the HVAC air filter immediately and checking it every 30-90 days.', severity: 'Maintenance' },
              { title: 'Condensate Drain Line Clogged', description: 'The AC condensate drain pan is full of water and appears clogged creating a risk of overflow and water damage.', recommendation: 'Recommend a licensed HVAC technician flush the condensate drain line and clean the float switch.', severity: 'Major' },
              { title: 'HVAC System at End of Service Life', description: 'The heating and cooling system is at or beyond its typical 15-20 year service life and efficiency will continue to decline.', recommendation: 'Recommend budgeting for system replacement and having a licensed HVAC technician evaluate current performance.', severity: 'Maintenance' },
              { title: 'No Heat Produced When Tested', description: 'The heating system failed to produce heat when activated via the thermostat during inspection.', recommendation: 'Recommend immediate evaluation and repair by a licensed HVAC technician.', severity: 'Major' },
            ],
          },
          {
            name: 'Garage',
            icon_key: 'Car',
            fields: [
              { key: 'garage_type', label: 'Garage Type', type: 'text' },
              { key: 'garage_door_type', label: 'Door Type / Material', type: 'text' },
              { key: 'garage_opener', label: 'Automatic Opener Present', type: 'text' },
            ],
            presets: [
              { title: 'Auto-Reverse Safety Feature Not Working', description: 'The garage door opener auto-reverse safety mechanism did not reverse when obstructed during testing.', recommendation: 'Recommend immediate adjustment or replacement of the garage door opener for safety compliance.', severity: 'Safety' },
              { title: 'Door to Living Space Not Fire Rated', description: 'The door between the garage and living space does not appear to be a fire-rated solid core door as required.', recommendation: 'Recommend replacing with a proper fire-rated solid core door with self-closing hardware.', severity: 'Safety' },
              { title: 'Garage Floor Cracks', description: 'Cracking observed in the garage concrete floor slab. Minor settling cracks are common but should be monitored.', recommendation: 'Recommend sealing cracks to prevent moisture intrusion and monitoring for further movement.', severity: 'Maintenance' },
            ],
          },
        ],
      };
      template = this.templateRepository.create({ name: 'Full Residential (InterNACHI)', structure });
      await this.templateRepository.save(template);
    }
    return template;
  }

  async ensureFourPointTemplate(): Promise<Template> {
    let template = await this.templateRepository.findOne({ where: { name: '4-Point Insurance Inspection' } });
    if (!template) {
      const structure = {
        sections: [
          {
            name: 'Roof',
            icon_key: 'ChevronUp',
            fields: [
              { key: 'roof_covering', label: 'Roof Covering Material', type: 'text' },
              { key: 'roof_age', label: 'Approximate Age (years)', type: 'text' },
            ],
            presets: [
              { title: 'Severe Granule Loss', description: 'Observed significant granule loss on asphalt shingles, exposing the underlying fiberglass mat to solar damage.', recommendation: 'Recommend a licensed roofing contractor evaluate the remaining service life of the shingles.', severity: 'Major' },
            ],
          },
          {
            name: 'Electrical',
            icon_key: 'Zap',
            fields: [
              { key: 'electrical_panel_brand', label: 'Panel Manufacturer / Brand', type: 'text' },
              { key: 'electrical_amps', label: 'Service Amperage (Amps)', type: 'text' },
            ],
            presets: [
              { title: 'Hazardous Panel Brand', description: 'Observed a Federal Pacific (FPE) Stab-Lok main electrical panel. These panels have a high rate of breaker failure.', recommendation: 'Recommend immediate replacement of the electrical panel by a licensed electrician for fire safety.', severity: 'Safety' },
            ],
          },
          {
            name: 'Plumbing',
            icon_key: 'Droplets',
            fields: [
              { key: 'plumbing_supply', label: 'Water Supply Piping', type: 'text' },
              { key: 'plumbing_heater_age', label: 'Water Heater Age (years)', type: 'text' },
            ],
            presets: [
              { title: 'Active Plumbing Leak', description: 'Observed active dripping/leaking at the hot water supply inlet on the water heater tank.', recommendation: 'Recommend repair by a licensed plumber.', severity: 'Major' },
            ],
          },
          {
            name: 'HVAC',
            icon_key: 'Wind',
            fields: [
              { key: 'hvac_type', label: 'Heating System Type', type: 'text' },
              { key: 'hvac_age', label: 'Approximate Age (years)', type: 'text' },
            ],
            presets: [
              { title: 'Inadequate Heating Source', description: 'The heating unit failed to activate when tested using the thermostat control.', recommendation: 'Recommend a licensed HVAC technician service or repair the heating system.', severity: 'Major' },
            ],
          },
        ],
      };
      template = this.templateRepository.create({ name: '4-Point Insurance Inspection', structure });
      await this.templateRepository.save(template);
    }
    return template;
  }

  async ensureWindMitigationTemplate(): Promise<Template> {
    let template = await this.templateRepository.findOne({ where: { name: 'Wind Mitigation Inspection' } });
    if (!template) {
      const structure = {
        sections: [
          {
            name: 'Roof Covering',
            icon_key: 'ChevronUp',
            fields: [
              { key: 'roof_covering_material', label: 'Roof Covering Material', type: 'text' },
              { key: 'roof_permit_date', label: 'Permit Date of Roof Installation', type: 'text' },
              { key: 'roof_fbc_compliance', label: 'FBC Compliance', type: 'text' },
            ],
            presets: [
              { title: 'Non-FBC Compliant Roof Covering', description: 'The roof covering does not meet Florida Building Code wind resistance requirements based on permit date and material type.', recommendation: 'Recommend evaluation by a licensed roofing contractor for upgrade or replacement to qualify for insurance credit.', severity: 'Major' },
              { title: 'Roof Covering Age Unknown', description: 'Unable to verify permit date or installation year of roof covering. Age documentation was not available at time of inspection.', recommendation: 'Recommend obtaining permit records from the local building department to verify compliance.', severity: 'Informational' },
            ],
          },
          {
            name: 'Roof Deck Attachment',
            icon_key: 'Layers',
            fields: [
              { key: 'deck_material', label: 'Roof Deck Material', type: 'text' },
              { key: 'deck_nail_size', label: 'Nail Size', type: 'text' },
              { key: 'deck_nail_spacing', label: 'Nail Spacing Pattern', type: 'text' },
            ],
            presets: [
              { title: 'Stapled Deck Attachment', description: 'Roof deck is attached with staples rather than nails. Staple attachment provides significantly less wind uplift resistance.', recommendation: 'Document as Category A attachment. Homeowner should be aware this affects insurance wind mitigation credit.', severity: 'Informational' },
              { title: '6d Nail Pattern Verified', description: 'Roof deck attachment verified as 6d nails at 6 inch field spacing qualifying for enhanced wind mitigation credit.', recommendation: 'Document for insurance submission.', severity: 'Informational' },
            ],
          },
          {
            name: 'Roof to Wall Connection',
            icon_key: 'Link',
            fields: [
              { key: 'connection_type', label: 'Connection Type', type: 'text' },
              { key: 'connector_brand', label: 'Connector Brand / Model', type: 'text' },
            ],
            presets: [
              { title: 'Toenail Connection Only', description: 'Roof to wall connection is toenail only with no hurricane straps or clips observed. This is the weakest connection type for wind uplift resistance.', recommendation: 'Document as toenail connection for insurance purposes. Homeowner may want to evaluate retrofit strap installation.', severity: 'Informational' },
              { title: 'Single Wrap Hurricane Strap Verified', description: 'Single wrap hurricane straps connecting roof rafters to wall top plate verified at time of inspection.', recommendation: 'Document for insurance submission as single wrap connection.', severity: 'Informational' },
            ],
          },
          {
            name: 'Roof Shape',
            icon_key: 'Triangle',
            fields: [
              { key: 'roof_shape', label: 'Roof Shape / Geometry', type: 'text' },
              { key: 'hip_percentage', label: 'Hip Roof Percentage', type: 'text' },
            ],
            presets: [
              { title: 'Gable Roof — No Hip Credit', description: 'Roof geometry is primarily gable end design. Gable roofs do not qualify for hip roof wind mitigation insurance discount.', recommendation: 'Document as gable roof for insurance submission.', severity: 'Informational' },
              { title: 'Hip Roof Verified', description: 'Roof geometry is fully hip design with no gable ends qualifying for maximum hip roof insurance wind credit.', recommendation: 'Document for insurance submission as qualifying hip roof.', severity: 'Informational' },
            ],
          },
          {
            name: 'Opening Protection',
            icon_key: 'Shield',
            fields: [
              { key: 'opening_windows', label: 'Window Protection Type', type: 'text' },
              { key: 'opening_doors', label: 'Door Protection Type', type: 'text' },
              { key: 'opening_garage', label: 'Garage Door Rating', type: 'text' },
            ],
            presets: [
              { title: 'No Opening Protection', description: 'Windows and doors lack hurricane rated protection. No impact glass, shutters, or rated panels were observed.', recommendation: 'Document as no opening protection for insurance submission. Homeowner may consider installing protection for premium reduction.', severity: 'Informational' },
              { title: 'Garage Door Not Wind Rated', description: 'The garage door does not display a wind load rating label and appears to be a standard residential door not rated for high wind events.', recommendation: 'Recommend evaluation for replacement with a wind-rated door to improve both safety and insurance standing.', severity: 'Major' },
              { title: 'Impact Glass Verified on All Openings', description: 'All windows and entry doors verified as impact rated glass qualifying for maximum opening protection insurance credit.', recommendation: 'Document for insurance submission as fully protected openings.', severity: 'Informational' },
            ],
          },
        ],
      };
      template = this.templateRepository.create({ name: 'Wind Mitigation Inspection', structure });
      await this.templateRepository.save(template);
    }
    return template;
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
      'Download', 'Loader2', 'CheckCircle2', 'Layers', 'Triangle', 'Link', 'Layout',
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
