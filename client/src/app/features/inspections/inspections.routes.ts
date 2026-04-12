import { Routes } from '@angular/router';

export const INSPECTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/inspections/inspections.component').then(m => m.InspectionsComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/inspection-details/inspection-details.component').then(m => m.InspectionDetailsComponent),
  },
];
