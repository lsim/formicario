<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useTeamStore } from '@/stores/teams.ts';
import { faFilter, faXmark } from '@fortawesome/free-solid-svg-icons';

import Color from 'color';
import type { Team } from '@/Team.ts';

const teamStore = useTeamStore();

const filter = ref('');

const selectionBools = computed<Record<string, boolean>>(() => {
  return teamStore.battleTeams.reduce(
    (acc, team) => {
      acc[team.name] = true;
      return acc;
    },
    {} as Record<string, boolean>,
  );
});

function selectTeam(team: Team) {
  filter.value = '';
  teamStore.selectForBattle(team);
}

function unselectTeam(team: Team) {
  teamStore.unselectForBattle(team);
}

function contrastingColor(color: string) {
  const c = new Color(color);
  return c.contrast(Color('white')) > c.contrast(Color('black')) ? 'white' : 'black';
}

const filteredTeams = computed(() => {
  return teamStore.allTeams.filter(
    (team) =>
      filter.value.length < 2 || team.name.toLowerCase().includes(filter.value.toLowerCase()),
  );
});

const filterInput = useTemplateRef('filterInput');

function clearFilter() {
  filter.value = '';
  filterInput.value?.focus();
}
</script>

<template>
  <div class="control">
    <label class="label">Choose pool of teams</label>
    <div class="columns">
      <div class="column is-one-quarter">
        <div class="block control has-icons-left has-icons-right">
          <input
            class="input"
            type="text"
            v-model="filter"
            placeholder="Filter"
            ref="filterInput"
          />
          <span class="icon is-small is-left">
            <font-awesome-icon :icon="faFilter" />
          </span>
          <span class="icon is-small is-right clear-filter" @click="clearFilter">
            <font-awesome-icon class="clear-filter" :icon="faXmark" />
          </span>
        </div>
        <div class="control">
          <div class="all-teams grid">
            <button
              v-for="team in filteredTeams.sort((a, b) => a.name.localeCompare(b.name))"
              :key="team.name"
              class="cell button"
              :class="{
                'is-outlined is-link': !selectionBools[team.name],
              }"
              @click.exact="selectionBools[team.name] ? unselectTeam(team) : selectTeam(team)"
              @click.ctrl="teamStore.battleTeams = [team]"
              @click.meta="teamStore.battleTeams = [team]"
              type="button"
              :style="
                selectionBools[team.name]
                  ? { backgroundColor: team.color, color: contrastingColor(team.color ?? '#000') }
                  : { borderColor: team.color }
              "
            >
              {{ team.name }}
            </button>
          </div>
        </div>
      </div>
      <div class="column is-three-quarters">
        <div class="control" v-if="teamStore.battleTeams.length > 0">
          <div class="selected-teams grid">
            <TransitionGroup name="selected-teams">
              <div class="cell" v-for="team in teamStore.battleTeams" :key="team.name">
                <button
                  class="button"
                  @click.exact="unselectTeam(team)"
                  @click.ctrl="teamStore.battleTeams = [team]"
                  @click.meta="teamStore.battleTeams = [team]"
                  type="button"
                  :style="{
                    backgroundColor: team.color,
                    color: contrastingColor(team.color ?? '#000'),
                  }"
                  style="width: 100%"
                >
                  {{ team.name }}
                </button>
              </div>
            </TransitionGroup>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.all-teams {
  max-height: 50vh;
  overflow: auto;
}

// Hide scrollbars
.all-teams,
.selected-teams {
  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.clear-filter {
  cursor: pointer;
  pointer-events: all;
}

.grid {
  button {
    &.selected-teams-enter-active,
    &.selected-teams-leave-active {
      transition: all 0.2s ease;
    }
    &.selected-teams-enter-from,
    &.selected-teams-leave-to {
      opacity: 0;
      transform: translateX(1em);
    }
  }
}
</style>
