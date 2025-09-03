<script setup lang="ts">
import { faFilter, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useTeamStore } from '@/stores/teams.ts';
import { computed, ref, useTemplateRef } from 'vue';
import type { Team } from '@/Team.ts';
import useApiClient from '@/composables/api-client.ts';

const emits = defineEmits<{
  (e: 'teamSelected', team: Team): void;
}>();

const teamStore = useTeamStore();

const apiClient = useApiClient();

const filter = ref('');
const listBuiltIns = ref(true);
const showMyTeamsOnly = ref(false);

const filteredTeams = computed(() => {
  return teamStore.allTeamMetas
    .filter((team) => {
      if (showMyTeamsOnly.value) {
        return !team.authorName || team.authorName === apiClient.userName.value;
      }
      if (!listBuiltIns.value) {
        return !team.authorName || !teamStore.isBuiltIn({ authorName: team.authorName });
      }
      return true;
    })
    .filter((team) => team.name.toLowerCase().includes(filter.value.toLowerCase()))
    .sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
});

const filterInput = useTemplateRef('filterInput');

function clearFilter() {
  filter.value = '';
  focusFilter();
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

function emitSelection(team: { id: string }) {
  filter.value = '';
  const teamToEmit =
    teamStore.localTeams.find((t) => t.id === team.id) ||
    teamStore.remoteTeams.find((t) => t.id === team.id)!;
  focusFilter();
  emits('teamSelected', teamToEmit);
}

function focusFilter() {
  filterInput.value?.focus();
}
</script>

<template>
  <div class="root field">
    <div class="filter block control has-icons-left has-icons-right">
      <input class="input" type="text" v-model="filter" placeholder="Teams" ref="filterInput" />
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
    <div class="control checkbox">
      <label class="label">
        <input type="checkbox" v-model="listBuiltIns" />
        Legacy teams
      </label>
    </div>
    <div class="control checkbox">
      <label class="label">
        <input type="checkbox" v-model="showMyTeamsOnly" />
        My teams only
      </label>
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
  overflow: hidden;

  .filter.block {
    flex-grow: 0;
  }

  .list.control {
    flex-grow: 1;
    overflow-y: auto;
    margin-bottom: 0.5em;
  }
}
</style>
