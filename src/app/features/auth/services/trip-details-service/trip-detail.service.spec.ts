import { TestBed } from '@angular/core/testing';

import { TripDetailService } from './trip-detail.service';

describe('TripDetailService', () => {
  let service: TripDetailService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TripDetailService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
