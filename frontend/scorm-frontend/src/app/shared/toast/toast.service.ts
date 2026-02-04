import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warn' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
  timeout: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private counter = 0;
  readonly toasts = signal<ToastMessage[]>([]);

  private push(type: ToastType, message: string, timeout = 4500) {
    const id = ++this.counter;
    const entry: ToastMessage = { id, type, message, timeout };
    this.toasts.update((items) => [...items, entry]);

    if (timeout > 0) {
      setTimeout(() => this.dismiss(id), timeout);
    }
  }

  success(message: string, timeout?: number) {
    this.push('success', message, timeout);
  }

  error(message: string, timeout?: number) {
    this.push('error', message, timeout);
  }

  warn(message: string, timeout?: number) {
    this.push('warn', message, timeout);
  }

  info(message: string, timeout?: number) {
    this.push('info', message, timeout);
  }

  dismiss(id: number) {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }
}
