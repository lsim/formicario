<script setup lang="ts">
import Worker from '../workers/worker?worker';
import BattleFeed from '@/components/BattleFeed.vue';
import type { BattleStatus } from '@/GameSummary.ts';
import { ref, watch } from 'vue';
import type { GameSpec } from '@/GameSpec.ts';
import BattleArgs from '@/components/BattleArgs.vue';

const worker = new Worker();

worker.onmessage = (e) => {
  if (e.data.type === 'battle-status') {
    if (!gameRunning.value) return;
    battleStatus.value = e.data.status;
  } else {
    console.log('Worker sent message', e.data);
  }
};

const battleStatus = ref<BattleStatus>();

const pause = ref(false);
const seed = ref(42);

async function loadAnt(name: string) {
  return (await import(`../../ants/${name}.js?raw`)).default;
}

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
  const reluctant = await loadAnt('reluctAnt');
  const infant = await loadAnt('infAnt');
  const theDoctor = await loadAnt('TheDoctor');
  const bayimayi = await loadAnt('BayiMayi');
  const firkAnt = await loadAnt('FirkAnt');
  const lightCore3 = await loadAnt('LightCore3');
  worker.postMessage({
    type: 'run-game',
    game: {
      ...gameSpec,
      teams: [lightCore3, firkAnt, bayimayi],
      seed: seed.value,
      statusInterval: 1,
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
  <label>Pause <input type="checkbox" v-model="pause" /></label>
  <label>Seed <input type="number" v-model="seed" /></label>
  <button @click="startGame">Start</button>
  <button @click="stopGame">Stop</button>
  <button @click="stepGame">Step</button>
  <battle-feed class="battle-feed" v-if="battleStatus" :battle="battleStatus" />
  <battle-args class="battle-args" v-if="battleStatus" :battle-status="battleStatus" />
</template>

<style scoped lang="scss">
.battle-feed {
  border: 5px solid rgba(white, 0.5);
}
</style>
