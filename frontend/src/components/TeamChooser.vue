<script setup lang="ts">
import { useTeamStore } from '@/stores/teams.ts';

import Color from 'color';
import type { Team } from '@/Team.ts';
import TeamList from '@/components/TeamList.vue';

const teamStore = useTeamStore();

function unselectTeam(team: Team) {
  teamStore.unselectForBattle(team);
}

function contrastingColor(color: string) {
  const c = new Color(color);
  return c.contrast(Color('white')) > c.contrast(Color('black')) ? 'white' : 'black';
}

function toggleTeam(team: Team) {
  if (teamStore.battleTeams.includes(team)) {
    teamStore.unselectForBattle(team);
  } else {
    teamStore.selectForBattle(team);
  }
}
</script>

<template>
  <div class="control">
    <label class="label">Choose pool of teams</label>
    <div class="columns">
      <div class="column is-one-quarter all-teams">
        <team-list @team-selected="toggleTeam" />
      </div>
      <div class="column is-three-quarters">
        <div class="control" v-if="teamStore.battleTeams.length > 0">
          <div class="no-scroll-bars grid">
            <TransitionGroup name="selected-teams">
              <div class="cell" v-for="team in teamStore.battleTeams" :key="team.id">
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
  max-height: 35vh;
  overflow: auto;
}

// Hide scrollbars
.all-teams,
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
