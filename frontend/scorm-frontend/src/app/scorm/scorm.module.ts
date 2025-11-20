import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SCORM_ROUTES } from './scorm.routes';


@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(SCORM_ROUTES )
  ]
})
export class ScormModule {}
