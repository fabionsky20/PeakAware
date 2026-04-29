import { TestBed } from '@angular/core/testing';
import { App } from './app'; 

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App], // I componenti standalone vanno negli imports
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    // Modifica 'PeakAware' con il testo che hai effettivamente messo nel tuo h1
    expect(compiled.querySelector('h1')?.textContent).toContain('PeakAware');
  });
});