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
    const col = square.team === 0 ? 'black' : teams[square.team - 1].color;
    let pixelColor;
    if (square.team) {
      pixelColor = square.numAnts === 0 ? `color-mix(in srgb, ${col} 20%, black)` : col;
    }
    if (square.numFood > 0) {
      const maxFood = props.battle.args.newFoodMin + props.battle.args.newFoodDiff || 1;
      const whitePercentage = (Math.min(square.numFood, maxFood) / maxFood) * 100;
      pixelColor = `color-mix(in srgb, white ${whitePercentage}%, ${col})`;
    }

    if (square.base) {
      pixelColor = 'white';
    }
    if (pixelColor) {
      ctx.fillStyle = pixelColor;
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
