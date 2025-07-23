<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import GameSetup from '@/components/GameSetup.vue';
import type { GameSummary } from '@/GameSummary.ts';
import { map, switchAll, tap } from 'rxjs';
import GameControls from '@/components/GameControls.vue';
import { useGameStore } from '@/stores/game.ts';
import LiveBattleView from '@/components/LiveBattleView.vue';
import { type BattleSummaryStats } from '@/composables/stats.ts';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import Toaster from '@/components/MessageToaster.vue';
import GameSummaryUi from '@/components/GameSummaryUi.vue';

const gameSummary = ref<GameSummary>();

const worker = useWorker();
const gameStore = useGameStore();

const gameStats = ref<BattleSummaryStats[]>([]);

const subscription = gameStore.battleStreams$
  .pipe(
    map(([, stats]) => stats),
    switchAll(),
    tap((bss) => gameStats.value.unshift(bss)),
  )
  .subscribe();

const subscription2 = worker.gameSummarySubject$.subscribe(
  (summary) => (gameSummary.value = summary),
);

onBeforeUnmount(() => {
  subscription.unsubscribe();
  subscription2.unsubscribe();
});

// TODO: parallelize separate battles to a configurable number of separate workers
</script>

<template>
  <div class="columns" :class="{ 'game-running': gameStore.gameRunning }">
    <div class="column">
      <toaster />
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
    </div>
    <div class="column">
      <Transition name="battle-feed">
        <live-battle-view v-if="gameStore.gameRunning" />
        <!-- TODO: slide live view in (from right) when a battle is running? -->
      </Transition>
    </div>
    <!--    <authenticator />-->
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
  transition: transform 0.5s ease;
}
.game-running {
  .game-setup {
    transform: translateX(-120%);
  }
}
</style>
