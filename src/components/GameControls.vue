<script setup lang="ts">
import {
  faFastForward,
  faPause,
  faPlay,
  faStepForward,
  faStop,
} from '@fortawesome/free-solid-svg-icons';

import { ref } from 'vue';
import { useMagicKeys, whenever } from '@vueuse/core';
import { useGameStore } from '@/stores/game.ts';
const { enter, shift_space, escape } = useMagicKeys();
const gameStore = useGameStore();

whenever(enter, () => gameStore.start());

whenever(shift_space, () => gameStore.step(stepSize.value));

whenever(escape, stop);

const stepSize = ref(1);
</script>

<template>
  <div class="field has-addons">
    <div class="control">
      <button
        class="button is-medium is-success"
        type="button"
        @click="() => gameStore.start()"
        :disabled="gameStore.gameRunning"
        :class="{ 'is-loading': gameStore.gameRunning }"
        title="[Enter]"
      >
        <span class="icon" v-if="!gameStore.gameRunning">
          <font-awesome-icon :icon="faPlay" />
        </span>
        <template v-else> &nbsp; &nbsp; </template>
      </button>
    </div>
    <div class="control">
      <button
        class="button is-medium is-danger"
        type="button"
        @click="gameStore.stop"
        title="[Escape]"
        :disabled="!gameStore.gameRunning"
      >
        <span class="icon"><font-awesome-icon :icon="faStop" /></span>
      </button>
    </div>
    <div class="control">
      <button
        class="button is-medium is-info"
        type="button"
        @click="gameStore.skipBattle"
        :disabled="!gameStore.gameRunning"
      >
        <span class="icon">
          <font-awesome-icon :icon="faFastForward" />
        </span>
      </button>
    </div>
    <div class="control" v-show="!gameStore.gamePaused && gameStore.gameRunning">
      <button class="button is-medium is-info" type="button" @click="gameStore.pause">
        <span class="icon">
          <font-awesome-icon :icon="faPause" />
        </span>
      </button>
    </div>
    <div class="control" v-show="gameStore.gamePaused && gameStore.gameRunning">
      <button class="button is-medium is-info" type="button" @click="gameStore.resume">
        <span class="icon">
          <font-awesome-icon :icon="faPlay" />
        </span>
      </button>
    </div>
    <div class="control">
      <button
        class="button is-medium is-info"
        type="button"
        @click="() => gameStore.step(stepSize)"
        :disabled="gameStore.gameRunning && !gameStore.gamePaused"
        title="[Shift + Space]"
      >
        <span class="icon">
          <font-awesome-icon :icon="faStepForward" />
        </span>
      </button>
    </div>
    <div class="control">
      <input class="step-size input is-medium" type="number" v-model="stepSize" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.step-size.input {
  width: 5em;
}

.field {
  margin-bottom: 1em;
  // white drop-shadow for emphasis
  filter: drop-shadow(0 0 1em rgba(white, 0.5));
}
</style>
