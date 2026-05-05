/**
 * @file app.routes.ts
 * @description Configurazione delle routes dell'applicazione PeakAware.
 * Definisce la navigazione tra i componenti principali.
 */

import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Registrazione } from './features/auth/registrazione/registrazione';
import { QuizList } from './features/education/quiz-list/quiz-list';
import { QuizForm } from './features/admin/quiz-form/quiz-form';
import { SentieriShell } from '@features/sentieri/sentieri-shell';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'registrazione', component: Registrazione },
  { path: 'quiz', component: QuizList },
 {path: 'sentieri', component: SentieriShell},
  { path: 'admin/quiz-form', component: QuizForm },
  { path: 'admin/quiz-form/:id', component: QuizForm },
  { path: '**', redirectTo: 'login' }
];