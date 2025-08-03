<script setup lang="ts">
import {
  faFastForward,
  faPause,
  faPlay,
  faStepForward,
  faStop,
} from '@fortawesome/free-solid-svg-icons';

import { computed } from 'vue';
import { useMagicKeys, whenever } from '@vueuse/core';
import { useGameStore } from '@/stores/game.ts';
const { enter, shift_space, escape } = useMagicKeys();
const gameStore = useGameStore();

whenever(enter, () => gameStore.start());

whenever(shift_space, () => gameStore.step());

whenever(escape, () => gameStore.stop());

const running = computed(() => gameStore.gameRunning || gameStore.battleReplaying);
</script>

<template>
  <div class="navbar-item has-addons">
    <div class="field has-addons">
      <div class="control">
        <button
          class="button is-medium is-success"
          type="button"
          @click="() => gameStore.start()"
          :disabled="running"
          :class="{ 'is-loading': running }"
          title="[Enter]"
        >
          <span class="icon" v-if="!running">
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
          :disabled="!running"
        >
          <span class="icon"><font-awesome-icon :icon="faStop" /></span>
        </button>
      </div>
      <div class="control">
        <button
          class="button is-medium is-info"
          type="button"
          @click="gameStore.skipBattle"
          :disabled="!running"
        >
          <span class="icon">
            <font-awesome-icon :icon="faFastForward" />
          </span>
        </button>
      </div>
      <div class="control" v-show="!gameStore.gamePaused && running">
        <button class="button is-medium is-info" type="button" @click="gameStore.pause">
          <span class="icon">
            <font-awesome-icon :icon="faPause" />
          </span>
        </button>
      </div>
      <div class="control" v-show="gameStore.gamePaused && running">
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
          @click="() => gameStore.step()"
          :disabled="running && !gameStore.gamePaused"
          title="[Shift + Space]"
        >
          <span class="icon">
            <font-awesome-icon :icon="faStepForward" />
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.step-size.input {
  width: 5em;
}
</style>
