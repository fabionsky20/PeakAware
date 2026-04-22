import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Registrazione } from './registrazione';

describe('Registrazione', () => {
  let component: Registrazione;
  let fixture: ComponentFixture<Registrazione>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Registrazione]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Registrazione);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
