/**
 * @file registrazione.ts
 * @description Componente Registrazione di PeakAware.
 * Gestisce la creazione di un nuovo account tramite AuthService.
 * Corrisponde al metodo registrati() della classe Utente (D2 sezione 2.2).
 */

import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-registrazione',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './registrazione.html',
  styleUrl: './registrazione.css'
})
export class Registrazione {

  username: string = '';
  email: string = '';
  password: string = '';
  eta: number | null = null;

  errore: string = '';
  errorePassword: string = '';
  successo: string = '';
  caricamento: boolean = false;
  mostrarPw: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  validaPassword(): void {
    this.errorePassword = this.password.length > 0 && this.password.length < 6
      ? 'Almeno 6 caratteri richiesti.'
      : '';
  }

  onRegistrazione(): void {
    this.errore = '';
    this.errorePassword = '';
    this.successo = '';

    if (!this.username.trim()) {
      this.errore = 'Il campo username è obbligatorio.';
      return;
    }
    if (!this.email.trim() || !this.email.includes('@')) {
      this.errore = 'Inserisci un\'email valida.';
      return;
    }
    if (this.password.length < 6) {
      this.errorePassword = 'Almeno 6 caratteri richiesti.';
      return;
    }

    this.caricamento = true;

    this.authService.registrati(
      this.username,
      this.email,
      this.password,
      this.eta ?? undefined
    ).subscribe({
      next: (risposta) => {
        this.caricamento = false;
        if (risposta.successo) {
          this.successo = 'Registrazione avvenuta! Reindirizzamento...';
          setTimeout(() => this.router.navigate(['/home']), 1500);
        }
      },
      error: (err) => {
        this.caricamento = false;
        this.errore = err.error?.messaggio || 'Errore di connessione al server';
      }
    });
  }

  /**
   * Naviga alla pagina di login.
   */
  vaiALogin(): void {
    this.router.navigate(['/login']);
  }
}