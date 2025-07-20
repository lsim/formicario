<script setup lang="ts">
import { useGameStore } from '@/stores/game.ts';
import type { TeamStat } from '@/composables/stats.ts';

const gameStore = useGameStore();

const statusProperties: TeamStat[] = [
  'numBorn',
  'numAnts',
  'numBases',
  'basesBuilt',
  'kill',
  'killed',
  'dieAge',
];

const propertyLabels: Record<TeamStat, string> = {
  numBorn: 'Born',
  numAnts: 'Ants',
  numBases: 'Bases',
  basesBuilt: 'Bases built',
  kill: 'Kills',
  killed: 'Losses',
  dieAge: 'Die age',
};
</script>

<template>
  <div class="field has-addons">
    <div class="control" v-for="prop in statusProperties" :key="prop">
      <button
        class="button"
        type="button"
        :class="{ 'is-link': prop === gameStore.selectedStatusProperty }"
        @click="gameStore.selectedStatusProperty = prop"
      >
        {{ propertyLabels[prop] }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.control {
  margin-right: 1em;
}
</style>
