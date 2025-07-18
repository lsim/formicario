<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import GameSetup from '@/components/GameSetup.vue';
import type { GameSummary } from '@/GameSummary.ts';
import { toObserver } from '@vueuse/rxjs';
import { tap } from 'rxjs';
import BattleSummary from '@/components/BattleSummary.vue';
import GameControls from '@/components/GameControls.vue';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import { useGameStore } from '@/stores/game.ts';
import LiveBattleView from '@/components/LiveBattleView.vue';

const gameSummary = ref<GameSummary>();

const worker = useWorker();
const gameStore = useGameStore();

const subscription = worker.gameSummarySubject
  .pipe(tap(() => (gameStore.gameRunning = false)))
  .subscribe(toObserver(gameSummary));

// TODO: Figure out a way to parallelize battles to multiple workers (perhaps a master worker managing the big picture with a couple of slaves?). Difficulty: battle state cannot be easily split up without bending the original rules
// TODO: Collect samples of kills/losses/born, so we can graph them after the battle to help explain the result. Maybe they can even be live?

onBeforeUnmount(() => {
  subscription?.unsubscribe();
});
</script>

<template>
  <div class="columns" :class="{ 'game-running': gameStore.gameRunning }">
    <div class="column">
      <Teleport to="#navbarMenu">
        <game-controls />
      </Teleport>
      <game-setup class="game-setup" />
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
      <div class="game-summary" v-if="gameSummary">
        <h2>Previous game</h2>
        <div class="stat">Seed: {{ gameSummary.seed }}</div>
        <template v-for="(battle, index) in gameSummary.battles" :key="index">
          <h3>Battle {{ index + 1 }}</h3>
          <battle-summary :battle="battle" />
          <hr />
        </template>
      </div>
    </div>
    <div class="column">
      <Transition name="battle-feed">
        <live-battle-view />
        <!-- TODO: slide live view (from right) in when a battle is running? -->
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
  transition: transform 0.5s ease;
}
.game-running {
  .game-setup {
    transform: translateX(-120%);
  }
}
</style>
