import { TestBed } from '@angular/core/testing';

import { PublicReport } from './public-report';

describe('PublicReport', () => {
  let service: PublicReport;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PublicReport);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
