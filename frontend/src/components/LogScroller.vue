<script setup lang="ts">
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import { onBeforeUnmount, ref, watch } from 'vue';
import { useGameStore } from '@/stores/game.ts';

const worker = useWorker('debug-worker');
const gameStore = useGameStore();

const messages = ref<
  {
    index: number;
    message: string;
    turn: number;
    ant: string;
  }[]
>([]);

watch(
  () => gameStore.battleReplaying,
  (newVal) => {
    if (newVal) messages.value = [];
  },
);

const subscription = worker.testLogs$.subscribe(({ message, args, ant }) => {
  // Can have ant here too
  messages.value.unshift({
    index: ant.index!,
    message: `${message} ${(args || []).join(' ')}`,
    turn: ant.nextTurn!,
    ant: JSON.stringify(ant, null, 2),
  });
  if (messages.value.length > 100) {
    messages.value.pop();
  }
});

onBeforeUnmount(() => {
  subscription?.unsubscribe();
});
</script>

<template>
  <table class="table is-hoverable is-striped is-narrow">
    <tr v-for="(o, idx) in messages" :key="idx" :title="o.ant">
      <td>{{ o.turn }}</td>
      <td>{{ o.index }}</td>
      <td class="message-cell">
        {{ o.message }}
      </td>
    </tr>
  </table>
</template>

<style scoped lang="scss">
* {
  background-color: transparent;
  color: inherit;
}
.message-cell {
  width: 100%;
}
</style>
