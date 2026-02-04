import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Location } from '@angular/common';
import { ToastComponent } from './shared/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  protected readonly title = signal('scorm-frontend');

  get isHome(): boolean {
    const url = this.router.url || '';
    return url === '/' || url.startsWith('/home');
  }

  goBack() {
    this.location.back();
  }
}
