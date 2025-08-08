<script setup lang="ts">
import {
  faFastForward,
  faPause,
  faPlay,
  faStepForward,
  faStop,
} from '@fortawesome/free-solid-svg-icons';

import { computed } from 'vue';
import { useGameStore } from '@/stores/game.ts';
import { BattleState } from '@/composables/single-battle.ts';
const gameStore = useGameStore();

// When a battle state is given, that is what is being controlled
const props = defineProps<{
  battleState?: BattleState;
  size?: 'small' | 'medium';
}>();

const emit = defineEmits<{
  (e: 'start'): void;
  (e: 'step'): void;
}>();

const running = computed(() => !!props.battleState || gameStore.gameRunning);

function start() {
  emit('start');
}

function pause() {
  if (props.battleState) {
    props.battleState.pause();
  } else {
    gameStore.pause();
  }
}

function step() {
  emit('step');
}

function stop() {
  if (props.battleState) {
    props.battleState.stop();
  } else {
    gameStore.stop();
  }
}

function skipBattle() {
  if (props.battleState) {
    props.battleState.stop();
  } else {
    gameStore.skipBattle();
  }
}

function resume() {
  if (props.battleState) {
    props.battleState.resume();
  } else {
    gameStore.resume();
  }
}

const isPaused = computed(() =>
  !!props.battleState ? props.battleState.isPaused : gameStore.gamePaused,
);
</script>

<template>
  <div class="navbar-item has-addons">
    <div class="field has-addons">
      <div class="control">
        <button
          class="button is-success"
          type="button"
          @click="start"
          :disabled="running"
          :class="{
            'is-loading': running,
            'is-small': size === 'small',
            'is-medium': size === 'medium',
          }"
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
          class="button is-danger"
          type="button"
          @click="stop"
          title="[Escape]"
          :disabled="!running"
          :class="{
            'is-small': size === 'small',
            'is-medium': size === 'medium',
          }"
        >
          <span class="icon"><font-awesome-icon :icon="faStop" /></span>
        </button>
      </div>
      <div class="control">
        <button
          class="button is-info"
          type="button"
          @click="skipBattle"
          :disabled="!running"
          :class="{
            'is-small': size === 'small',
            'is-medium': size === 'medium',
          }"
        >
          <span class="icon">
            <font-awesome-icon :icon="faFastForward" />
          </span>
        </button>
      </div>
      <div class="control" v-show="!isPaused && running">
        <button
          class="button is-info"
          type="button"
          @click="pause"
          :class="{
            'is-small': size === 'small',
            'is-medium': size === 'medium',
          }"
        >
          <span class="icon">
            <font-awesome-icon :icon="faPause" />
          </span>
        </button>
      </div>
      <div class="control" v-show="isPaused && running">
        <button
          class="button is-info"
          type="button"
          @click="resume"
          :class="{
            'is-small': size === 'small',
            'is-medium': size === 'medium',
          }"
        >
          <span class="icon">
            <font-awesome-icon :icon="faPlay" />
          </span>
        </button>
      </div>
      <div class="control">
        <button
          class="button is-info"
          type="button"
          @click="step"
          :disabled="!isPaused && running"
          title="[Shift + Space]"
          :class="{
            'is-small': size === 'small',
            'is-medium': size === 'medium',
          }"
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
