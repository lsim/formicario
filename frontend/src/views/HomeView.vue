<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import GameSetup from '@/components/GameSetup.vue';
import type { GameSummary } from '@/GameSummary.ts';
import { map, switchAll, tap } from 'rxjs';
import GameControls from '@/components/GameControls.vue';
import { useGameStore } from '@/stores/game.ts';
import { type BattleSummaryStats } from '@/composables/stats.ts';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import GameSummaryUi from '@/components/GameSummaryUi.vue';
import BattleView from '@/components/BattleView.vue';

const gameSummary = ref<GameSummary>();

const worker = useWorker();
const gameStore = useGameStore();

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

// TODO: parallelize separate battles to a configurable number of separate workers
</script>

<template>
  <div
    class="container is-max-tablet"
    :class="{
      'split-screen': gameStore.selectedBattleSummaryStats != null,
      'game-running': gameStore.gameRunning,
    }"
  >
    <Teleport to="#navbarMenu">
      <game-controls />
    </Teleport>
    <div class="game-setup">
      <game-setup />
      <game-summary-ui />
    </div>
    <div class="box" v-if="gameStore.lastError.length">
      <h3>Last error</h3>
      <div
        class="notification is-danger is-family-code"
        v-for="error in gameStore.lastError"
        :key="error"
      >
        <pre>{{ error }}</pre>
      </div>
    </div>
    <div class="battle-info">
      <Transition name="battle-feed">
        <battle-view
          class="battle-view"
          v-if="gameStore.selectedBattleSummaryStats != null || gameStore.gameRunning"
        />
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
.battle-feed-enter-active,
.battle-feed-leave-active {
  transition: all 0.2s ease;
}
.battle-feed-enter-from,
.battle-feed-leave-to {
  opacity: 0;
  transform: translateX(-1em);
}

// slide game setup out of view to the left when game is running
.game-setup {
  width: 100%;
  position: absolute;
  transition:
    transform 0.5s ease,
    opacity 0.5s ease;
}

.battle-info {
  width: 100%;
  position: absolute;
  transition: transform 0.5s ease;
  transform: translateX(200%);
}

.game-running {
  .game-setup {
    transform: translateX(-200%);
    opacity: 0;
  }
  .battle-info {
    transform: translateX(0);
  }
}

.split-screen {
  .game-setup {
    transform: translateX(-51%);
  }

  .battle-info {
    transform: translateX(51%);
  }
}
</style>
