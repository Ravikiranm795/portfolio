import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartupIdeasComponent } from './startup-ideas.component';

describe('StartupIdeasComponent', () => {
  let component: StartupIdeasComponent;
  let fixture: ComponentFixture<StartupIdeasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartupIdeasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StartupIdeasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
