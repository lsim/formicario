<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const emit = defineEmits<{
  (event: 'update:teams', teams: { name: string; code: string }[]): void;
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

const teamSelections = ref<Record<string, boolean>>({});

const selectedTeams = computed(() => {
  return Object.keys(teamSelections.value).filter((name) => teamSelections.value[name]);
});

watch(
  teamSelections,
  () => {
    const selectedTeamNames = Object.keys(teamSelections.value).filter(
      (name) => teamSelections.value[name],
    );
    const selection = selectedTeamNames.map((name) => ({ code: codeByName[name], name }));
    emit('update:teams', selection);
  },
  { deep: true },
);
</script>

<template>
  <div class="field is-horizontal">
    <div class="field-label">
      <label class="label">Choose your teams</label>
    </div>
    <div class="field-body">
      <div class="box">
        <div class="all-teams grid">
          <button
            v-for="(code, name) in codeByName"
            :key="name"
            class="cell button is-outlined"
            :class="{ 'is-primary': teamSelections[name], 'is-link': !teamSelections[name] }"
            @click.exact="teamSelections[name] = !teamSelections[name]"
            @click.ctrl="teamSelections = { [name]: true }"
            @click.meta="teamSelections = { [name]: true }"
            type="button"
          >
            {{ name }}
          </button>
        </div>
      </div>
      <div class="box" v-if="selectedTeams.length > 0">
        <div class="selected-teams grid" style="max-width: 15em">
          <button
            v-for="name in selectedTeams"
            :key="name"
            class="cell button is-primary"
            @click.exact="teamSelections[name] = false"
            @click.ctrl="teamSelections = { [name]: true }"
            @click.meta="teamSelections = { [name]: true }"
            type="button"
          >
            {{ name }}
          </button>
        </div>
      </div>
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

.grid {
  button {
    width: 10em;
  }
}
</style>
