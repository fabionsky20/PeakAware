/**
 * @file app.routes.ts
 * @description Configurazione delle routes dell'applicazione PeakAware.
 * Le route sotto /home e /educazione/* sono protette dal guard di autenticazione (US-20, US-01).
 */

import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Registrazione } from './features/auth/registrazione/registrazione';
import { Home } from './features/home/home';
import { QuizList } from './features/education/quiz-list/quiz-list';
import { QuizSessione } from './features/education/quiz-sessione/quiz-sessione';
import { QuizRisultato } from './features/education/quiz-risultato/quiz-risultato';
import { QuizForm } from './features/admin/quiz-form/quiz-form';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'registrazione', component: Registrazione },
  { path: 'home', component: Home, canActivate: [authGuard] },
  {
    path: 'educazione',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'quiz', pathMatch: 'full' },
      { path: 'quiz', component: QuizList },
      { path: 'sessione/:quizId', component: QuizSessione },
      { path: 'risultato', component: QuizRisultato },
    ]
  },
  { path: 'admin/quiz-form', component: QuizForm },
  { path: 'admin/quiz-form/:id', component: QuizForm },
  { path: '**', redirectTo: 'login' }
];
