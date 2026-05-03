/**
 * @file login.ts
 * @description Componente Login di PeakAware.
 * Gestisce l'autenticazione dell'utente tramite AuthService.
 * Corrisponde al metodo login() della classe Utente (D2 sezione 2.2).
 */

import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  /** Valore del campo email nel form */
  email: string = '';

  /** Valore del campo password nel form */
  password: string = '';

  /** Messaggio di errore da mostrare all'utente */
  errore: string = '';

  /** Indica se la richiesta HTTP è in corso — disabilita il pulsante */
  caricamento: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Eseguito al submit del form.
   * Chiama AuthService.login() e naviga alla lista quiz se successo.
   */
  onLogin(): void {
    this.errore = '';
    this.caricamento = true;

    this.authService.login(this.email, this.password).subscribe({
      next: (risposta) => {
        this.caricamento = false;
        if (risposta.successo && risposta.dati) {
          // Salva il token JWT nel localStorage
          this.authService.salvaToken(risposta.dati.token);
          // Naviga alla pagina principale
          this.router.navigate(['/educazione/quiz']);
        }
      },
      error: (err) => {
        this.caricamento = false;
        // Mostra il messaggio di errore dal backend se disponibile
        this.errore = err.error?.messaggio || 'Errore di connessione al server';
      }
    });
  }

  /**
   * Naviga alla pagina di registrazione.
   */
  vaiARegistrazione(): void {
    this.router.navigate(['/registrazione']);
  }
}