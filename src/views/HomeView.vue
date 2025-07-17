<script setup lang="ts">
import BattleFeed from '@/components/BattleFeed.vue';
import { ref } from 'vue';
import type { GameSpec } from '@/GameSpec.ts';
import BattleArgs from '@/components/BattleArgs.vue';
import TeamBattleStats from '@/components/TeamBattleStats.vue';
import GameSetup from '@/components/GameSetup.vue';
import AntDebugger from '@/components/AntDebugger.vue';
import {
  startGame as startGameWorker,
  stopGame as stopGameWorker,
  pauseGame as pauseGameWorker,
  resumeGame as resumeGameWorker,
  stepGame as stepGameWorker,
  skipBattle as skipBattleWorker,
  gameSummarySubject,
} from '@/workers/WorkerDispatcher.ts';
import type { RunGameCommand } from '@/workers/WorkerMessage.ts';
import type { GameSummary } from '@/GameSummary.ts';
import { toObserver } from '@vueuse/rxjs';
import { tap } from 'rxjs';
import { useTeamStore } from '@/stores/teams.ts';
import BattleSummary from '@/components/BattleSummary.vue';

const gameSummary = ref<GameSummary>();

const teamStore = useTeamStore();

gameSummarySubject.pipe(tap(() => (gameRunning.value = false))).subscribe(toObserver(gameSummary));

const lastError = ref<string[]>([]);

const seed = ref((Math.random() * 4294967295) >>> 0);
const statusInterval = ref(20);
const numBattles = ref(3);
const liveFeed = ref(true);

const gameSpec: Partial<GameSpec> = {
  mapWidth: [256, 256],
  mapHeight: [256, 256],
  newFoodSpace: [10, 20],
  newFoodMin: [10, 30],
  newFoodDiff: [5, 20],
  halfTimeTurn: 10000,
  halfTimePercent: 60,
  startAnts: [15, 40],
  timeOutTurn: 20000,
  winPercent: 75,
};

// TODO: Figure out a way to parallelize battles to multiple workers (perhaps a master worker managing the big picture with a couple of slaves?). Difficulty: battle state cannot be easily split up without bending the original rules
// TODO: Collect samples of kills/losses/born, so we can graph them after the battle to help explain the result. Maybe they can even be live?

const gameRunning = ref(false);
const gamePaused = ref(false);

async function startGame() {
  if (teamStore.battleTeams.length === 0) {
    lastError.value = ['No teams selected'];
    return;
  }
  const message = {
    game: {
      ...gameSpec,
      teams: [...teamStore.battleTeams.map((t) => ({ name: t.name, code: t.code }))],
      seed: seed.value,
      statusInterval: !liveFeed.value ? -1 : statusInterval.value,
      numBattles: numBattles.value,
    },
    pause: gamePaused.value,
  };
  gameRunning.value = true;
  await startGameWorker(message as Omit<RunGameCommand, 'id' | 'type'>);
  seed.value++;
}

async function stopGame() {
  gameRunning.value = false;
  gamePaused.value = false;
  await stopGameWorker();
}

async function skipBattle() {
  await skipBattleWorker();
}

async function pauseGame() {
  gamePaused.value = true;
  await pauseGameWorker();
}

async function resumeGame() {
  gamePaused.value = false;
  await resumeGameWorker();
}

async function stepGame(stepSize: number) {
  gamePaused.value = true;
  if (!gameRunning.value) {
    await startGame();
  } else {
    await stepGameWorker(stepSize);
  }
}
</script>

<template>
  <div class="columns">
    <div class="column">
      <game-setup
        :is-running="gameRunning"
        :is-paused="gamePaused"
        @start-game="startGame"
        @stop-game="stopGame"
        @pause-game="pauseGame"
        @resume-game="resumeGame"
        @step-game="stepGame"
        @skip-battle="skipBattle"
        v-model:status-interval="statusInterval"
        v-model:seed="seed"
        v-model:num-battles="numBattles"
        v-model:live-feed="liveFeed"
      />
      <div class="box" v-if="lastError.length">
        <h3>Last error</h3>
        <div class="notification is-danger is-family-code" v-for="error in lastError" :key="error">
          <pre>{{ error }}</pre>
        </div>
      </div>
    </div>
    <div class="column">
      <Transition name="battle-feed">
        <div class="box" v-if="gameRunning && liveFeed">
          <battle-feed class="control battle-feed" />
          <ant-debugger class="control ant-debugger" v-if="gameRunning && gamePaused" />
        </div>
      </Transition>
      <team-battle-stats class="team-stats" v-if="gameRunning && liveFeed" />
      <battle-args class="battle-args" v-if="gameRunning" />
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
</style>
