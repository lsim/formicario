<script setup lang="ts">
import TeamChooser from '@/components/TeamChooser.vue';
import { ref } from 'vue';

const props = defineProps<{
  isRunning: boolean;
  isPaused: boolean;
}>();

const stepSize = ref(1);

const emit = defineEmits<{
  (event: 'start-game'): void;
  (event: 'stop-game'): void;
  (event: 'pause-game'): void;
  (event: 'resume-game'): void;
  (event: 'step-game', stepSize: number): void;
  (event: 'update:teams', teams: { name: string; code: string }[]): void;
}>();

function start() {
  emit('start-game');
}

function stop() {
  emit('stop-game');
}

function pause() {
  emit('pause-game');
}

function resume() {
  emit('resume-game');
}

function step() {
  emit('step-game', stepSize.value);
}
</script>

<template>
  <form>
    <div class="field is-grouped is-grouped-right">
      <div class="control" v-show="!props.isRunning">
        <button class="button is-primary" type="button" @click="start">Start game</button>
      </div>
      <div class="control" v-show="props.isRunning">
        <button class="button is-danger" type="button" @click="stop">Stop</button>
      </div>
      <div class="control" v-show="!props.isPaused && props.isRunning">
        <button class="button is-info" type="button" @click="pause">Pause</button>
      </div>
      <div class="control" v-show="props.isPaused && props.isRunning">
        <button class="button is-info" type="button" @click="resume">Resume</button>
      </div>
      <div
        class="field has-addons"
        v-show="(props.isPaused && props.isRunning) || !props.isRunning"
      >
        <div class="control">
          <button class="button is-info" type="button" @click="step">Step</button>
        </div>
        <div class="control">
          <input class="step-size input" type="number" v-model="stepSize" min="1" step="10" />
        </div>
      </div>
    </div>
    <div class="field is-grouped">
      <team-chooser @update:teams="emit('update:teams', $event)" />
    </div>
  </form>
</template>

<style scoped lang="scss">
.step-size {
  width: 5em;
}
</style>
