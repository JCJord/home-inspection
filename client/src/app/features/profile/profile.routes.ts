import { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/settings-layout/settings-layout.component').then(m => m.SettingsLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full'
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
      },
      {
        path: 'compliance',
        loadComponent: () => import('./pages/compliance/report-compliance.component').then(m => m.ReportComplianceComponent),
      }
    ]
  },
];
