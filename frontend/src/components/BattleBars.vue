<script setup lang="ts">
import type { BattleSummary, TeamStatus } from '@/GameSummary.ts';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { map, type Subscription, switchAll } from 'rxjs';
import type { BattleStats } from '@/composables/stats.ts';
import { useGameStore } from '@/stores/game.ts';
import StatPropChooser from '@/components/StatPropChooser.vue';

// Number typed properties of TeamStatus
const game = useGameStore();

const props = withDefaults(
  defineProps<{
    isLive?: boolean;
    battleSummary?: BattleSummary;
    battleStats?: BattleStats;
  }>(),
  {
    isLive: false,
  },
);

const liveTeams = ref<TeamStatus[]>([]);
const turn = ref<number>();
const tps = ref<number>();

const teams = computed(() => props.battleSummary?.teams || liveTeams.value);

let subscription: Subscription | null = null;
watch(
  () => props.isLive,
  (isLive) => {
    // If we aren't given the final scores, subscribe to get live updates
    if (isLive) {
      // Get fresh streams for each battle
      subscription?.unsubscribe();
      subscription = game.battleStreams$
        .pipe(
          map(([status]) => status),
          switchAll(),
        )
        .subscribe((battleStatus) => {
          liveTeams.value = battleStatus.teams;
          turn.value = battleStatus.turns;
          tps.value = battleStatus.turnsPerSecond;
        });
    } else {
      subscription?.unsubscribe();
      subscription = null;
      liveTeams.value = [];
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  subscription?.unsubscribe();
  subscription = null;
  liveTeams.value = [];
});

const maxForSelectedProperty = computed(() => {
  return Math.max(...teams.value.map((t) => t[game.selectedStatusProperty] as number));
});

function barWidth(team: TeamStatus) {
  return (team[game.selectedStatusProperty] as number) / maxForSelectedProperty.value;
}

// A computed property with value and color for each team, ordered by the value
const sortedBars = computed(() => {
  return teams.value
    .map((team) => {
      return {
        width: barWidth(team),
        value: team[game.selectedStatusProperty],
        color: team.color,
        name: team.name,
      };
    })
    .sort((a, b) => b.value - a.value);
});
</script>

<template>
  <div class="columns">
    <div class="column is-one-fifth">
      <stat-prop-chooser />
    </div>
    <div class="column">
      <div class="team-stats">
        <div class="team-stats-header">
          <span v-show="turn">Simulated turns {{ turn }}</span>
          <span v-show="tps">Simulated turns/second {{ tps }}</span>
        </div>
        <template v-for="bar in sortedBars" :key="bar.name">
          <div class="team-name" :title="bar.value + ''">{{ bar.name }}</div>
          <!-- A colored bar for the selected property and the current bar -->
          <div
            class="team-bar"
            :style="{
              backgroundColor: bar.color,
              width: `${bar.width * 100}%`,
            }"
            :title="bar.value + ''"
          >
            {{ bar.value }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.team-stats {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: repeat(3, 1fr);
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
