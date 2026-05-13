import { Routes } from '@angular/router';

export const INSPECTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/inspections/inspections.component').then(m => m.InspectionsComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/inspection-form/inspection-form.component').then(m => m.InspectionFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/inspection-form/inspection-form.component').then(m => m.InspectionFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/inspection-details/inspection-details.component').then(m => m.InspectionDetailsComponent),
  },
  {
    path: ':id/findings/new',
    loadComponent: () => import('./pages/finding-details/finding-details.component').then(m => m.FindingDetailsComponent),
  },
  {
    path: ':id/findings/:findingId',
    loadComponent: () => import('./pages/finding-details/finding-details.component').then(m => m.FindingDetailsComponent),
  },
];
