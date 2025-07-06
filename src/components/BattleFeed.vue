<script setup lang="ts">
import type { BattleStatus } from '@/GameSummary.ts';
import { ref, watch } from 'vue';

const canvas = ref<HTMLCanvasElement | undefined>();

const props = defineProps<{
  battle: BattleStatus;
}>();

function updateCanvas(ctx: CanvasRenderingContext2D, newVal: BattleStatus) {
  // squares is a list of squares that have changed since the last status update
  const squares = newVal.deltaSquares;
  const teams = newVal.teams;
  for (let i = 0; i < squares.length; i++) {
    const square = squares[i];
    const x = square.index % props.battle.args.mapWidth;
    const y = Math.floor(square.index / props.battle.args.mapWidth);
    if (square.team) {
      const col = teams[square.team - 1].color;
      const alpha = square.numAnts > 0 ? 100 : 20;
      const fillStyle = `color-mix(in srgb, ${col} ${alpha}%, black)`;
      ctx.fillStyle = fillStyle;
      ctx.fillRect(x, y, 1, 1);
    } else if (square.numFood > 0) {
      const maxFood = props.battle.args.newFoodMin + props.battle.args.newFoodDiff;
      const alpha = (Math.min(square.numFood, maxFood) / maxFood) * 100;
      const fillStyle = `color-mix(in srgb, white ${alpha}%, black)`;
      ctx.fillStyle = fillStyle;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

watch(
  () => props.battle,
  (newVal, oldVal) => {
    if (!canvas.value) return;
    const ctx = canvas.value.getContext('2d');
    if (!ctx) return;
    if (newVal && !oldVal) {
      ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
    }
    requestAnimationFrame(() => updateCanvas(ctx, newVal));
    // updateCanvas(ctx, newVal);
  },
);
</script>

<template>
  <div class="battle-feed">
    <canvas ref="canvas" :width="props.battle.args.mapWidth" :height="props.battle.args.mapHeight">
    </canvas>
  </div>
</template>

<style scoped lang="scss">
canvas {
  zoom: 2;
}
</style>
