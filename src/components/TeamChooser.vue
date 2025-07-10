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
  <div class="field">
    <div class="control">
      <label class="label">Choose your teams</label>
      <div class="box control">
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
      <Transition name="selected-box">
        <div class="box control" v-if="selectedTeams.length > 0">
          <div class="selected-teams grid">
            <TransitionGroup name="selected-teams">
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
