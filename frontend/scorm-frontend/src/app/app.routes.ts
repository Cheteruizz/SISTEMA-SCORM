import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'scorm',
    loadChildren: () =>
      import('./scorm/scorm.module').then(m => m.ScormModule)
  },
  {
    path: '',
    redirectTo: 'scorm',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'scorm'
  }
];
