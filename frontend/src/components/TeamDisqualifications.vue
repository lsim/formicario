<script setup lang="ts">
import type { TeamStatus } from '@/GameSummary.ts';
import { computed } from 'vue';
import { useTeamStore } from '@/stores/teams.ts';

const teamStore = useTeamStore();

const props = defineProps<{
  teamStatuses?: TeamStatus[];
  isLive?: boolean;
}>();

const disqualifiedTeams = computed(() => {
  return (props.teamStatuses ?? [])
    .filter((t) => !!t.disqualification)
    .map((t) => ({
      name: teamStore.teamName(t.id),
      disqualification: t.disqualification!,
    }));
});
</script>

<template>
  <template v-for="d in disqualifiedTeams" :key="d.name">
    <p class="panel-heading">
      <span class="team-name"> {{ d.name }} </span>:&nbsp;
      <span class="team-reason"> "{{ d.disqualification.reason }}"</span>&nbsp;in turn&nbsp;
      <span class="team-reason"> {{ d.disqualification.turn }}</span>
    </p>
    <div class="panel-block is-justify-content-center">The Ant</div>
    <div class="panel-block">
      <pre class="json">{{ JSON.stringify(d.disqualification.ant, null, 2) }}</pre>
    </div>
    <div class="panel-block is-justify-content-center">The Square</div>
    <div class="panel-block">
      <pre class="json">{{ JSON.stringify(d.disqualification.square, null, 2) }}</pre>
    </div>
  </template>
</template>

<style scoped lang="scss">
.json {
  width: 100%;
}

.panel-heading {
  border-radius: 0;
  background-color: var(--bulma-danger);
}
</style>
