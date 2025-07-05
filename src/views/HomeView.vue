<script setup lang="ts">
import Worker from '../workers/worker?worker';
import BattleFeed from '@/components/BattleFeed.vue';
import type { BattleStatus } from '@/GameSummary.ts';
import { ref } from 'vue';

const worker = new Worker();

worker.onmessage = (e) => {
  console.log('Worker sent message', e.data);
  if (e.data.type === 'battle-status') {
    battleStatus.value = e.data.status;
  }
};

const battleStatus = ref<BattleStatus>();

async function startGame() {
  const reluctant = (await import('@/../ants/ReluctAnt.js?raw')).default;
  worker.postMessage({
    type: 'run-game',
    game: {
      mapWidth: [250, 250],
      mapHeight: [250, 250],
      newFoodSpace: [10, 10],
      newFoodMin: [10, 10],
      newFoodDiff: [10, 10],
      halfTimeTurn: 10,
      halfTimePercent: 10,
      startAnts: [10, 10],
      teams: [reluctant],
      timeOutTurn: 20,
      winPercent: 10,
      seed: 10,
      statusInterval: 1,
    },
  });
}

async function stopGame() {
  worker.postMessage({
    type: 'stop-game',
  });
}
</script>

<template>
  <button @click="startGame">Start</button>
  <button @click="stopGame">Stop</button>
  <battle-feed v-if="battleStatus" :battle="battleStatus" />
</template>

<style scoped></style>
