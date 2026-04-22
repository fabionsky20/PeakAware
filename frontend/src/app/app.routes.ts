/**
 * @file app.routes.ts
 * @description Configurazione delle routes dell'applicazione PeakAware.
 * Definisce la navigazione tra i componenti principali.
 */

import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { RegistrazioneComponent } from './features/auth/registrazione/registrazione';
import { QuizListComponent } from './features/education/quiz-list/quiz-list';
import { QuizFormComponent } from './features/admin/quiz-form/quiz-form';


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'registrazione', component: RegistrazioneComponent },
  { path: 'quiz', component: QuizListComponent },
  { path: 'admin/quiz-form', component: QuizFormComponent },
  { path: 'admin/quiz-form/:id', component: QuizFormComponent },
  { path: '**', redirectTo: 'login' }
];