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
  gameSummarySubject,
} from '@/workers/WorkerDispatcher.ts';
import type { RunGameCommand } from '@/workers/WorkerMessage.ts';
import type { GameSummary } from '@/GameSummary.ts';
import { toObserver } from '@vueuse/rxjs';
import { tap } from 'rxjs';
import { useTeamStore } from '@/stores/teams.ts';

const gameSummary = ref<GameSummary>();

const teamStore = useTeamStore();

gameSummarySubject.pipe(tap(() => (gameRunning.value = false))).subscribe(toObserver(gameSummary));

const lastError = ref<string[]>([]);

const seed = ref(42);
const statusInterval = ref(20);

const gameSpec: Partial<GameSpec> = {
  mapWidth: [250, 500],
  mapHeight: [250, 500],
  newFoodSpace: [10, 50],
  newFoodMin: [10, 30],
  newFoodDiff: [5, 20],
  halfTimeTurn: 10000,
  halfTimePercent: 60,
  startAnts: [15, 40],
  timeOutTurn: 20000,
  winPercent: 75,
};

// TODO: BattleSummary could be sent after each battle. And if battlefeed is disengaged, it could include all pixels, so an end picture could be shown
// TODO: Figure out a way to parallelize battles to multiple workers (perhaps a master worker managing the big picture with a couple of slaves?). Difficulty: battle state cannot be easily split up without bending the original rules

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
      statusInterval: statusInterval.value,
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
        v-model:status-interval="statusInterval"
        v-model:seed="seed"
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
        <div class="box" v-if="gameRunning">
          <battle-feed class="control battle-feed" />
          <ant-debugger class="control ant-debugger" v-if="gameRunning && gamePaused" />
        </div>
      </Transition>
      <team-battle-stats class="team-stats" v-if="gameRunning" />
      <battle-args class="battle-args" v-if="gameRunning" />
      <div class="game-summary" v-if="gameSummary">
        <h2>Previous game</h2>
        <div class="stat">Seed: {{ gameSummary.seed }}</div>
        <template v-for="(battle, index) in gameSummary.battles" :key="index">
          <h3>Battle {{ index + 1 }}</h3>
          <div class="stat">Turns: {{ battle.turns }}</div>
          <div class="stat">Winner: {{ battle.winner }}</div>
          <div class="stat">Start time: {{ new Date(battle.startTime).toLocaleString() }}</div>
          <team-battle-stats class="team-stats" :teams="battle.teams" />
          <battle-args class="battle-args" :battle-status="battle" />
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
