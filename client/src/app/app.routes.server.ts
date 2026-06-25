import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'report/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home',
    renderMode: RenderMode.Client
  },
  {
    path: 'schedule',
    renderMode: RenderMode.Client
  },
  {
    path: 'inspections',
    renderMode: RenderMode.Client
  },
  {
    path: 'inspections/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'templates',
    renderMode: RenderMode.Client
  },
  {
    path: 'templates/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'reports',
    renderMode: RenderMode.Client
  },
  {
    path: 'settings',
    renderMode: RenderMode.Client
  },
  {
    path: 'settings/**',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
