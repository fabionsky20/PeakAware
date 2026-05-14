import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-button',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-button.html',
  styleUrl: './profile-button.css'
})
export class ProfileButton implements OnInit {
  @Input() theme: 'navbar' | 'map' = 'navbar'; // ← default navbar
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  email = '';
  ruolo = '';
  punti = 0;
  livello = 1;
  profiloAperto = false;
  cambiaPwAperto = false;
  pwAttuale = '';
  pwNuova = '';
  cambiaPwErrore = '';
  cambiaPwSuccesso = '';
  cambiaPwCaricamento = false;

  private apiUrl = 'http://localhost:3000/api/auth';

  get iniziale(): string {
    return this.email ? this.email[0].toUpperCase() : '?';
  }

  ngOnInit() {
    this.email = this.authService.getEmail();
    this.ruolo = this.authService.getRuolo();
    this.caricaProfilo();
  }

  private caricaProfilo() {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.get<any>(`${this.apiUrl}/profilo`, { headers }).subscribe({
      next: (r) => { if (r.successo) { this.punti = r.dati.punti; this.livello = r.dati.livello; } },
      error: () => {}
    });
  }

  toggleProfilo() {
    this.profiloAperto = !this.profiloAperto;
    if (!this.profiloAperto) { this.cambiaPwAperto = false; this.resetCambiaPw(); }
  }

  toggleCambiaPw() {
    this.cambiaPwAperto = !this.cambiaPwAperto;
    if (!this.cambiaPwAperto) this.resetCambiaPw();
  }

  cambiaPassword() {
    if (!this.pwAttuale || !this.pwNuova) { this.cambiaPwErrore = 'Compila entrambi i campi.'; return; }
    this.cambiaPwCaricamento = true;
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.put<any>(`${this.apiUrl}/cambia-password`, {
      passwordAttuale: this.pwAttuale, nuovaPassword: this.pwNuova
    }, { headers }).subscribe({
      next: (r) => {
        this.cambiaPwCaricamento = false;
        if (r.successo) { this.cambiaPwSuccesso = 'Password aggiornata.'; this.pwAttuale = ''; this.pwNuova = ''; }
        else { this.cambiaPwErrore = r.messaggio; }
      },
      error: (err) => {
        this.cambiaPwCaricamento = false;
        this.cambiaPwErrore = err.error?.messaggio || 'Errore.';
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private resetCambiaPw() {
    this.pwAttuale = ''; this.pwNuova = '';
    this.cambiaPwErrore = ''; this.cambiaPwSuccesso = '';
    this.cambiaPwCaricamento = false;
  }
}