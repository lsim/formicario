<script setup lang="ts">
import Worker from '../workers/worker?worker';

const worker = new Worker();

worker.onmessage = (e) => {
  console.log('Worker sent message', e.data);
};

async function doStuff() {
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
    },
  });
}
</script>

<template>
  <button @click="doStuff">Do stuff</button>
  <button @click="doStuff">Do stuff</button>
</template>

<style scoped></style>
