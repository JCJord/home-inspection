import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'inspections',
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent), // placeholder
      },
      {
        path: 'profile',
        loadChildren: () => import('../profile/profile.routes').then(m => m.PROFILE_ROUTES),
      },
    ],
  },
];
