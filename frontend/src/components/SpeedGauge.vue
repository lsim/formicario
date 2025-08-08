<script setup lang="ts">
import { faFrog, faTruckFast } from '@fortawesome/free-solid-svg-icons';
import { ref, watch } from 'vue';
import { useWorker, type WorkerName } from '@/workers/WorkerDispatcher.ts';

const props = defineProps<{
  workerName: WorkerName;
}>();

const worker = useWorker(props.workerName);

const speedString = ref(worker.speed.value.toString());

watch(
  () => speedString.value,
  (newSpeed) => {
    worker.setSpeed(parseInt(newSpeed, 10));
  },
);

function decreaseSpeed() {
  speedString.value = Math.max(parseInt(speedString.value) - 10, 1).toString();
}

function increaseSpeed() {
  speedString.value = Math.min(parseInt(speedString.value) + 10, 100).toString();
}
</script>

<template>
  <div>
    <div class="field has-addons">
      <div class="control">
        <a class="button is-static is-medium">
          <span class="icon" @click="decreaseSpeed">
            <font-awesome-icon :icon="faFrog" />
          </span>
          <input type="range" min="1" max="100" v-model="speedString" class="the-slider" />
          <span class="icon" @click="increaseSpeed">
            <font-awesome-icon :icon="faTruckFast" />
          </span>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.the-slider {
  pointer-events: all;
  width: 100%;
}

.button span {
  cursor: pointer;
  pointer-events: all;
}
</style>
