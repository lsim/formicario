<script setup lang="ts">
import { computed } from 'vue';
import { type Team, useTeamStore } from '@/stores/teams.ts';

const teamStore = useTeamStore();

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
  teamStore.selectForBattle(team);
}

function unselectTeam(team: Team) {
  teamStore.unselectForBattle(team);
}
</script>

<template>
  <div class="field">
    <div class="control">
      <label class="label">Choose your teams</label>
      <div class="box control">
        <div class="all-teams grid">
          <button
            v-for="team in teamStore.allTeams"
            :key="team.name"
            class="cell button is-outlined"
            :class="{
              'is-primary': selectionBools[team.name],
              'is-link': !selectionBools[team.name],
            }"
            @click.exact="selectTeam(team)"
            @click.ctrl="teamStore.battleTeams = [team]"
            @click.meta="teamStore.battleTeams = [team]"
            type="button"
            :style="{ backgroundColor: team.color }"
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
                :style="{ backgroundColor: team.color }"
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
