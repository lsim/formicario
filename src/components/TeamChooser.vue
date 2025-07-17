<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTeamStore } from '@/stores/teams.ts';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

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
</script>

<template>
  <div class="field">
    <div class="control">
      <label class="label">Choose your teams</label>
      <div class="block control has-icons-right">
        <input class="input" type="text" v-model="filter" placeholder="Filter" />
        <span class="icon is-small is-right">
          <font-awesome-icon :icon="faSearch" />
        </span>
      </div>
      <div class="box control">
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
      <Transition name="selected-box">
        <div class="box control" v-if="teamStore.battleTeams.length > 0">
          <div class="selected-teams grid">
            <TransitionGroup name="selected-teams">
              <button
                v-for="team in teamStore.battleTeams"
                :key="team.name"
                class="cell button is-primary"
                @click.exact="unselectTeam(team)"
                @click.ctrl="teamStore.battleTeams = [team]"
                @click.meta="teamStore.battleTeams = [team]"
                type="button"
                :style="{
                  backgroundColor: team.color,
                  color: contrastingColor(team.color ?? '#000'),
                }"
              >
                {{ team.name }}
              </button>
            </TransitionGroup>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
.all-teams,
.selected-teams {
  max-height: 300px;
  overflow: auto;
  // Hide scrollbars
  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.box {
  transition: all 0.2s ease;
  opacity: 1;
  transform: translateX(0);
  &.selected-box-enter-active,
  &.selected-box-leave-active {
    transition: all 0.2s ease;
  }
  &.selected-box-enter-from,
  &.selected-box-leave-to {
    opacity: 0;
    transform: translateX(-1em);
  }
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
