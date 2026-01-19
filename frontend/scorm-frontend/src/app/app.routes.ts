import { Routes } from '@angular/router';
import { HomeComponent } from './scorm/pages/home/home.component';
import { LayoutComponent } from './scorm/pages/layout/layout';
import { MetadataComponent } from './scorm/pages/metadata/metadata';
import { OrganizationsComponent } from './scorm/pages/organizations/organizations';
import { PreviewComponent } from './scorm/pages/preview/preview';
import { ResourcesComponent } from './scorm/pages/resources/resources';
import { ValidationComponent } from './scorm/pages/validation/validation';
import { HistoryComponent } from './scorm/pages/history/history';

export const routes: Routes = [
  {
    path: 'scorm',
    loadChildren: () =>
      import('./scorm/scorm.module').then(m => m.ScormModule)
  },
  {
    path: 'home',
    component: HomeComponent
  },
  {
    path: 'layout',
    component: LayoutComponent
  },
  {
    path: 'metadata',
    component: MetadataComponent
  },
  {
    path: 'organizations',
    component: OrganizationsComponent
  },
  {
    path: 'preview',
    component: PreviewComponent
  },
  {
    path: 'resources',
    component: ResourcesComponent
  },
  {
    path: 'validation',
    component: ValidationComponent
  },
  {
    path: 'history',
    component: HistoryComponent
  },
  {
    path: 'editor-sco',
    loadComponent: () =>
      import('./scorm/pages/sco-editor/sco-editor').then(m => m.ScoEditorComponent),
  },
  {
    path: 'importar',
    loadComponent: () =>
      import('./scorm/pages/import/import').then(m => m.ImportComponent),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
