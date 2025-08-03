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
  <div class="disqualifications">
    <div v-for="d in disqualifiedTeams" :key="d.name">
      <div class="team-name">{{ d.name }}</div>
      <div class="team-reason">{{ d.disqualification.reason }}</div>
      <div class="team-ant">
        {{ JSON.stringify(d.disqualification.ant, null, 2) }}
      </div>
      <div class="square-data">
        {{ JSON.stringify(d.disqualification.square, null, 2) }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
