<script setup lang="ts">

import Worker from '../workers/worker?worker';

const worker = new Worker();

worker.onmessage = (e) => {
  console.log('Worker sent message', e.data);
};

function doStuff() {
  worker.postMessage({ type: 'run-game', participants: ['foo', 'bar'] });
}

</script>

<template>
  <button @click="doStuff">Do stuff</button>
  <button @click="doStuff">Do stuff</button>
</template>

<style scoped>

</style>
