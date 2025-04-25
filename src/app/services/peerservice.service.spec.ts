import { TestBed } from '@angular/core/testing';

import { PeerserviceService } from './peerservice.service';

describe('PeerserviceService', () => {
  let service: PeerserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PeerserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
