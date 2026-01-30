import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ScormStateService } from '../services/scorm-state.service';
import { LayoutComponent } from './pages/layout/layout';

const requireProject = () => {
  const state = inject(ScormStateService);
  const router = inject(Router);
  return state.getProjectId() ? true : router.parseUrl('/metadata');
};

const requireStructure = () => {
  const state = inject(ScormStateService);
  const router = inject(Router);
  const hasProject = Boolean(state.getProjectId());
  const hasOrg = Boolean(state.getOrganizationId());
  return hasProject && hasOrg ? true : router.parseUrl('/metadata');
};

export const SCORM_ROUTES: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'metadata',
        loadComponent: () =>
          import('./pages/metadata/metadata').then(m => m.MetadataComponent),
      },
      {
        path: 'organizations',
        loadComponent: () =>
          import('./pages/organizations/organizations').then(m => m.OrganizationsComponent),
        canActivate: [requireProject],
      },
      {
        path: 'resources',
        loadComponent: () =>
          import('./pages/resources/resources').then(m => m.ResourcesComponent),
        canActivate: [requireStructure],
      },
      {
        path: 'preview',
        loadComponent: () =>
          import('./pages/preview/preview').then(m => m.PreviewComponent),
        canActivate: [requireStructure],
      },
      {
        path: 'editor-sco',
        loadComponent: () =>
          import('./pages/sco-editor/sco-editor').then(m => m.ScoEditorComponent),
        canActivate: [requireProject],
      },
      {
        path: 'importar',
        loadComponent: () =>
          import('./pages/import/import').then(m => m.ImportComponent),
      },
      {
        path: 'validation',
        loadComponent: () =>
          import('./pages/validation/validation').then(m => m.ValidationComponent),
      },
    ]
  }
];
