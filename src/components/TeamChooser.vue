<script setup lang="ts">
import { ref, watch } from 'vue';

const emit = defineEmits<{
  (event: 'update:teams', teams: string[]): void;
}>();

const rawImport = import.meta.glob('@ants/*.js', { eager: true, query: '?raw' }) as Record<
  string,
  { default: string }
>;

const codeByName = Object.fromEntries(
  Object.entries(rawImport).map(([key, value]) => [
    key.replace(/^\/ants\/(.+)\.js$/, '$1'),
    value.default,
  ]),
);

const selectedTeams = ref<Record<string, boolean>>({});

watch(
  selectedTeams,
  () => {
    const selectedTeamNames = Object.keys(selectedTeams.value).filter(
      (name) => selectedTeams.value[name],
    );
    const selectedTeamCodes = selectedTeamNames.map((name) => codeByName[name]);
    console.log('Chooser emitting', selectedTeamCodes);
    emit('update:teams', selectedTeamCodes);
  },
  { deep: true },
);
</script>

<template>
  <div class="team-chooser">
    <h1>Choose your teams</h1>
    <div class="team-list">
      <template v-for="(code, name) in codeByName" :key="name">
        <label class="team-name" for="team-{{ name }}">
          <input type="checkbox" id="team-{{ name }}" v-model="selectedTeams[name]" />
          {{ name }}
        </label>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
