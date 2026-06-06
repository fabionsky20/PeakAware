import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [],
  templateUrl: './mobile-nav.html',
  styleUrl: './mobile-nav.css',
})
export class MobileNav {
  @Input() active = '';

  private router = inject(Router);
  isOpen = false;

  toggle(): void { this.isOpen = !this.isOpen; }
  close(): void { this.isOpen = false; }

  goTo(path: string): void {
    this.isOpen = false;
    this.router.navigate([path]);
  }
}
