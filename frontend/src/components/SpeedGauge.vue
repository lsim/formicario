<script setup lang="ts">
import { faFrog, faTruckFast } from '@fortawesome/free-solid-svg-icons';
import { useGameStore } from '@/stores/game.ts';
import { ref, watch } from 'vue';

const gameStore = useGameStore();

const speedString = ref('50');

watch(
  () => speedString.value,
  (newSpeed) => {
    gameStore.speed = parseInt(newSpeed, 10);
  },
);
</script>

<template>
  <div class="navbar-item">
    <div class="field has-addons">
      <div class="control">
        <a class="button is-static is-medium">
          <span class="icon">
            <font-awesome-icon :icon="faFrog" />
          </span>
          <input type="range" min="0" max="100" v-model="speedString" class="the-slider" />
          <span class="icon">
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
}
</style>
