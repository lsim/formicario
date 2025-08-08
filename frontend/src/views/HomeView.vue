<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import GameSetup from '@/components/GameSetup.vue';
import type { GameSummary } from '@/GameSummary.ts';
import { map, switchAll, tap } from 'rxjs';
import { useGameStore } from '@/stores/game.ts';
import { type BattleSummaryStats } from '@/composables/stats.ts';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import GameSummaryUi from '@/components/GameSummaryUi.vue';
import BattleView from '@/components/BattleView.vue';
import SpeedGauge from '@/components/SpeedGauge.vue';
import { useMagicKeys, whenever } from '@vueuse/core';
const { enter, shift_space, escape } = useMagicKeys();

const gameSummary = ref<GameSummary>();

const worker = useWorker('game-worker');
const gameStore = useGameStore();

whenever(enter, () => gameStore.start());

whenever(shift_space, () => gameStore.step());

whenever(escape, () => gameStore.stop());

const gameStats = ref<BattleSummaryStats[]>([]);

const subscription = gameStore.battleStreams$
  .pipe(
    map(([, stats]) => stats),
    switchAll(),
    tap((bss: BattleSummaryStats) => gameStats.value.unshift(bss)),
  )
  .subscribe();

const subscription2 = worker.gameSummaries$.subscribe((summary) => (gameSummary.value = summary));

onBeforeUnmount(() => {
  subscription.unsubscribe();
  subscription2.unsubscribe();
});
</script>

<template>
  <div class="container">
    <Teleport to="#navbarMenu">
      <speed-gauge class="navbar-item" :worker-name="'game-worker'" />
    </Teleport>
    <div class="fixed-grid has-2-cols">
      <div class="grid">
        <div class="cell">
          <game-setup />
        </div>
        <Transition name="from-the-right">
          <div
            class="cell is-row-span-2 is-col-start-2"
            v-if="gameStore.selectedBattleSummaryStats != null || gameStore.gameRunning"
          >
            <battle-view />
          </div>
        </Transition>
        <div class="cell is-row-span-2 is-col-start-1">
          <game-summary-ui />
        </div>
        <div class="cell" v-if="gameStore.lastError.length">
          <h3>Last error</h3>
          <div
            class="notification is-danger is-family-code"
            v-for="error in gameStore.lastError"
            :key="error"
          >
            <pre>{{ error }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.from-the-right-enter-active,
.from-the-right-leave-active {
  transition: all 0.3s ease-in-out;
}

.from-the-right-enter-from,
.from-the-right-leave-to {
  transform: translateX(100vw);
  opacity: 0;
}
</style>
