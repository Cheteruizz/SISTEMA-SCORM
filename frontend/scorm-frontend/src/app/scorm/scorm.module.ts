import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ScormRoutes } from './scorm.routes';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(ScormRoutes)
  ]
})
export class ScormModule {}
