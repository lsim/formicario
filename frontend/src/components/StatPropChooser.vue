<script setup lang="ts">
import { useGameStore } from '@/stores/game.ts';
import type { TeamStat } from '@/composables/stats.ts';

const gameStore = useGameStore();

const statusProperties: TeamStat[] = [
  'numAnts',
  'numBorn',
  'numBases',
  'basesBuilt',
  'kill',
  'killed',
  'dieAge',
  'squareOwn',
  'foodOwn',
  'foodTouch',
  'foodKnown',

  // 'timesRun',
  // 'timesTimed',

  'timeUsed',
];

const propertyLabels: Record<TeamStat, string> = {
  numAnts: 'Ants',
  numBorn: 'Ants born',
  numBases: 'Bases',
  basesBuilt: 'Bases built',
  kill: 'Kills',
  killed: 'Losses',
  dieAge: 'Die age',
  squareOwn: 'Squares',
  foodOwn: 'Food owned',
  foodTouch: 'Food touched',
  foodKnown: 'Food known',
  // timesRun: 'Times run',
  // timesTimed: 'Times timed',
  timeUsed: 'Avg time',
};
</script>

<template>
  <div class="grid is-gap-0.5">
    <button
      v-for="prop in statusProperties"
      type="button"
      class="cell button is-small"
      :key="prop"
      :class="{ 'is-active': prop === gameStore.selectedStatusProperty }"
      @click="gameStore.selectedStatusProperty = prop"
    >
      {{ propertyLabels[prop] }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.grid {
  --bulma-grid-column-min: auto;
}
.panel-tabs {
  max-width: 44.5vw;
  overflow-x: auto;
  // Hide scrollbar
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
