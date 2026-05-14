import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotizieForm } from './notizie-form';

describe('NotizieForm', () => {
  let component: NotizieForm;
  let fixture: ComponentFixture<NotizieForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotizieForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotizieForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});