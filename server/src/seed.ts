import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InspectorsService } from './inspectors/inspectors.service';
import { InspectionsService } from './inspections/inspections.service';
import { TemplatesService } from './templates/templates.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const inspectorsService = app.get(InspectorsService);
  const inspectionsService = app.get(InspectionsService);
  const templatesService = app.get(TemplatesService);

  console.log('Seeding Database...');

  // Create Dummy Inspector
  console.log('Creating Inspector...');
  let inspector = await inspectorsService.findByEmail('inspector@example.com');
  if (!inspector) {
    const salt = await bcrypt.genSalt();
    const password_hash = await bcrypt.hash('123456', salt);
    
    inspector = await inspectorsService.create({
      email: 'inspector@example.com',
      password_hash: password_hash,
      name: 'John Doe',
      company_name: 'Premium Home Inspections',
      phone: '555-123-4567',
      license_number: 'HI-12345',
    });
  }

  // Get Template
  console.log('Fetching Template...');
  const templates = await templatesService.findAll(inspector.id); // This actually fetches default templates because they don't have inspector_id
  const fullResidential = templates.find(t => t.name === 'Full Residential (InterNACHI)');
  
  if (!fullResidential) {
    console.error('Template not found! Did the application bootstrap correctly?');
    process.exit(1);
  }

  // Create Inspection
  console.log('Creating Inspection...');
  const inspection = await inspectionsService.create(inspector.id, {
    client_name: 'Jane Smith',
    client_email: 'jane.smith@example.com',
    client_phone: '555-987-6543',
    address: '123 Test Avenue, Springfield',
    year_built: 1995,
    square_footage: 2500,
    scheduled_date: new Date().toISOString(),
    agreed_price: 450,
    template_id: fullResidential.id,
  });

  console.log('Dummy Data Seeded Successfully!');
  console.log(`Inspector Email: inspector@example.com`);
  console.log(`Inspector Password: 123456`);
  console.log(`Inspection ID: ${inspection.id}`);

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Seeding failed', err);
  process.exit(1);
});
