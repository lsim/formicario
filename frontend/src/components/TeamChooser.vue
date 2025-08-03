<script setup lang="ts">
import { useTeamStore } from '@/stores/teams.ts';

import type { Team } from '@/Team.ts';
import TeamList from '@/components/TeamList.vue';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';

const teamStore = useTeamStore();

function unselectTeam(team: Team) {
  teamStore.unselectForBattle(team);
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
  <div class="control team-chooser">
    <label class="label">Choose pool of teams</label>
    <div class="columns">
      <div class="column is-half all-teams">
        <team-list @team-selected="toggleTeam" />
      </div>
      <div class="column is-half no-scroll-bars">
        <div class="panel selected-teams">
          <TransitionGroup name="selected-teams">
            <a
              class="panel-block"
              v-for="team in teamStore.battleTeams"
              :key="team.id"
              @click.exact="unselectTeam(team)"
              @click.ctrl="teamStore.battleTeams = [team]"
              @click.meta="teamStore.battleTeams = [team]"
              :style="{
                boxShadow: `0 0 5px ${team.color}`,
              }"
            >
              <span class="icon">
                <font-awesome-icon :icon="faCheckCircle" />
              </span>
              <span>
                {{ team.name }}
              </span>
            </a>
          </TransitionGroup>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.team-chooser .column {
  height: 20em;
  overflow: auto;
}

.panel.selected-teams {
  $border-radius: var(--bulma-panel-radius);
  :first-child {
    border-top-left-radius: $border-radius;
    border-top-right-radius: $border-radius;
  }
  border-top-left-radius: $border-radius;
  border-top-right-radius: $border-radius;
}

.all-teams,
.panel {
  a {
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
