import { Test, TestingModule } from '@nestjs/testing';
import { PublicReportsController } from './public-reports.controller';

describe('PublicReportsController', () => {
  let controller: PublicReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicReportsController],
    }).compile();

    controller = module.get<PublicReportsController>(PublicReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
