<script setup lang="ts">
import {
  faFastForward,
  faPause,
  faPlay,
  faStepForward,
  faStop,
} from '@fortawesome/free-solid-svg-icons';

import { computed, ref } from 'vue';
import { useTeamStore } from '@/stores/teams.ts';
import { useMagicKeys, whenever } from '@vueuse/core';
import { useGameStore } from '@/stores/game.ts';
const { enter, shift_space, escape } = useMagicKeys();
const gameStore = useGameStore();

whenever(enter, gameStore.start);

whenever(shift_space, () => gameStore.step(stepSize.value));

whenever(escape, stop);

const teamStore = useTeamStore();

const noTeamsSelected = computed(() => teamStore.battleTeams.length === 0);
const stepSize = ref(1);
</script>

<template>
  <div class="field is-grouped">
    <div class="control" v-show="!gameStore.gameRunning">
      <button
        class="button is-success"
        type="button"
        @click="gameStore.start"
        :disabled="noTeamsSelected"
        title="[Enter]"
      >
        <span class="icon">
          <font-awesome-icon :icon="faPlay" />
        </span>
      </button>
    </div>
    <div class="control" v-show="gameStore.gameRunning">
      <button class="button is-danger" type="button" @click="gameStore.stop" title="[Escape]">
        <span class="icon"><font-awesome-icon :icon="faStop" /></span>
      </button>
    </div>
    <div class="control" v-show="gameStore.gameRunning">
      <button class="button is-info" type="button" @click="gameStore.skipBattle">
        <span class="icon">
          <font-awesome-icon :icon="faFastForward" />
        </span>
      </button>
    </div>
    <div class="control" v-show="!gameStore.gamePaused && gameStore.gameRunning">
      <button
        class="button is-info"
        type="button"
        @click="gameStore.pause"
        :disabled="noTeamsSelected"
      >
        <span class="icon">
          <font-awesome-icon :icon="faPause" />
        </span>
      </button>
    </div>
    <div class="control" v-show="gameStore.gamePaused && gameStore.gameRunning">
      <button
        class="button is-info"
        type="button"
        @click="gameStore.resume"
        :disabled="noTeamsSelected"
      >
        <span class="icon">
          <font-awesome-icon :icon="faPlay" />
        </span>
      </button>
    </div>
    <div
      class="field has-addons"
      v-show="(gameStore.gamePaused && gameStore.gameRunning) || !gameStore.gameRunning"
    >
      <div class="control">
        <button
          class="button is-info"
          type="button"
          @click="() => gameStore.step(stepSize)"
          :disabled="noTeamsSelected"
          title="[Shift + Space]"
        >
          <span class="icon">
            <font-awesome-icon :icon="faStepForward" />
          </span>
        </button>
      </div>
      <div class="control">
        <input class="step-size input" type="number" v-model="stepSize" min="1" step="10" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
