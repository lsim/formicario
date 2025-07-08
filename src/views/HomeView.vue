<script setup lang="ts">
import Worker from '../workers/worker?worker';
import BattleFeed from '@/components/BattleFeed.vue';
import type { BattleStatus, GameSummary } from '@/GameSummary.ts';
import { ref, watch } from 'vue';
import type { GameSpec } from '@/GameSpec.ts';
import BattleArgs from '@/components/BattleArgs.vue';
import TeamBattleStats from '@/components/TeamBattleStats.vue';
import TeamChooser from '@/components/TeamChooser.vue';

const worker = new Worker();

worker.onmessage = (e) => {
  if (e.data.type === 'battle-status') {
    if (!gameRunning.value) return;
    battleStatus.value = e.data.status;
  } else if (e.data.type === 'game-summary') {
    gameSummary.value = e.data.results;
  } else {
    console.log('Worker sent unhandled message', e.data);
  }
};

const battleStatus = ref<BattleStatus>();
const gameSummary = ref<GameSummary>();

const pause = ref(false);
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

async function startGame() {
  gameRunning.value = true;
  battleStatus.value = undefined;
  console.log('launching with teams', selectedTeamCodes.value);
  worker.postMessage({
    type: 'run-game',
    game: {
      ...gameSpec,
      teams: Array.from(selectedTeamCodes.value),
      seed: seed.value,
      statusInterval: statusInterval.value,
    },
    pause: pause.value,
  });
  seed.value++;
}

const gameRunning = ref(false);
async function stopGame() {
  gameRunning.value = false;
  battleStatus.value = undefined;
  worker.postMessage({
    type: 'stop-game',
  });
}

async function pauseGame() {
  worker.postMessage({
    type: 'pause-game',
  });
}

async function resumeGame() {
  worker.postMessage({
    type: 'resume-game',
  });
}

async function stepGame() {
  worker.postMessage({
    type: 'step-game',
  });
}

watch(
  () => pause.value,
  (newVal) => {
    if (newVal) {
      pauseGame();
    } else {
      resumeGame();
    }
  },
);
</script>

<template>
  <div class="ui segment">
    <label>Status interval <input type="number" v-model="statusInterval" /></label>
    <label>Pause <input type="checkbox" v-model="pause" /></label>
    <label>Seed <input type="number" v-model="seed" /></label>
    <button @click="startGame">Start</button>
    <button @click="stopGame">Stop</button>
    <button @click="stepGame">Step</button>
    <battle-feed class="battle-feed" v-if="battleStatus" :battle="battleStatus" />
    <team-battle-stats
      class="team-stats"
      v-if="battleStatus"
      :teams="battleStatus.teams"
      :turn="battleStatus.turns"
      :tps="battleStatus.turnsPerSecond"
    />
    <battle-args class="battle-args" v-if="battleStatus" :battle-status="battleStatus" />
    <team-chooser
      class="team-chooser"
      v-show="!gameRunning"
      @update:teams="selectedTeamCodes = $event"
    />
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
  border: 5px solid rgba(white, 0.5);
}
</style>
