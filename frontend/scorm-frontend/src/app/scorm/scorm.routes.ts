import { Routes } from '@angular/router';
import { LayoutComponent } from './pages/layout/layout';

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
      },
      {
        path: 'resources',
        loadComponent: () =>
          import('./pages/resources/resources').then(m => m.ResourcesComponent),
      },
      {
        path: 'preview',
        loadComponent: () =>
          import('./pages/preview/preview').then(m => m.PreviewComponent),
      },
      {
        path: 'validation',
        loadComponent: () =>
          import('./pages/validation/validation').then(m => m.ValidationComponent),
      },
    ]
  }
];
