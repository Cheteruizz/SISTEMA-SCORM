import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.html',
  styleUrls: ['./history.scss'],
})
export class HistoryComponent {
  private router = inject(Router);

  volver() {
    this.router.navigate(['/layout']);
  }
}
