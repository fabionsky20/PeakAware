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
  @Input() theme: 'navbar' | 'map' = 'navbar';
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  username = '';
  email = '';
  ruolo = '';
  punti = 0;
  livello = 1;
  nomeLivello = '';
  profiloAperto = false;
  cambiaPwAperto = false;
  pwAttuale = '';
  pwNuova = '';
  cambiaPwErrore = '';
  cambiaPwSuccesso = '';
  cambiaPwCaricamento = false;

  // ── Stati Contatto di Emergenza ───────────────────────────────────────────
  contattiEmergenza: any[] = [];
  contattoAperto = false;
  indiceInModifica: number | null = null; // Traccia quale elemento stiamo editando

  emergenzaNome = '';
  emergenzaTelefono = '';
  emergenzaEmail = '';
  emergenzaCondividi = true;
  
  emergenzaCaricamento = false;
  emergenzaErrore = '';
  emergenzaSuccesso = '';

  private apiUrl = 'http://localhost:3000/api/auth';

  get iniziali(): string {
    const u = this.username || this.email;
    if (!u) return '?';
    return u.length >= 2 ? u.substring(0, 2).toUpperCase() : u.toUpperCase();
  }

  ngOnInit() {
    const utente = this.authService.utente();
    this.username = utente?.username ?? '';
    this.email    = utente?.email    ?? this.authService.getEmail();
    this.ruolo    = this.authService.getRuolo();
    this.caricaProfilo();
  }

  private caricaProfilo() {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.get<any>(`${this.apiUrl}/profilo`, { headers }).subscribe({
      next: (r) => {
        if (r.successo) {
          this.punti       = r.dati.punti;
          this.livello     = r.dati.livello;
          this.nomeLivello = r.dati.nomeLivello ?? '';

          if (r.dati.contattiEmergenza && Array.isArray(r.dati.contattiEmergenza)) {
            this.contattiEmergenza = r.dati.contattiEmergenza;
          } else if (r.dati.contattiEmergenza) {
            this.contattiEmergenza = [r.dati.contattiEmergenza];
          }
        }
      },
      error: () => {}
    });
  }

  toggleProfilo() {
    this.profiloAperto = !this.profiloAperto;
    if (!this.profiloAperto) {
      this.chiudiSezioniInterne();
    }
  }

  chiudiProfilo() {
    this.profiloAperto = false;
    this.chiudiSezioniInterne();
  }

  toggleCambiaPw() {
    this.cambiaPwAperto = !this.cambiaPwAperto;
    if (this.cambiaPwAperto) {
      this.contattoAperto = false; 
    } else {
      this.resetCambiaPw();
    }
  }

  toggleContatto() {
    this.contattoAperto = !this.contattoAperto;
    if (this.contattoAperto) {
      this.cambiaPwAperto = false; 
      this.resetContattoForm(); // Resetta il form per l'inserimento di uno nuovo
    } else {
      this.resetContattoState();
    }
  }

  apriModificaContatto(index: number) {
    this.indiceInModifica = index;
    const contattoDaModificare = this.contattiEmergenza[index];
    
    this.emergenzaNome = contattoDaModificare.nome || '';
    this.emergenzaTelefono = contattoDaModificare.telefono || '';
    this.emergenzaEmail = contattoDaModificare.emailRegistrata || '';
    this.emergenzaCondividi = contattoDaModificare.condividiItinerario !== false;
    
    this.contattoAperto = true;
    this.cambiaPwAperto = false;
  }

  cambiaPassword() {
    if (!this.pwAttuale || !this.pwNuova) {
      this.cambiaPwErrore = 'Compila entrambi i campi.';
      return;
    }
    this.cambiaPwCaricamento = true;
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    this.http.put<any>(`${this.apiUrl}/cambia-password`, {
      passwordAttuale: this.pwAttuale, nuovaPassword: this.pwNuova
    }, { headers }).subscribe({
      next: (r) => {
        this.cambiaPwCaricamento = false;
        if (r.successo) {
          this.cambiaPwSuccesso = 'Password aggiornata.';
          this.pwAttuale = '';
          this.pwNuova = '';
        } else {
          this.cambiaPwErrore = r.messaggio;
        }
      },
      error: (err) => {
        this.cambiaPwCaricamento = false;
        this.cambiaPwErrore = err.error?.messaggio || 'Errore.';
      }
    });
  }

  salvaContatto() {
    if (!this.emergenzaNome || !this.emergenzaTelefono) {
      this.emergenzaErrore = 'Nome e Telefono sono obbligatori.';
      return;
    }

    this.emergenzaCaricamento = true;
    this.emergenzaErrore = '';
    this.emergenzaSuccesso = '';

    const nuovoContatto = {
      nome: this.emergenzaNome,
      telefono: this.emergenzaTelefono,
      emailRegistrata: this.emergenzaEmail || null,
      condividiItinerario: this.emergenzaCondividi
    };

    let contattiAggiornati = [...this.contattiEmergenza];

    if (this.indiceInModifica !== null) {
      contattiAggiornati[this.indiceInModifica] = nuovoContatto;
    } else {
      contattiAggiornati.push(nuovoContatto);
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });

    this.http.put<any>(`${this.apiUrl}/contatto-emergenza`, { contattiEmergenza: contattiAggiornati }, { headers }).subscribe({
      next: (res) => {
        this.emergenzaCaricamento = false;
        this.emergenzaSuccesso = 'Contatto salvato con successo.';
        this.contattiEmergenza = contattiAggiornati;

        setTimeout(() => {
          this.contattoAperto = false;
          this.resetContattoState();
        }, 1000);
      },
      error: (err) => {
        this.emergenzaCaricamento = false;
        this.emergenzaErrore = err.error?.message || 'Impossibile salvare il contatto.';
      }
    });
  }

  vaiGestisciLivelli() {
    this.chiudiProfilo();
    this.router.navigate(['/admin/livelli']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private chiudiSezioniInterne() {
    this.cambiaPwAperto = false;
    this.contattoAperto = false;
    this.resetCambiaPw();
    this.resetContattoState();
  }

  private resetCambiaPw() {
    this.pwAttuale = '';
    this.pwNuova = '';
    this.cambiaPwErrore = '';
    this.cambiaPwSuccesso = '';
    this.cambiaPwCaricamento = false;
  }

  private resetContattoForm() {
    this.indiceInModifica = null;
    this.emergenzaNome = '';
    this.emergenzaTelefono = '';
    this.emergenzaEmail = '';
    this.emergenzaCondividi = true;
  }

  private resetContattoState() {
    this.emergenzaErrore = '';
    this.emergenzaSuccesso = '';
    this.emergenzaCaricamento = false;
    this.resetContattoForm();
  }
}