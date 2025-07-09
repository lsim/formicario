<script setup lang="ts">
import Worker from '../workers/worker?worker';
import BattleFeed from '@/components/BattleFeed.vue';
import type { BattleStatus, GameSummary } from '@/GameSummary.ts';
import { ref } from 'vue';
import type { GameSpec } from '@/GameSpec.ts';
import BattleArgs from '@/components/BattleArgs.vue';
import TeamBattleStats from '@/components/TeamBattleStats.vue';
import GameSetup from '@/components/GameSetup.vue';

const worker = new Worker();

worker.onmessage = (e) => {
  if (e.data.type === 'battle-status') {
    gameRunning.value = true;
    battleStatus.value = e.data.status;
  } else if (e.data.type === 'game-summary') {
    gameRunning.value = false;
    gameSummary.value = e.data.results;
  } else {
    console.log('Worker sent unhandled message', e.data);
  }
};

const battleStatus = ref<BattleStatus>();
const gameSummary = ref<GameSummary>();

const seed = ref(42);
const selectedTeamCodes = ref<string[]>([]);
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
  battleStatus.value = undefined;
  worker.postMessage({
    type: 'run-game',
    game: {
      ...gameSpec,
      teams: Array.from(selectedTeamCodes.value),
      seed: seed.value,
      statusInterval: statusInterval.value,
    },
    pause: gamePaused.value,
  });
  seed.value++;
}

async function stopGame() {
  battleStatus.value = undefined;
  gameRunning.value = false;
  worker.postMessage({
    type: 'stop-game',
  });
}

async function pauseGame() {
  gamePaused.value = true;
  worker.postMessage({
    type: 'pause-game',
  });
}

async function resumeGame() {
  gamePaused.value = false;
  worker.postMessage({
    type: 'resume-game',
  });
}

async function stepGame(stepSize: number) {
  gamePaused.value = true;
  if (!gameRunning.value) {
    await startGame();
  } else {
    worker.postMessage({
      type: 'step-game',
      stepSize,
    });
  }
}
</script>

<template>
  <div class="ui segment">
    <game-setup
      :is-running="gameRunning"
      :is-paused="gamePaused"
      @start-game="startGame"
      @stop-game="stopGame"
      @pause-game="pauseGame"
      @resume-game="resumeGame"
      @step-game="stepGame"
      @update:teams="selectedTeamCodes = $event.map((t) => t.code)"
    />
    <label>Status interval <input type="number" v-model="statusInterval" /></label>
    <label>Seed <input type="number" v-model="seed" /></label>
    <battle-feed class="battle-feed" v-if="battleStatus" :battle="battleStatus" />
    <team-battle-stats
      class="team-stats"
      v-if="battleStatus"
      :teams="battleStatus.teams"
      :turn="battleStatus.turns"
      :tps="battleStatus.turnsPerSecond"
    />
    <battle-args class="battle-args" v-if="battleStatus" :battle-status="battleStatus" />
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
</template>

<style scoped lang="scss">
.battle-feed {
  //border: 5px solid rgba(white, 0.5);
}
</style>
