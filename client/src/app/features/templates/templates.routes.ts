import { Routes } from '@angular/router';

export const TEMPLATES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/templates-list/templates-list.component').then(m => m.TemplatesListComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/template-editor/template-editor.component').then(m => m.TemplateEditorComponent),
  },
];
