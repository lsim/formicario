<script setup lang="ts">
import type { BattleStatus, BattleSummary, TeamStatus } from '@/GameSummary.ts';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { type Observable, type Subscription } from 'rxjs';
import { useTeamStore } from '@/stores/teams.ts';
import type { TeamStat } from '@/composables/stats.ts';

// Number typed properties of TeamStatus
const teamStore = useTeamStore();

const props = withDefaults(
  defineProps<{
    battleSummary?: BattleSummary;
    battleStatus$?: Observable<BattleStatus>;
    selectedStatusProperty?: TeamStat;
  }>(),
  {
    selectedStatusProperty: 'numAnts',
  },
);

// NOTE: This component kind of duplicates the BattleBars component. A refactor is due

const liveTeams = ref<TeamStatus[]>([]);

const teams = computed(() => {
  // Look up the teams in the teamStore
  const participatingTeamStatuses = liveTeams.value || props.battleSummary?.teams;
  return participatingTeamStatuses.map((team) => {
    // Look up the team name in the teamStore and add it to the team status
    const teamFromStore = teamStore.allTeamMetas.find((t) => t.id === team.id);
    return { ...team, name: teamFromStore?.name };
  });
});

let subscription: Subscription | null = null;
watch(
  () => props.battleStatus$,
  (battleStatus$) => {
    // If we aren't given the final scores, subscribe to get live updates
    subscription?.unsubscribe();
    if (!battleStatus$) {
      subscription = null;
      liveTeams.value = [];
      return;
    }
    // Get fresh streams for each battle
    subscription = battleStatus$.subscribe((battleStatus) => {
      liveTeams.value = battleStatus.teams;
    });
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  subscription?.unsubscribe();
  subscription = null;
  liveTeams.value = [];
});

const maxForSelectedProperty = computed(() => {
  return Math.max(...teams.value.map((t) => t.numbers[props.selectedStatusProperty]));
});

function barWidth(team: TeamStatus) {
  return team.numbers[props.selectedStatusProperty] / (maxForSelectedProperty.value || 1);
}

// A computed property with value and color for each team, ordered by the value
const sortedBars = computed(() => {
  return teams.value
    .map((team) => {
      return {
        width: barWidth(team),
        value: team.numbers[props.selectedStatusProperty],
        color: team.color,
        id: team.id,
        name: team.name,
      };
    })
    .sort((a, b) => b.value - a.value);
});
</script>

<template>
  <div class="team-stats">
    <template v-for="bar in sortedBars" :key="bar.name">
      <div class="team-name" :title="bar.value + ''">{{ bar.name }}</div>
      <!-- A colored bar for the selected property and the current bar -->
      <div
        class="team-bar"
        :style="{
          backgroundColor: bar.color,
          color: teamStore.contrastingColor(bar.color),
          width: `${bar.width * 100}%`,
        }"
        :title="bar.value + ''"
      >
        {{ bar.value }}
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.team-stats {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: repeat(2, 1fr);
  gap: 4px;
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
