import { ref } from 'vue';

export type ToastType = 'celebrate' | 'is-success' | 'is-danger' | 'is-info' | 'is-warning';

export class Toast {
  constructor(
    public id: string,
    public message: string,
    public type: ToastType,
    public duration: number = 3000,
    public title?: string,
  ) {}
}

const activeToasts = ref<Toast[]>([]);

export default function useToast() {
  function show(message: string, type: ToastType, duration: number = 5000, title: string = '') {
    const id = crypto.randomUUID();
    const toast = new Toast(id, message, type, duration, title);
    activeToasts.value.push(toast);

    setTimeout(() => {
      activeToasts.value = activeToasts.value.filter((t) => t.id !== id);
    }, duration);
  }

  return {
    show,
    activeToasts,
  };
}
