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
  ) { }

  async onApplicationBootstrap() {
    await this.ensureDefaultTemplate();
    await this.ensureFullResidentialTemplate();
    await this.ensureFourPointTemplate();
    await this.ensureWindMitigationTemplate();
    await this.migrateExistingInspections();
  }

  async ensureDefaultTemplate(): Promise<Template> {
    let defaultTemplate = await this.templateRepository.findOne({ where: { name: 'System Default' } });
    if (defaultTemplate) {
      await this.templateRepository.remove(defaultTemplate);
    }
    const structure = {
      sections: Object.values(Section).map(section => ({
        name: section,
        icon_key: this.getIconKeyForSection(section),
        fields: [
          { key: `${section.toLowerCase().replace(/[^a-z0-9]/g, '_')}_method`, label: 'Inspection Method', type: 'select', options: ['Visual Inspection', 'Physical / Tactile Testing', 'Operational Testing via Controls', 'Thermal Imaging', 'Moisture Meter'] },
          { key: `${section.toLowerCase().replace(/[^a-z0-9]/g, '_')}_material`, label: 'Material / Type', type: 'text' }
        ],
        presets: this.getPresetsForSection(section)
      }))
    };

    defaultTemplate = this.templateRepository.create({
      name: 'System Default',
      structure,
    });
    await this.templateRepository.save(defaultTemplate);
    return defaultTemplate;
  }

  async ensureFullResidentialTemplate(): Promise<Template> {
    let template = await this.templateRepository.findOne({ where: { name: 'Full Residential (InterNACHI)' } });
    if (template) {
      await this.templateRepository.remove(template);
    }

    const structure = {
      sections: [
        {
          name: 'Roof',
          icon_key: 'ChevronUp',
          fields: [
            { key: 'roof_covering', label: 'Roof Covering Material', type: 'select', options: ['Architectural Shingles', '3-Tab Shingles', 'Concrete Tile', 'Clay Tile', 'Standing Seam Metal', 'Exposed Fastener Metal', 'Wood Shake', 'Built-Up / Flat TPO'] },
            { key: 'roof_style', label: 'Roof Style / Design', type: 'select', options: ['Gable', 'Hip', 'Mansard', 'Flat', 'Shed', 'Gambrel'] },
            { key: 'roof_age', label: 'Approximate Age', type: 'select', options: ['0-5 Years', '5-10 Years', '10-15 Years', '15-20 Years', '20+ Years / End of Life'] },
            { key: 'roof_method', label: 'Inspection Method', type: 'select', options: ['Walked / Traversed Surface', 'Viewed from Ladder at Eave', 'Drone Photography', 'Binoculars from Ground', 'Limited Access - Visual Only'] },
          ],
          presets: [
            {
              title: 'Limitation of Scope: Inaccessible Areas',
              description: 'Portions of the roof surface were inaccessible and could not be safely walked or viewed due to pitch, height, or weather conditions. This inspection is limited to visible components only. Hidden defects may exist in unobserved areas.',
              recommendation: 'Monitor unobserved areas for future signs of leakage.',
              severity: 'Information'
            },
            {
              title: 'Damaged or Missing Shingles',
              description: 'Damaged, loose, or missing asphalt shingles were observed. Shingles serve as the primary weatherproofing layer. When compromised, the underlayment is exposed to accelerated wear, leading to eventual moisture intrusion and structural rot.',
              recommendation: 'Recommend a licensed roofing contractor evaluate the full surface and replace affected shingles to prevent water damage.',
              severity: 'Major'
            },
            {
              title: 'Kickout Flashing Missing',
              description: 'Kickout flashing was missing where the roof edge meets the siding. Kickout flashing diverts rainwater away from the exterior wall. Without it, water runs directly down the siding, often causing hidden wood rot inside the wall cavity.',
              recommendation: 'Recommend a qualified roofer install proper kickout flashing to protect the building envelope.',
              severity: 'Major'
            },
            {
              title: 'Granule Loss on Shingles',
              description: 'Significant granule loss was observed on multiple asphalt shingles, exposing the underlying fiberglass mat. Granules protect the asphalt from UV degradation. This indicates the roof is nearing the end of its useful service life.',
              recommendation: 'Recommend budgeting for roof replacement and having a licensed roofer evaluate the remaining service life.',
              severity: 'Maintenance'
            },
          ],
        },
        {
          name: 'Exterior',
          icon_key: 'Home',
          fields: [
            { key: 'exterior_siding', label: 'Siding Material', type: 'select', options: ['Vinyl', 'Fiber Cement (Hardie)', 'Stucco', 'Brick Veneer', 'Wood Siding', 'Aluminum / Metal', 'Stone'] },
            { key: 'exterior_trim', label: 'Trim Material', type: 'select', options: ['Wood', 'Vinyl / PVC', 'Aluminum', 'Composite'] },
            { key: 'exterior_driveway', label: 'Driveway / Walkway Material', type: 'select', options: ['Poured Concrete', 'Asphalt', 'Pavers', 'Gravel / Dirt'] },
            { key: 'exterior_gutters', label: 'Gutters & Downspouts', type: 'select', options: ['Aluminum', 'Galvanized', 'Copper', 'Vinyl / Plastic', 'None Installed'] },
            { key: 'exterior_grade', label: 'Site Grading / Drainage', type: 'select', options: ['Adequate Slope', 'Negative Grading', 'Flat / Poor Drainage'] },
          ],
          presets: [
            {
              title: 'Limitation of Scope: Dense Vegetation',
              description: 'Dense vegetation, shrubs, or groundcover were observed tight against the exterior walls in one or more areas. This dense foliage conceals the foundation, siding, and lower windows. Hidden damage, wood rot, or pest intrusion may exist behind these obstructions.',
              recommendation: 'Recommend pruning or removing vegetation to maintain a 12-inch clearance from the exterior walls and reinspecting the concealed areas.',
              severity: 'Information'
            },
            {
              title: 'Negative Grade at Foundation',
              description: 'The ground slopes toward the foundation in one or more areas. Proper grading should fall at least 6 inches within the first 10 feet away from the structure. Negative grading directs surface water against the foundation, leading to soil settlement, crawlspace moisture, and structural damage.',
              recommendation: 'Recommend a qualified landscaper or foundation contractor regrade the soil so water flows away from the home.',
              severity: 'Major'
            },
            {
              title: 'Downspouts Discharging Too Close to Foundation',
              description: 'One or more gutter downspouts discharge directly at the base of the foundation. Depositing roof runoff concentrated at the foundation wall is a primary cause of basement/crawlspace flooding and structural settlement.',
              recommendation: 'Recommend installing downspout extensions to divert water a minimum of 6 feet away from the foundation.',
              severity: 'Maintenance'
            },
            {
              title: 'Trip Hazard & Concrete Deterioration',
              description: 'Cracking, settlement, or uneven slabs were observed in the concrete driveway, walkways, or porch steps creating a noticeable trip hazard. Further deterioration will occur as water expands and contracts during freeze/thaw cycles.',
              recommendation: 'Recommend grinding down uneven edges, mud-jacking, or replacing affected concrete slabs by a qualified contractor.',
              severity: 'Safety'
            },
            {
              title: 'Missing or Non-Graspable Handrail',
              description: 'A proper, graspable handrail is missing on exterior stairs with 3 or more risers. This presents a serious fall hazard, especially in wet or icy conditions.',
              recommendation: 'Recommend a qualified contractor install proper safety handrails that meet current building standards.',
              severity: 'Safety'
            },
            {
              title: 'Exterior Sealant / Caulking Deteriorated',
              description: 'Exterior caulking around window frames, door frames, or siding penetrations is missing, cracked, or deteriorated. Left unsealed, these gaps allow wind-driven rain and pests to enter the wall cavity.',
              recommendation: 'Recommend a handyman scrape away old sealant and apply a fresh bead of exterior-grade silicone caulk to all penetrations.',
              severity: 'Maintenance'
            },
            {
              title: 'Siding Contact with Soil',
              description: 'The exterior siding material is in direct contact with the soil line (less than 6 inches of clearance). This provides a hidden bridge for wood-destroying insects (termites) and allows the siding materials to wick moisture, causing premature rot.',
              recommendation: 'Recommend grading or lowering the soil line to achieve proper clearance.',
              severity: 'Minor'
            },
          ],
        },
        {
          name: 'Foundation & Structure',
          icon_key: 'Layers',
          fields: [
            { key: 'foundation_type', label: 'Foundation Type', type: 'select', options: ['Slab on Grade', 'Crawlspace', 'Full Basement', 'Partial Basement', 'Piers / Stilts'] },
            { key: 'foundation_material', label: 'Foundation Material', type: 'select', options: ['Poured Concrete', 'Concrete Block (CMU)', 'Brick', 'Stone', 'Wood'] },
            { key: 'structure_framing', label: 'Visible Framing Type', type: 'select', options: ['Dimensional Wood', 'Engineered Wood (I-Joists)', 'Steel / Metal', 'Not Visible'] },
          ],
          presets: [
            {
              title: 'Limitation of Scope: Concealed Foundation & Future Moisture',
              description: 'The foundation was inspected for visible signs of moisture or water intrusion. However, we cannot predict future conditions. Heavy rains, melting snow, and changing soil conditions can cause future seepage. Proper exterior grading and drainage are essential to prevent future water-related issues.',
              recommendation: 'Monitor foundation walls during heavy rain events.',
              severity: 'Information'
            },
            {
              title: 'Severe Horizontal Foundation Crack',
              description: 'Horizontal cracking was observed on the foundation wall. Horizontal cracks generally indicate lateral soil pressure or hydrostatic pressure pushing against the wall, which is considered a severe structural defect requiring immediate attention.',
              recommendation: 'Recommend immediate evaluation by a licensed structural engineer or foundation specialist.',
              severity: 'Safety'
            },
            {
              title: 'Vertical Settlement Cracks (> 1/8")',
              description: 'Vertical or step cracking wider than 1/8" was observed in the foundation walls or floor slab. While minor hairline cracks are typical for concrete shrinkage, cracks of this size can allow water, soil smells, and radon gas to seep into the home.',
              recommendation: 'Recommend a foundation contractor evaluate and seal the cracks with an appropriate epoxy or polyurethane injection.',
              severity: 'Major'
            },
            {
              title: 'Active Moisture at Box Sill / Rim Joist',
              description: 'Active water intrusion or elevated moisture readings (above 14%) were observed at the box sill / rim joist area of the floor framing. This is typically caused by failed exterior flashing or negative grading, and leads rapidly to wood rot.',
              recommendation: 'Recommend identifying the exterior source of the moisture and repairing as needed by a qualified contractor.',
              severity: 'Major'
            },
            {
              title: 'Efflorescence on Foundation Wall',
              description: 'White mineral deposits (efflorescence) were observed on the interior foundation wall. This occurs when moisture migrates through the masonry, evaporates, and leaves salts behind. It is a clear indicator of active or past water intrusion.',
              recommendation: 'Recommend monitoring for active moisture during heavy rains and evaluation by a waterproofing contractor if water entry occurs.',
              severity: 'Minor'
            },
          ],
        },
        {
          name: 'Attic',
          icon_key: 'Triangle',
          fields: [
            { key: 'attic_access', label: 'Access Location / Type', type: 'select', options: ['Pull-Down Stairs', 'Scuttle Hole / Hatch', 'Walk-In Door', 'Not Located / Inaccessible'] },
            { key: 'attic_insulation', label: 'Insulation Type', type: 'select', options: ['Fiberglass Batts', 'Blown-In Cellulose', 'Blown-In Fiberglass', 'Spray Foam', 'None Visible'] },
            { key: 'attic_ventilation', label: 'Ventilation Type', type: 'select', options: ['Soffit & Ridge Vents', 'Gable Vents', 'Roof/Turtle Vents', 'Power Ventilator', 'Inadequate / None Visible'] },
            { key: 'attic_method', label: 'Inspection Method', type: 'select', options: ['Entered & Walked', 'Viewed from Hatch Only', 'Limited Access due to Low Clearance'] },
          ],
          presets: [
            {
              title: 'Limitation of Scope: Insulation & Safe Access',
              description: 'The attic was inspected primarily from the access hatch or safe walkways. Deep attic insulation conceals the ceiling joists, hindering the ability to safely traverse the space without risking falling through the drywall ceiling below. Concealed defects may be present beneath the insulation.',
              recommendation: 'N/A',
              severity: 'Information'
            },
            {
              title: 'Inadequate Attic Insulation',
              description: 'Attic insulation depth appears below current modern standards. Over the years, insulation can gradually compress and deteriorate, lowering its R-value. The recommended level for optimal thermal performance in most attics is approximately 10 to 14 inches (R-38).',
              recommendation: 'Recommend adding blown-in or batt insulation to achieve optimal thermal resistance and lower utility bills.',
              severity: 'Maintenance'
            },
            {
              title: 'Evidence of Pests / Rodents in Attic',
              description: 'Visible signs of pest activity were observed in the attic space, including droppings, nesting materials, or chewed insulation. Pests can contaminate the area, compress insulation, and cause severe fire hazards by chewing through electrical wiring.',
              recommendation: 'Recommend further evaluation, removal, and exclusion repairs by a licensed pest control contractor.',
              severity: 'Major'
            },
            {
              title: 'Bathroom Exhaust Venting into Attic',
              description: 'One or more bathroom exhaust fans are venting directly into the attic space instead of to the exterior. This pushes warm, moist air into a cold space, which frequently leads to severe condensation, wood rot, and microbial growth on the roof decking.',
              recommendation: 'Recommend a qualified contractor reroute the exhaust ducting to vent directly through the roof or exterior wall.',
              severity: 'Major'
            },
          ]
        },
        {
          name: 'Interior & Fireplace',
          icon_key: 'Layout',
          fields: [
            { key: 'interior_walls', label: 'Wall / Ceiling Materials', type: 'select', options: ['Drywall', 'Plaster', 'Wood Paneling', 'Mixed Materials'] },
            { key: 'interior_floors', label: 'Floor Covering Types', type: 'select', options: ['Carpet', 'Hardwood / Engineered', 'Tile / Stone', 'Laminate / LVP', 'Mixed'] },
            { key: 'interior_windows', label: 'Window Types', type: 'select', options: ['Vinyl Double-Hung', 'Wood Casement', 'Aluminum Slider', 'Mixed Types'] },
            { key: 'interior_doors', label: 'Interior Doors', type: 'select', options: ['Hollow Core', 'Solid Wood', 'Glass / French', 'Mixed'] },
            { key: 'interior_fireplace', label: 'Fireplace Type', type: 'select', options: ['Wood Burning (Masonry)', 'Gas Log Insert', 'Pellet Stove', 'None / N/A'] },
          ],
          presets: [
            {
              title: 'Limitation of Scope: Furnished Home',
              description: 'The home was fully or partially furnished at the time of inspection. Furniture, rugs, wall hangings, and stored items obstruct the visual inspection of the floors, walls, and electrical outlets. Hidden defects may exist behind these obstructions. A thorough walk-through is recommended once the seller vacates.',
              recommendation: 'N/A',
              severity: 'Information'
            },
            {
              title: 'Water Stain (Tested Dry)',
              description: 'Water staining was observed on the ceiling/wall surface. The area was tested with a moisture meter and read as DRY at the time of inspection. This typically indicates a past leak (roof or plumbing) that has since been repaired.',
              recommendation: 'Recommend consulting with the current owner to confirm the history of the leak and the repairs made before cosmetically painting over the stain.',
              severity: 'Information'
            },
            {
              title: 'Active Moisture Intrusion (Elevated Reading)',
              description: 'Elevated moisture was observed on the wall, ceiling, or floor. A moisture meter was used and confirmed active, elevated moisture levels. Trapped water damages the underlying structure and creates conditions conducive to microbial growth and wood-destroying insects.',
              recommendation: 'Recommend immediate evaluation and repair by a qualified contractor to stop the leak, followed by damage remediation.',
              severity: 'Major'
            },
            {
              title: 'Potential Microbial Growth',
              description: 'Dark, biological discoloration (potential microbial growth) was observed on interior surfaces. This is typically due to active/prior water intrusion, inadequate ventilation, or excess humidity. Determining the specific type of growth requires laboratory testing.',
              recommendation: 'Recommend further evaluation, testing, and remediation by a qualified mold/environmental remediation contractor.',
              severity: 'Safety'
            },
            {
              title: 'Evidence of Pests / Rodents',
              description: 'Evidence of pests (droppings, chew marks, or insect damage) was observed in the interior. Pests can cause serious health problems and significant damage to the underlying framing and electrical wiring.',
              recommendation: 'Recommend further evaluation and full treatment by a licensed pest control contractor.',
              severity: 'Major'
            },
            {
              title: 'Failed Window Thermal Seal (Condensation)',
              description: 'Condensation or hazing was observed between the glass panes of one or more insulated windows. This indicates that the thermal seal has failed and the insulating inert gas has leaked out, reducing the window\'s energy efficiency.',
              recommendation: 'Recommend a qualified window contractor replace the affected insulated glass units (the glass pane itself, not necessarily the entire frame).',
              severity: 'Minor'
            },
            {
              title: 'Loose Interior Handrail',
              description: 'An interior stairway handrail was loose or not properly secured to the wall framing. This presents a serious fall hazard, as it will not support a person\'s weight if they stumble.',
              recommendation: 'Recommend a qualified contractor properly secure the handrail to the wall studs immediately.',
              severity: 'Safety'
            },
            {
              title: 'Doors Rubbing / Out of Square',
              description: 'One or more interior doors fail to shut, rub against the frame, or will not latch properly. While sometimes just swollen wood, this can also indicate normal house settlement or underlying framing movement.',
              recommendation: 'Recommend a handyman or carpenter adjust the doors and strike plates for proper operation.',
              severity: 'Maintenance'
            },
          ]
        },
        {
          name: 'Electrical',
          icon_key: 'Zap',
          fields: [
            { key: 'electrical_service_entry', label: 'Service Entry / Drop', type: 'select', options: ['Overhead', 'Underground / Lateral', 'Not Visible'] },
            { key: 'electrical_panel_location', label: 'Main Panel Location', type: 'text' },
            { key: 'electrical_amps', label: 'Service Amperage (Amps)', type: 'select', options: ['100 Amps', '150 Amps', '200 Amps', '400 Amps', 'Unknown'] },
            { key: 'electrical_wiring_type', label: 'Branch Wiring Type', type: 'select', options: ['Copper (Non-Metallic Sheathed)', 'Aluminum', 'Knob and Tube', 'BX / Armored Cable'] },
            { key: 'electrical_panel_brand', label: 'Panel Manufacturer', type: 'select', options: ['Square D', 'Siemens', 'Eaton / Cutler-Hammer', 'GE', 'Federal Pacific (FPE)', 'Zinsco', 'Other'] },
          ],
          presets: [
            {
              title: 'Limitation of Scope: Inoperable Lights',
              description: 'One or more light fixtures did not respond to the switch at the time of inspection. While this is most commonly a burned-out bulb, the inspector does not remove covers or replace bulbs to verify. If replacing the bulb does not fix the issue, consult an electrician.',
              recommendation: 'Replace bulbs upon moving in; consult an electrician if fixtures remain inoperable.',
              severity: 'Information'
            },
            {
              title: 'Smoke & Carbon Monoxide Detectors',
              description: 'While some detectors may have been observed, verifying the expiration dates and interconnected functionality of all smoke/CO alarms is outside the scope of this inspection. Modern standards require smoke alarms in every sleeping room and CO alarms on every level with fuel-burning appliances.',
              recommendation: 'Recommend the buyer install fresh batteries, test all units, and replace any detectors older than 10 years immediately upon taking possession of the home.',
              severity: 'Information'
            },
            {
              title: 'Burn Marks / Arcing at Receptacle',
              description: 'Black burn marks or scorching were observed on the face of one or more electrical outlets. This is a clear indication of electrical arcing, which is caused by worn internal connections or faulty wiring and presents an immediate fire hazard.',
              recommendation: 'Recommend replacing worn outlets and evaluating the circuit by a licensed electrician.',
              severity: 'Safety'
            },
            {
              title: 'Double-Tapped Circuit Breakers',
              description: 'Multiple electrical wires were observed sharing a single circuit breaker terminal (double-tapping) inside the panel. Unless the breaker is specifically designed and rated to hold two wires, this creates a loose connection that can arc, overheat, and cause an electrical fire.',
              recommendation: 'Recommend a licensed electrician separate the connections by adding a breaker or pigtailing the wires.',
              severity: 'Safety'
            },
            {
              title: 'Hazardous Panel Brand Present',
              description: 'Observed a Federal Pacific Stab-Lok or Zinsco electrical panel. These specific panels have a well-documented history of breakers failing to trip during an overload, creating a severe fire hazard. Many insurance companies will not write a policy if these are present.',
              recommendation: 'Recommend immediate evaluation and complete panel replacement by a licensed electrician.',
              severity: 'Safety'
            },
            {
              title: 'Missing GFCI Protection',
              description: 'Receptacles located within 6 feet of water sources (kitchens, bathrooms, exterior, garage) lack Ground Fault Circuit Interrupter (GFCI) protection. GFCI devices are essential life-safety components designed to prevent fatal electric shocks in wet areas.',
              recommendation: 'Recommend a licensed electrician install GFCI protection at all required locations.',
              severity: 'Safety'
            },
            {
              title: 'Missing Cover Plates',
              description: 'One or more electrical outlets, switches, or junction boxes are missing their plastic cover plates. This leaves live electrical wiring exposed and presents a severe shock hazard, especially to children.',
              recommendation: 'Recommend installing proper cover plates on all exposed electrical boxes.',
              severity: 'Safety'
            },
          ],
        },
        {
          name: 'Plumbing',
          icon_key: 'Droplets',
          fields: [
            { key: 'plumbing_supply', label: 'Water Supply Piping', type: 'select', options: ['Copper', 'PEX', 'CPVC', 'Polybutylene', 'Galvanized Iron'] },
            { key: 'plumbing_waste', label: 'Waste Piping Material', type: 'select', options: ['PVC', 'ABS', 'Cast Iron', 'Galvanized'] },
            { key: 'plumbing_heater_source', label: 'Water Heater Fuel', type: 'select', options: ['Natural Gas', 'Electric', 'Liquid Propane (LP)', 'Tankless Gas', 'Tankless Electric'] },
            { key: 'plumbing_sump', label: 'Sump Pump Present', type: 'select', options: ['Yes - Functional', 'Yes - Not Functional / Disconnected', 'No Sump Pump'] },
            { key: 'plumbing_fuel', label: 'Main Fuel Shut-off', type: 'select', options: ['At Gas Meter (Exterior)', 'Propane Tank', 'None / All Electric'] },
          ],
          presets: [
            {
              title: 'Limitation of Scope: Concealed Plumbing & Buried Tanks',
              description: 'The inspector cannot view plumbing pipes inside walls, under floors, or underground. Buried oil/fuel tanks are not always readily apparent and are outside the scope of a standard inspection. We cannot guarantee against future leaks in concealed areas.',
              recommendation: 'Consult with the current owner regarding the presence of any known underground storage tanks.',
              severity: 'Information'
            },
            {
              title: 'Limitation of Scope: Future Gas Leaks',
              description: 'At the time of the inspection, no gas leaks were detected at visible and accessible connections. However, gas leaks can develop suddenly over time due to wear, corrosion, or appliance movement.',
              recommendation: 'Regular maintenance and immediate evacuation/utility notification upon smelling gas is required.',
              severity: 'Information'
            },
            {
              title: 'Sewer Scope Recommended (Add-On Service)',
              description: 'Due to the age of the home or the presence of mature trees, a video sewer scope inspection of the lateral line to the street is highly recommended. This can uncover hidden cracks, root intrusion, and blockages that are costly to repair.',
              recommendation: 'Contact us or a qualified plumbing contractor to schedule a sewer scope inspection before closing.',
              severity: 'Information'
            },
            {
              title: 'Active Pipe Leak',
              description: 'An active leak was observed at plumbing connections. Trapped water behind floors, walls, and/or ceilings is highly conducive to biogrowth (mold) and structural wood rot.',
              recommendation: 'Recommend a licensed plumber repair the leaking pipe immediately and assess surrounding areas for hidden damage.',
              severity: 'Major'
            },
            {
              title: 'CSST Gas Line Bonding Not Verified',
              description: 'Corrugated Stainless Steel Tubing (CSST) gas lines were observed. CSST must be properly electrically bonded to the grounding system to prevent arc-induced holes and fires in the event of a nearby lightning strike. Bonding could not be verified.',
              recommendation: 'Recommend immediate evaluation and proper bonding by a licensed electrical or plumbing contractor.',
              severity: 'Safety'
            },
            {
              title: 'Loose Toilet / Wax Ring Failure',
              description: 'A toilet was loose at the floor mounting. A loose toilet indicates that the wax ring seal is likely compromised, which allows wastewater to slowly leak into and rot the subfloor over time.',
              recommendation: 'Recommend a licensed plumber remove the toilet, replace the wax ring, and properly secure it to the floor flange.',
              severity: 'Major'
            },
            {
              title: 'Water Heater Expansion Tank Unsupported',
              description: 'The thermal expansion tank on the water heater is not properly strapped or supported. The weight of a water-filled expansion tank puts extreme stress on the pipe fittings, which will eventually snap and cause a catastrophic leak.',
              recommendation: 'Recommend a qualified plumber properly strap and support the expansion tank.',
              severity: 'Minor'
            },
            {
              title: 'Missing Tub/Shower Caulking',
              description: 'Gaps in the caulking/grout were observed around the tub or shower enclosure. Left unsealed, water will migrate behind the tile or enclosure, causing hidden wood rot and mold inside the wall cavity.',
              recommendation: 'Recommend applying a waterproof silicone caulk to seal these areas immediately.',
              severity: 'Maintenance'
            },
          ],
        },
        {
          name: 'HVAC',
          icon_key: 'Wind',
          fields: [
            { key: 'hvac_heating_type', label: 'Heating System Type', type: 'select', options: ['Split System (Furnace)', 'Heat Pump', 'Boiler / Hydronic', 'Ductless Mini-Split', 'None'] },
            { key: 'hvac_cooling_type', label: 'Cooling System Type', type: 'select', options: ['Central Air (A/C)', 'Heat Pump', 'Ductless Mini-Split', 'Window / Wall Units', 'None'] },
            { key: 'hvac_energy', label: 'Energy / Fuel Source', type: 'select', options: ['Natural Gas', 'Electric', 'Liquid Propane (LP)', 'Oil'] },
            { key: 'hvac_age', label: 'Approximate System Age', type: 'select', options: ['0-5 Years', '5-10 Years', '10-15 Years', '15-20 Years (Near End of Life)', '20+ Years'] },
            { key: 'hvac_thermostat', label: 'Thermostat Operation', type: 'select', options: ['Functional / Responded', 'Did Not Respond', 'Not Tested (Utilities Off)'] },
          ],
          presets: [
            {
              title: 'Limitation of Scope: Not a Warranty',
              description: 'The heating and cooling systems were operated using normal user controls and found to be functional at the time of inspection. This visual inspection evaluates current condition only and is not a guarantee or warranty of future performance. HVAC systems can fail at any time without warning.',
              recommendation: 'Recommend having the HVAC system fully serviced by a licensed professional prior to closing, and maintaining an annual service contract.',
              severity: 'Information'
            },
            {
              title: 'HVAC System Near End of Service Life',
              description: 'The heating and/or cooling equipment is at or near its typical 15-20 year service life expectancy. While it may be functioning now, older units operate less efficiently and carry a significantly higher risk of sudden failure.',
              recommendation: 'Recommend budgeting for system replacement and having a licensed HVAC technician perform a full evaluation.',
              severity: 'Maintenance'
            },
            {
              title: 'Inadequate Cooling (Low Delta-T)',
              description: 'The air conditioning system appeared to provide inadequate cooling. When tested, the temperature differential (Delta-T) between the supply air and return air was outside the acceptable range of 14°F to 22°F. This indicates a potential refrigerant leak, failing compressor, or severe duct leakage.',
              recommendation: 'Recommend further evaluation and repair by a licensed HVAC professional.',
              severity: 'Major'
            },
            {
              title: 'Rust / Corrosion on Furnace Cabinet',
              description: 'Rust and corrosion were observed on the interior/exterior of the furnace cabinet. This is typically the result of a condensate leak, improper exhaust venting, or a cracked heat exchanger (which is a severe carbon monoxide hazard).',
              recommendation: 'Recommend immediate evaluation and repair by a licensed HVAC contractor.',
              severity: 'Safety'
            },
            {
              title: 'Condensate Drain Leak',
              description: 'A condensate leak or active moisture was observed near the indoor HVAC air handler. This is commonly caused by a clogged drain line or a loose fitting, and can lead to significant water damage to the surrounding structure.',
              recommendation: 'Recommend a licensed HVAC technician clear the condensate line and verify the safety float switch is operational.',
              severity: 'Major'
            },
          ],
        },
        {
          name: 'Appliances & Laundry',
          icon_key: 'Coffee',
          fields: [
            { key: 'appliance_range', label: 'Range / Oven Fuel Source', type: 'select', options: ['Electric', 'Natural Gas', 'Propane'] },
            { key: 'appliance_dryer', label: 'Dryer Power / Fuel', type: 'select', options: ['Electric (3-Prong)', 'Electric (4-Prong)', 'Natural Gas', 'Not Present'] },
            { key: 'appliance_washer', label: 'Washer Drain Type', type: 'select', options: ['Standpipe', 'Laundry Tub / Sink', 'Not Visible', 'Not Present'] },
            { key: 'appliance_tested', label: 'Appliances Tested', type: 'select', options: ['Basic Operational Test Conducted', 'Not Tested - Utilities Off'] },
          ],
          presets: [
            {
              title: 'Limitation of Scope: Concealed Appliance Leaks',
              description: 'Appliances were operated through a basic cycle. However, home inspections are non-invasive. Heavy appliances (refrigerators, washing machines) were not moved, and bottom kick-plates on dishwashers were not removed. Hidden leaks or floor damage may exist beneath or behind these units.',
              recommendation: 'Monitor appliances closely during the first few days of occupancy.',
              severity: 'Information'
            },
            {
              title: 'Anti-Tip Bracket Missing',
              description: 'The kitchen range is missing an anti-tip bracket. Without this safety device securely fastened to the floor or wall, the oven can tip forward if weight is applied to the open door, creating a severe crush and burn hazard for children.',
              recommendation: 'Recommend immediate installation of an approved anti-tip bracket.',
              severity: 'Safety'
            },
            {
              title: 'Dishwasher Not Secured',
              description: 'The dishwasher is not properly secured to the underside of the countertop or adjacent cabinetry. This causes the unit to tip forward when the loaded racks are pulled out, which can damage the water supply line and cause leaks.',
              recommendation: 'Recommend a handyman or installer properly secure the dishwasher using the appropriate mounting brackets.',
              severity: 'Minor'
            },
            {
              title: 'Overhead Microwave Improperly Mounted',
              description: 'The overhead microwave / range hood is loose or improperly secured to the upper cabinetry or wall bracket. This presents a serious safety hazard if the heavy unit were to detach and fall onto the cooking surface below.',
              recommendation: 'Recommend a qualified contractor properly secure the microwave immediately.',
              severity: 'Safety'
            },
            {
              title: 'Dishwasher High Loop Missing',
              description: 'The dishwasher drain hose lacks a proper "high loop" under the sink. Without this loop routing the hose up to the counter level before connecting to the drain, wastewater from the sink can siphon back into the clean dishwasher.',
              recommendation: 'Recommend a plumber or handyman route the drain hose properly to prevent contamination.',
              severity: 'Minor'
            },
            {
              title: 'Active Appliance Leak',
              description: 'An active water leak was observed during the operation of an appliance (dishwasher, refrigerator water line, or washing machine).',
              recommendation: 'Recommend a qualified appliance repair technician or plumber evaluate and repair immediately to prevent damage to the surrounding floors and cabinetry.',
              severity: 'Major'
            },
          ],
        },
        {
          name: 'Garage',
          icon_key: 'Car',
          fields: [
            { key: 'garage_type', label: 'Garage Type', type: 'select', options: ['Attached', 'Detached', 'Built-In', 'Carport'] },
            { key: 'garage_door_type', label: 'Vehicle Door Type', type: 'select', options: ['Sectional Overhead', 'Tilt-Up / One-Piece', 'Roll-up Metal', 'Swing-Out'] },
            { key: 'garage_opener', label: 'Automatic Opener', type: 'select', options: ['Functional', 'Not Functional', 'Manual Operation Only (No Opener)'] },
            { key: 'garage_floor', label: 'Floor Material', type: 'select', options: ['Poured Concrete', 'Asphalt', 'Dirt / Gravel', 'Epoxy Coated'] }
          ],
          presets: [
            {
              title: 'Limitation of Scope: Stored Items / Clutter',
              description: 'A significant amount of stored items, boxes, or vehicles severely limited the visual inspection of the garage floor, walls, and electrical outlets. We cannot inspect what we cannot see. Hidden defects or damage may exist behind stored items.',
              recommendation: 'Recommend a careful walk-through of this area by the buyer during the final pre-closing walk-through once the seller has cleared the space.',
              severity: 'Information'
            },
            {
              title: 'Auto-Reverse Safety Feature Failed',
              description: 'The garage door opener auto-reverse safety mechanism failed to reverse when obstructed during testing. This is a severe crush hazard, particularly for small children and pets.',
              recommendation: 'Recommend immediate adjustment or replacement of the garage door opener sensors/force limiters by a qualified garage door technician.',
              severity: 'Safety'
            },
            {
              title: 'Door to Living Space Not Fire Rated',
              description: 'The door separating the garage from the interior living space does not appear to be a proper fire-rated solid core door, or it is missing an automatic self-closing hinge. This compromises the fire-separation wall required to delay a garage fire from spreading into the home.',
              recommendation: 'Recommend replacing the door with a proper fire-rated unit with self-closing hardware.',
              severity: 'Safety'
            },
            {
              title: 'Garage Floor Cracks / Settlement',
              description: 'Cracking and minor settlement were observed in the concrete garage floor slab. Because the garage is an unconditioned space subject to temperature fluctuations and vehicle weight, minor cracking is considered typical.',
              recommendation: 'Recommend sealing cracks with an appropriate masonry sealant to prevent moisture intrusion and freeze/thaw expansion, and monitoring for future movement.',
              severity: 'Maintenance'
            },
            {
              title: 'Drywall Damage in Fire Separation Wall',
              description: 'Damage, holes, or unsealed penetrations were observed in the drywall on the wall separating the garage from the living space. This breaches the required fire-separation barrier.',
              recommendation: 'Recommend a drywall contractor patch and tape all holes with fire-rated drywall compound (fire-taping) to restore the fire barrier.',
              severity: 'Major'
            }
          ],
        }
      ],
    };

    template = this.templateRepository.create({ name: 'Full Residential (InterNACHI)', structure });
    await this.templateRepository.save(template);
    return template;
  }

  async ensureFourPointTemplate(): Promise<Template> {
    let template = await this.templateRepository.findOne({ where: { name: '4-Point Insurance Inspection' } });
    if (template) {
      await this.templateRepository.remove(template);
    }
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
            { key: 'electrical_panel_brand', label: 'Panel Manufacturer / Brand', type: 'select', options: ['Square D', 'Siemens', 'Cutler-Hammer / Eaton', 'GE (General Electric)', 'Federal Pacific (FPE) Stab-Lok', 'Zinsco', 'Challenger', 'Other / Obsolete'] },
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
            { key: 'plumbing_supply', label: 'Water Supply Piping', type: 'select', options: ['Copper', 'PEX', 'CPVC', 'PVC', 'Polybutylene', 'Galvanized Iron', 'Lead', 'Mixed / Multiple'] },
            { key: 'plumbing_waste', label: 'Waste Piping Material', type: 'select', options: ['PVC', 'ABS', 'Cast Iron', 'Galvanized', 'Clay', 'Orangeburg', 'Unknown'] },
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
            { key: 'hvac_type', label: 'Heating System Type', type: 'select', options: ['Forced Air Gas Furnace', 'Heat Pump', 'Electric Baseboard / Strip', 'Boiler / Hydronic', 'No Permanent Heat Source'] },
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
    return template;
  }

  async ensureWindMitigationTemplate(): Promise<Template> {
    let template = await this.templateRepository.findOne({ where: { name: 'Wind Mitigation Inspection' } });
    if (template) {
      await this.templateRepository.remove(template);
    }

    const structure = {
      sections: [
        {
          name: 'Roof Covering',
          icon_key: 'ChevronUp',
          fields: [
            { key: 'roof_covering_material', label: 'Roof Covering Material', type: 'select', options: ['Asphalt Shingles', 'Concrete Tile', 'Clay Tile', 'Metal', 'Built-up / Flat'] },
            { key: 'roof_permit_date', label: 'Permit Date of Roof Installation', type: 'text' },
            { key: 'roof_fbc_compliance', label: 'FBC Compliance', type: 'select', options: ['FBC Compliant', 'Non-FBC Compliant', 'Unknown'] },
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
            { key: 'deck_attachment', label: 'Roof Deck Attachment', type: 'select', options: ['6d Nails / Staples', '8d Common Nails @ 6"/12"', '8d Common Nails @ 6"/6"', 'Dimensional Lumber / Screws', 'Other / Unknown'] },
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
            { key: 'connection_type', label: 'Roof to Wall Connection', type: 'select', options: ['Toenails', 'Clips', 'Single Wraps', 'Double Wraps', 'Structural Anchor Bolts'] },
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
            { key: 'roof_shape', label: 'Roof Shape', type: 'select', options: ['Hip Roof (>= 90% of perimeter)', 'Gable', 'Flat', 'Mansard', 'Gambrel', 'Other'] },
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
            { key: 'opening_windows', label: 'Window Protection Type', type: 'select', options: ['A. Certified Impact Rated (Windborne Debris)', 'B. Non-Impact Rated / Standard', 'C. No Protection / Plywood', 'N/A (No Openings)'] },
            { key: 'opening_doors', label: 'Door Protection Type', type: 'select', options: ['A. Certified Impact Rated (Windborne Debris)', 'B. Non-Impact Rated / Standard', 'C. No Protection / Plywood', 'N/A (No Openings)'] },
            { key: 'opening_garage', label: 'Garage Door Rating', type: 'select', options: ['Not Rated', 'Wind Rated', 'Impact Rated'] },
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
