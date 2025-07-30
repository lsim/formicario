<script setup lang="ts">
import { faFilter, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useTeamStore } from '@/stores/teams.ts';
import { computed, ref, useTemplateRef } from 'vue';
import type { Team } from '@/Team.ts';

const emits = defineEmits<{
  (e: 'teamSelected', team: Team): void;
}>();

const teamStore = useTeamStore();

const filter = ref('');

const filteredTeams = computed(() => {
  return teamStore.allTeams.filter(
    (team) =>
      filter.value.length < 2 ||
      !team.name ||
      team.name.toLowerCase().includes(filter.value.toLowerCase()),
  );
});

const filterInput = useTemplateRef('filterInput');

function clearFilter() {
  filter.value = '';
  filterInput.value?.focus();
}

const selectionBools = computed<Record<string, boolean>>(() => {
  return teamStore.battleTeams.reduce(
    (acc, team) => {
      acc[team.id] = true;
      return acc;
    },
    {} as Record<string, boolean>,
  );
});

function emitSelection(team: Team) {
  filter.value = '';
  emits('teamSelected', team);
}
</script>

<template>
  <div class="root">
    <div class="filter block control has-icons-left has-icons-right">
      <input class="input" type="text" v-model="filter" placeholder="Filter" ref="filterInput" />
      <span class="icon is-small is-left">
        <font-awesome-icon :icon="faFilter" />
      </span>
      <span class="icon is-small is-right clear-filter" @click="clearFilter">
        <font-awesome-icon class="clear-filter" :icon="faXmark" />
      </span>
    </div>
    <div class="list control no-scroll-bars">
      <div class="grid">
        <button
          v-for="team in filteredTeams.sort((a, b) =>
            a.name ? a.name.localeCompare(b.name || '') : -1,
          )"
          :key="team.id"
          class="cell button"
          :class="{
            'is-outlined is-link': !selectionBools[team.id],
          }"
          @click.exact="emitSelection(team)"
          type="button"
          :style="
            selectionBools[team.id]
              ? {
                  backgroundColor: team.color,
                  color: teamStore.contrastingColor(team.color ?? '#000'),
                }
              : { borderColor: team.color }
          "
        >
          {{ team.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.clear-filter {
  cursor: pointer;
  pointer-events: all;
}

.root {
  height: 100%;
  display: flex;
  flex-direction: column;

  .filter.block {
    flex-grow: 0;
  }

  .list.control {
    flex-grow: 1;
    overflow-y: auto;
  }
}
</style>
