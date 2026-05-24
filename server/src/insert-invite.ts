import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { InviteCodeService } from './auth/invite-code.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const inviteCodeService = app.get(InviteCodeService);

  console.log('Generating Beta Invite Code...');
  
  const inviteCode = await inviteCodeService.generateCode({
    maxUses: 100,
    notes: 'Generated for testing',
  });

  console.log('Successfully generated Invite Code:');
  console.log(`\x1b[32m${inviteCode.code}\x1b[0m`);
  console.log(`Max Uses: ${inviteCode.max_uses}`);

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Failed to generate invite code', err);
  process.exit(1);
});
