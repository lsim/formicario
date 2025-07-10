<script setup lang="ts">
import TeamChooser from '@/components/TeamChooser.vue';
import { ref } from 'vue';
import { useMagicKeys, whenever } from '@vueuse/core';

const props = defineProps<{
  isRunning: boolean;
  isPaused: boolean;
  selectedTeams: number;
  statusInterval: number;
  seed: number;
}>();

const emit = defineEmits<{
  (event: 'start-game'): void;
  (event: 'stop-game'): void;
  (event: 'pause-game'): void;
  (event: 'resume-game'): void;
  (event: 'step-game', stepSize: number): void;
  (event: 'update:teams', teams: { name: string; code: string }[]): void;
  (event: 'update:status-interval', statusInterval: number): void;
  (event: 'update:seed', seed: number): void;
}>();

const stepSize = ref(1);

const { enter, shift_space, escape } = useMagicKeys();

whenever(enter, start);

whenever(shift_space, step);

whenever(escape, stop);

function start() {
  if (props.isRunning) return;
  if (props.isPaused) {
    resume();
  } else {
    emit('start-game');
  }
}

function stop() {
  if (!props.isRunning) return;
  emit('stop-game');
}

function pause() {
  emit('pause-game');
}

function resume() {
  emit('resume-game');
}

function step() {
  if (props.isRunning && !props.isPaused) {
    pause();
    return;
  } else if (props.isRunning) {
    emit('step-game', stepSize.value);
  }
}
</script>

<template>
  <form>
    <div class="field is-grouped">
      <div class="control" v-show="!props.isRunning">
        <button
          class="button is-primary"
          type="button"
          @click="start"
          :disabled="!selectedTeams"
          title="[Enter]"
        >
          Start game
        </button>
      </div>
      <div class="control" v-show="props.isRunning">
        <button class="button is-danger" type="button" @click="stop" title="[Escape]">Stop</button>
      </div>
      <div class="control" v-show="!props.isPaused && props.isRunning">
        <button class="button is-info" type="button" @click="pause" :disabled="!selectedTeams">
          Pause
        </button>
      </div>
      <div class="control" v-show="props.isPaused && props.isRunning">
        <button class="button is-info" type="button" @click="resume" :disabled="!selectedTeams">
          Resume
        </button>
      </div>
      <div
        class="field has-addons"
        v-show="(props.isPaused && props.isRunning) || !props.isRunning"
      >
        <div class="control">
          <button
            class="button is-info"
            type="button"
            @click="step"
            :disabled="!selectedTeams"
            title="[Shift + Space]"
          >
            Step
          </button>
        </div>
        <div class="control">
          <input class="step-size input" type="number" v-model="stepSize" min="1" step="10" />
        </div>
      </div>
    </div>
    <team-chooser @update:teams="emit('update:teams', $event)" />
    <div class="field">
      <div class="control">
        <label class="label"
          >Status interval
          <input
            class="input"
            type="number"
            :value="statusInterval"
            @input="
              emit(
                'update:status-interval',
                ($event.target as HTMLInputElement).value
                  ? parseInt(($event.target as HTMLInputElement).value, 10)
                  : 0,
              )
            "
        /></label>
      </div>
    </div>
    <div class="field">
      <div class="control">
        <label class="label"
          >Seed
          <input
            class="input"
            type="number"
            :value="seed"
            @input="
              emit(
                'update:seed',
                ($event.target as HTMLInputElement).value
                  ? parseInt(($event.target as HTMLInputElement).value, 10)
                  : 0,
              )
            "
        /></label>
      </div>
    </div>
  </form>
</template>

<style scoped lang="scss">
.step-size {
  width: 5em;
}
</style>
