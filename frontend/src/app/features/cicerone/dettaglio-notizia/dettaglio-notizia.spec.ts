import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DettaglioNotizia } from './dettaglio-notizia';

describe('DettaglioNotizia', () => {
  let component: DettaglioNotizia;
  let fixture: ComponentFixture<DettaglioNotizia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DettaglioNotizia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DettaglioNotizia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
