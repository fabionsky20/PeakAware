/**
 * @file sentieri-shell.ts
 * @description Shell che compone mappa + sidebar sincronizzata.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './components/map/map';
import { SidebarComponent } from '@features/sentieri/components/trail-list/sidebar';
import { ProfileButton } from './components/profile-button/profile-button';

@Component({
  selector: 'app-sentieri-shell',
  standalone: true,
  imports: [CommonModule, MapComponent, SidebarComponent, ProfileButton],
  templateUrl : "./sentieri-shell.html",
  styleUrl: "./sentieri-shell.css",
  
 })
export class SentieriShell {}