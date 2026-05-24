import { Test, TestingModule } from '@nestjs/testing';
import { PublicReportsService } from './public-reports.service';

describe('PublicReportsService', () => {
  let service: PublicReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicReportsService],
    }).compile();

    service = module.get<PublicReportsService>(PublicReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
