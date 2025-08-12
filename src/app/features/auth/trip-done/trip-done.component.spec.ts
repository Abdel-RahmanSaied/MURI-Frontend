import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripDoneComponent } from './trip-done.component';

describe('TripDoneComponent', () => {
  let component: TripDoneComponent;
  let fixture: ComponentFixture<TripDoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripDoneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripDoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
