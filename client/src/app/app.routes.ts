import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        // Wrap the home component with the dashboard header
        path: 'home',
        loadComponent: () => import('./features/dashboard/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        children: [
          {
             path: '',
             loadComponent: () => import('./features/dashboard/pages/home/home.component').then(m => m.HomeComponent),
          }
        ]
      },
      {
        path: 'schedule',
        loadComponent: () => import('./features/schedule/schedule.component').then(m => m.ScheduleComponent),
      },
      {
        path: 'inspections',
        loadChildren: () => import('./features/inspections/inspections.routes').then(m => m.INSPECTIONS_ROUTES),
      },
      {
        path: 'templates',
        loadChildren: () => import('./features/templates/templates.routes').then(m => m.TEMPLATES_ROUTES),
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES),
      },
    ],
  },
];
