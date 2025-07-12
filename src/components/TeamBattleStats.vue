<script setup lang="ts">
import type { TeamStatus } from '@/GameSummary.ts';
import { computed, ref } from 'vue';
import { battleStatusSubject } from '@/workers/WorkerDispatcher.ts';

declare type StatusProperty = keyof TeamStatus;

// Number typed properties of TeamStatus
const statusProperties: StatusProperty[] = [
  'numBorn',
  'numAnts',
  'numBases',
  'basesBuilt',
  'kill',
  'killed',
  'dieAge',
];

const propertyLabels: Record<StatusProperty, string> = {
  name: 'Name',
  color: 'Color',
  numBorn: 'Born',
  numAnts: 'Ants',
  numBases: 'Bases',
  basesBuilt: 'Bases built',
  kill: 'Kills',
  killed: 'Losses',
  dieAge: 'Die age',
};

const selectedStatusProperty = ref<StatusProperty>('numAnts');

const teams = ref<TeamStatus[]>([]);
const turn = ref<number>();
const tps = ref<number>();

battleStatusSubject.subscribe((battleStatus) => {
  teams.value = battleStatus.teams;
  turn.value = battleStatus.turns;
  tps.value = battleStatus.turnsPerSecond;
});

const maxForSelectedProperty = computed(() => {
  return Math.max(...teams.value.map((t) => t[selectedStatusProperty.value] as number));
});
</script>

<template>
  <div class="team-stats">
    <div class="team-stats-header">
      <select v-model="selectedStatusProperty">
        <option v-for="prop in statusProperties" :key="prop" :value="prop">
          {{ propertyLabels[prop] }}
        </option>
      </select>
      <span v-show="turn">Simulated turns {{ turn }}</span>
      <span v-show="tps">Simulated turns/second {{ tps }}</span>
    </div>
    <template v-for="(team, index) in teams" :key="index">
      <div class="team-name">{{ team.name }}</div>
      <!-- A colored bar for the selected property and the current team -->
      <div
        class="team-bar"
        :style="{
          backgroundColor: team.color,
          width: `${((team[selectedStatusProperty] as number) / maxForSelectedProperty) * 100}%`,
        }"
      >
        {{ team[selectedStatusProperty] }}
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.team-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(3, 1fr);
  gap: 4px;
  font-size: 80%;
  .team-stats-header {
    grid-column: 1 / 3;
  }
  .team-name {
    grid-column: 1;
    text-align: right;
  }
  .team-bar {
    grid-column: 2;
    border-radius: 0.5em;
    font-family: monospace;
    color: black;

    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
