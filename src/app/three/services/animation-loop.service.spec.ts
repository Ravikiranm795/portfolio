import { TestBed } from '@angular/core/testing';

import { AnimationLoopService } from './animation-loop.service';

describe('AnimationLoopService', () => {
  let service: AnimationLoopService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnimationLoopService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
