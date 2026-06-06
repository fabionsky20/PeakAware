/**
 * @file sentieri-shell.ts
 * @description Shell che compone mappa + sidebar sincronizzata.
 * Integra l'header di navigazione coerente con il resto dell'app.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MapComponent } from './components/map/map';
import { SidebarComponent } from '@features/sentieri/components/trail-list/sidebar';
import { ProfileButton } from './components/profile-button/profile-button';
import { MobileNav } from '../../shared/mobile-nav/mobile-nav';

@Component({
  selector: 'app-sentieri-shell',
  standalone: true,
  imports: [CommonModule, MapComponent, SidebarComponent, ProfileButton, MobileNav],
  templateUrl : "./sentieri-shell.html",
  styleUrl: "./sentieri-shell.css",
 })
export class SentieriShell {
  sidebarOpen = false;

  constructor(private router: Router) {}

  vai(path: string): void {
    this.router.navigate([path]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}