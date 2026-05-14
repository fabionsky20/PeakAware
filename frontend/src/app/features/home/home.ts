import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfileButton } from '../../features/sentieri/components/profile-button/profile-button';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, ProfileButton],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  
  constructor(
    private router: Router,
  ) {}

  vaiA(path: string): void { this.router.navigate([path]); }

}