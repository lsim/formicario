<script setup lang="ts">
import useApiClient from '@/composables/api-client.ts';
import { computed, ref } from 'vue';
import type { ScoreAggregator } from '#shared/BattleResult.ts';
import { useTeamStore } from '@/stores/teams.ts';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';

const apiClient = useApiClient();

const teamsWithScores = ref<Record<string, ScoreAggregator>>({});
(async () => {
  teamsWithScores.value = await apiClient.getTeamsWithScores();
})();

declare type Sorting = 'name' | 'wins' | 'losses' | 'beaten' | 'avgWinTurns' | 'winLossRatio';

const direction = ref<'asc' | 'desc'>('desc');
const sorting = ref<Sorting>('winLossRatio');

const sortedTeams = computed(() => {
  const teams = Object.values(teamsWithScores.value).sort((a, b) => {
    switch (sorting.value) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'wins':
        return a.numWins - b.numWins;
      case 'losses':
        return a.numLosses - b.numLosses;
      case 'beaten':
        return a.numBeatenTeams - b.numBeatenTeams;
      case 'avgWinTurns':
        return a.avgWinTurns - b.avgWinTurns;
      case 'winLossRatio':
        return a.winLossRatio - b.winLossRatio;
      default:
        return 0;
    }
  });
  if (direction.value === 'desc') teams.reverse();
  return teams;
});

const teamStore = useTeamStore();

function sortBy(newSorting: Sorting) {
  const currentSorting = sorting.value;
  if (currentSorting === newSorting) direction.value = direction.value === 'asc' ? 'desc' : 'asc';
  else direction.value = 'desc';
  sorting.value = newSorting;
}

const isAscending = computed(() => direction.value === 'asc');

const strongestTeam = computed(() => {
  const teams = Object.values(teamsWithScores.value);
  return teams.sort((a, b) => {
    if (a.winLossRatio === b.winLossRatio) return 0;
    return a.winLossRatio > b.winLossRatio ? -1 : 1;
  })[0].name;
});
</script>

<template>
  <div class="container">
    <table class="table">
      <thead>
        <tr>
          <th>
            <a :class="{ sorting: sorting === 'name', desc: !isAscending }" @click="sortBy('name')"
              >Team</a
            >
          </th>
          <th>
            <a :class="{ sorting: sorting === 'wins', desc: !isAscending }" @click="sortBy('wins')"
              >Wins</a
            >
          </th>
          <th>
            <a
              :class="{ sorting: sorting === 'losses', desc: !isAscending }"
              @click="sortBy('losses')"
              >Losses</a
            >
          </th>
          <th>
            <a
              :class="{ sorting: sorting === 'winLossRatio', desc: !isAscending }"
              @click="sortBy('winLossRatio')"
              >Win/Loss Ratio</a
            >
          </th>
          <th>
            <a
              :class="{ sorting: sorting === 'beaten', desc: !isAscending }"
              @click="sortBy('beaten')"
              >Beaten</a
            >
          </th>
          <th>
            <a
              :class="{ sorting: sorting === 'avgWinTurns', desc: !isAscending }"
              @click="sortBy('avgWinTurns')"
              >Avg. Win Turns</a
            >
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="team in sortedTeams"
          :key="team.name"
          :style="{
            '--team-color': team.color,
            '--contrasting-color': teamStore.contrastingColor(team.color),
          }"
        >
          <td>
            <span class="button is-static is-small_ name is-fullwidth">{{ team.name }}</span>
          </td>
          <td>{{ team.numWins }}</td>
          <td>{{ team.numLosses }}</td>
          <td>
            <span class="icon">
              <font-awesome-icon
                class="trophy"
                :icon="faTrophy"
                v-if="strongestTeam === team.name"
              />
            </span>
            {{ Math.round(team.winLossRatio * 100) }}%
          </td>
          <td>{{ team.numBeatenTeams }}</td>
          <td>{{ Math.round(team.avgWinTurns) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss">
.table {
  th {
    ::selection {
      background: transparent;
    }
    a {
      // Styling for sorted column
      &.sorting {
        font-weight: bold;
        &::before {
          content: '⇓';
          // thicken up the arrow a bit
          text-shadow: 0 0 1px white;
        }
        &.desc::before {
          content: '⇑';
        }
      }
    }
  }

  .name {
    background-color: var(--team-color) !important;
    color: var(--contrasting-color) !important;
  }

  svg.trophy * {
    fill: gold;

    animation: grow 5s ease-in-out infinite;
    transform-origin: center;
    @keyframes grow {
      0% {
        transform: scale(1);
      }
      10% {
        transform: scale(2) rotate(-10deg);
      }
      25% {
        transform: scale(1);
      }
    }
  }
}
</style>
