import { defineStore } from 'pinia';
import { ref } from 'vue';

declare type Modal = {
  resolve: () => void;
  reject?: (reason: unknown) => void;
};

export const useModalsStore = defineStore('modals', () => {
  const activeModal = ref<Modal | null>(null);

  function showModal(resolveFn: () => void, rejectFn?: (reason: unknown) => void) {
    activeModal.value = { resolve: resolveFn, reject: rejectFn };
  }

  function closeModal() {
    activeModal.value?.resolve?.();
    activeModal.value = null;
  }

  return { showModal, closeModal, activeModal };
});
