<script setup lang="ts">
import type { BattleSummary } from '@/GameSummary.ts';
import TeamBattleStats from '@/components/TeamBattleStats.vue';
import BattleArgs from '@/components/BattleArgs.vue';
import { nextTick, useTemplateRef } from 'vue';
import useBattleRenderer from '@/renderer.ts';

const props = defineProps<{
  battle: BattleSummary;
}>();

const battleRenderer = useBattleRenderer();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

nextTick(() => {
  if (!canvas.value) {
    console.warn('No canvas found');
    return;
  }

  canvas.value.width = props.battle.args.mapWidth;
  canvas.value.height = props.battle.args.mapHeight;
  const ctx = canvas.value.getContext('2d');
  if (!ctx) {
    console.warn('No canvas context received');
    return;
  }
  battleRenderer.setTeamColors(props.battle.teams.map((t) => t.color));
  battleRenderer.renderDeltasToBackBuffer(props.battle.squares, props.battle.args, ctx);
});

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
  <div class="stat">Turns: {{ props.battle.turns }}</div>
  <div class="stat">Winner: {{ props.battle.winner }}</div>
  <div class="stat">Duration: {{ formatTimespan(props.battle.duration) }}</div>
  <canvas ref="canvas" class="battle-canvas" />
  <team-battle-stats class="team-stats" :final-teams="props.battle.teams" />
  <battle-args
    class="battle-args"
    :args="props.battle.args"
    :teams="props.battle.teams"
    :seed="props.battle.seed"
  />
</template>

<style scoped lang="scss"></style>
