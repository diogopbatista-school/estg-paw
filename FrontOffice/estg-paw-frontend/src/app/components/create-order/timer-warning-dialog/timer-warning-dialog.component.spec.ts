import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimerWarningDialogComponent } from './timer-warning-dialog.component';

describe('TimerWarningDialogComponent', () => {
  let component: TimerWarningDialogComponent;
  let fixture: ComponentFixture<TimerWarningDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimerWarningDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimerWarningDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
