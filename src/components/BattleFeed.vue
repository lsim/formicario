<script setup lang="ts">
import type { BattleInfo, BattleStatus, SquareStatus } from '@/GameSummary.ts';
import { useTemplateRef, watch } from 'vue';

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

const props = defineProps<{
  battle: BattleInfo;
}>();

function getEmptySquareColor(s: SquareStatus, teamCol: string) {
  if (s.numAnts === 0 && s.numFood === 0 && !s.base && s.team) {
    return `color-mix(in srgb, ${teamCol} 20%, black)`;
  }
}

function getAntSquareColor(s: SquareStatus, teamCol: string) {
  if (s.numAnts > 0) {
    // Full brightness when there is food as well as ants else slightly dimmed
    const percentage = s.numFood > 0 ? 100 : 65;
    return `color-mix(in srgb, ${teamCol} ${percentage}%, black)`;
  }
}

function getEmptyFoodSquareColor(s: SquareStatus) {
  if (!s.numAnts && s.numFood) {
    // 50% white when there is [;minFood] food, [50%-80%] white when there is [minFood;maxFood] food
    const minFood = props.battle.args.newFoodMin || 1;
    const maxFood = props.battle.args.newFoodMin + props.battle.args.newFoodDiff || 1;
    const whitePercentage =
      30 + ((Math.min(s.numFood, maxFood) - minFood) / (maxFood - minFood)) * 50;
    return `color-mix(in srgb, white ${whitePercentage}%, black)`;
  }
}

function getBaseSquareColor(s: SquareStatus, teamCol: string) {
  // Base squares are mostly white, but tinted with team color
  if (s.base) {
    return `color-mix(in srgb, white 80%, ${teamCol})`;
  }
}

function updateCanvas(ctx: CanvasRenderingContext2D, newVal: BattleStatus) {
  // squares is a list of squares that have changed since the last status update
  const squares = newVal.deltaSquares;
  const teams = newVal.teams;
  for (let i = 0; i < squares.length; i++) {
    const square = squares[i];
    const x = square.index % props.battle.args.mapWidth;
    const y = Math.floor(square.index / props.battle.args.mapWidth);
    const col = square.team === 0 ? 'black' : teams[square.team - 1].color;

    const pixelColor =
      getBaseSquareColor(square, col) ||
      getEmptyFoodSquareColor(square) ||
      getAntSquareColor(square, col) ||
      getEmptySquareColor(square, col);

    if (pixelColor) {
      ctx.fillStyle = pixelColor;
      ctx.fillRect(x, y, 1, 1);
    } else {
      ctx.clearRect(x, y, 1, 1);
    }
  }
}

watch(
  () => [props.battle, canvas.value],
  ([newVal]) => {
    if (!canvas.value) return;
    const ctx = canvas.value.getContext('2d');
    if (!ctx) return;
    if (!newVal) {
      ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
    }
    requestAnimationFrame(() => updateCanvas(ctx, newVal as BattleStatus));
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
