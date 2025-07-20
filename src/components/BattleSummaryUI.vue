<script setup lang="ts">
import type { BattleSummary } from '@/GameSummary.ts';
import TeamBattleStats from '@/components/TeamBattleStats.vue';
import BattleArgs from '@/components/BattleArgs.vue';
import { useTemplateRef, watch } from 'vue';
import useBattleRenderer from '@/composables/renderer.ts';
import type { BattleStats } from '@/composables/stats.ts';
import BattleGraph from '@/components/BattleGraph.vue';
import StatPropChooser from '@/components/StatPropChooser.vue';

const props = defineProps<{
  summary: BattleSummary;
  stats: BattleStats;
}>();

const battleRenderer = useBattleRenderer();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

watch(
  () =>
    [props.summary, canvas.value] as [
      BattleSummary | undefined | null,
      HTMLCanvasElement | undefined | null,
    ],
  ([newBattle, newCanvas]: [
    BattleSummary | undefined | null,
    HTMLCanvasElement | undefined | null,
  ]) => {
    if (!newBattle || !newCanvas) return;

    newCanvas.width = newBattle.args.mapWidth;
    newCanvas.height = newBattle.args.mapHeight;
    battleRenderer.setTeamColors(newBattle.teams.map((t) => t.color));
    const ctx = newCanvas.getContext('2d');
    if (!ctx) {
      console.warn('No newCanvas context received');
      return;
    }
    ctx.clearRect(0, 0, newCanvas.width, newCanvas.height);
    battleRenderer.renderDeltasToBackBuffer(newBattle.squares, newBattle.args, ctx);
  },
  { immediate: true },
);

// Format duration as in HH:MM:SS
function formatTimespan(milliseconds: number) {
  // Convert milliseconds to seconds
  const totalSeconds = Math.floor(milliseconds / 1000);

  // Calculate hours, minutes, and seconds
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Format with leading zeros
  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
</script>

<template>
  <div class="stat">Turns: {{ props.summary.turns }}</div>
  <div class="stat">Winner: {{ props.summary.winner }}</div>
  <div class="stat">Duration: {{ formatTimespan(props.summary.duration) }}</div>
  <canvas ref="canvas" class="battle-canvas" />
  <stat-prop-chooser class="stat-prop-chooser" />
  <team-battle-stats
    v-if="props.summary && props.stats"
    class="team-stats"
    :battle-summary="props.summary"
    :battle-stats="props.stats"
  />
  <battle-graph
    class="battle-graph"
    :battle-stats="props.stats"
    :is-live="false"
    :stat-prop="'numAnts'"
  />
  <battle-args
    class="battle-args"
    :args="props.summary.args"
    :teams="props.summary.teams"
    :seed="props.summary.seed"
  />
</template>

<style scoped lang="scss"></style>
