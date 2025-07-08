<script setup lang="ts">
import type { BattleStatus, SquareStatus, TeamStatus } from '@/GameSummary.ts';
import { computed, useTemplateRef, watch } from 'vue';
import { normal } from 'color-blend';

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

const backBuffer = document.createElement('canvas');
const backBufferCtx = backBuffer.getContext('2d') as CanvasRenderingContext2D;

const props = defineProps<{
  battle: BattleStatus;
}>();

// const battleTeams = computed(() => props.battle.teams);
let teamColors: number[][] | undefined;

function parseTeamColor(color: string) {
  return (
    color
      .match(/#(\w{2})(\w{2})(\w{2})/)
      ?.slice(1)
      .map((x) => parseInt(x, 16)) || [255, 0, 255]
  );
}

function parseTeamColors(teams: TeamStatus[]) {
  teamColors = teams.map((t) => parseTeamColor(t.color));
  console.log('Parsed team colors', teamColors);
}

const context = computed(() => canvas.value?.getContext('2d') || undefined);

function getEmptySquareColor(s: SquareStatus, teamCol: number[]) {
  if (s.numAnts === 0 && s.numFood === 0 && !s.base && s.team) {
    return mixColors([0, 0, 0], teamCol, 0.3);
  }
}

function getAntSquareColor(s: SquareStatus, teamCol: number[]) {
  if (s.numAnts > 0) {
    // Full brightness when there is food as well as ants else slightly dimmed
    return s.numFood > 0 ? teamCol : mixColors([0, 0, 0], teamCol, 0.8);
  }
}

function getEmptyFoodSquareColor(s: SquareStatus) {
  if (!s.numAnts && s.numFood) {
    // 50% white when there is [;minFood] food, [50%-80%] white when there is [minFood;maxFood] food
    const minFood = props.battle.args.newFoodMin || 1;
    const maxFood = props.battle.args.newFoodMin + props.battle.args.newFoodDiff || 1;
    const whitePercentage =
      30 + ((Math.min(s.numFood, maxFood) - minFood) / (maxFood - minFood)) * 50;
    return [255, 255, 255].map((x) => Math.floor((x * whitePercentage) / 100));
  }
}

function getBaseSquareColor(s: SquareStatus, teamCol: number[]) {
  // Base squares are mostly white, but tinted with team color
  if (s.base) {
    // Mix with 80% white (background is black): normalize([255,255,255] + teamCol * 0.2) where normalize ensures components are scaled back into [0,255]
    return mixColors([255, 255, 255], teamCol, 0.8);
  }
}

// color1Weight is in [0,1] and color2Weight is 1 - color1Weight
// The components of the result is scaled back into [0,255]
// function mixColors_homebrew(color1: number[], color2: number[], color1Weight: number) {
//   const r = Math.floor(color1[0] * color1Weight + color2[0] * (1 - color1Weight));
//   const g = Math.floor(color1[1] * color1Weight + color2[1] * (1 - color1Weight));
//   const b = Math.floor(color1[2] * color1Weight + color2[2] * (1 - color1Weight));
//   const scaler = Math.max(r, g, b) / 255;
//   return [Math.floor(r / scaler), Math.floor(g / scaler), Math.floor(b / scaler)];
// }

// Color1 is the background color, color2 is the foreground color
function mixColors(color1: number[], color2: number[], foregroundAlpha: number) {
  const blended = normal(
    { r: color1[0], g: color1[1], b: color1[2], a: 1 },
    { r: color2[0], g: color2[1], b: color2[2], a: foregroundAlpha },
  );
  return [blended.r, blended.g, blended.b];
}

let lastRenderedTurn = -1;
let lastReceivedTurn = -1;
function updateCanvas(ctx?: CanvasRenderingContext2D) {
  // squares is a list of squares that have changed since the last status update
  if (!ctx || lastReceivedTurn <= lastRenderedTurn) {
    // All caught up
    console.log('All caught up at turn', lastReceivedTurn);
    rendering = false;
    return;
  }
  // console.log('Rendering turn', lastReceivedTurn, lastRenderedTurn);

  // Copy from back buffer to canvas
  ctx.drawImage(backBuffer, 0, 0);

  lastRenderedTurn = lastReceivedTurn;
  requestAnimationFrame(() => updateCanvas(ctx));
}

watch(
  () => [props.battle, canvas.value],
  ([newVal], [oldVal]) => {
    if (!canvas.value || !context.value) {
      return;
    }
    if (!newVal && oldVal) {
      // A battle ended
      backBuffer.getContext('2d')?.clearRect(0, 0, backBuffer.width, backBuffer.height);
      teamColors = undefined;
      return;
    }
    const battle = newVal as BattleStatus;
    // console.log(
    //   'Received battle data',
    //   battle.deltaSquares.length,
    //   lastReceivedTurn,
    //   battle.turns,
    //   lastRenderedTurn,
    // );
    lastReceivedTurn = battle.turns;
    if (!teamColors) {
      // First status from new battle
      backBuffer.width = battle.args.mapWidth;
      backBuffer.height = battle.args.mapHeight;
      backBuffer.getContext('2d')?.clearRect(0, 0, battle.args.mapWidth, battle.args.mapHeight);
      parseTeamColors(battle.teams);
    }
    renderDeltasToBackBuffer(battle.deltaSquares);
    ensureRendering();
  },
);

function renderDeltasToBackBuffer(deltas: SquareStatus[]) {
  // console.log('Rendering deltas', deltas.length, lastReceivedTurn, lastRenderedTurn);
  const mapWidth = props.battle.args.mapWidth;
  for (let i = 0; i < deltas.length; i++) {
    const square = deltas[i];
    const x = square.index % mapWidth;
    const y = Math.floor(square.index / mapWidth);
    const teamCol: number[] =
      square.team === 0 ? [255, 0, 255] : teamColors?.[square.team - 1] || [255, 0, 255];

    const pixelColor =
      getBaseSquareColor(square, teamCol) ||
      getEmptyFoodSquareColor(square) ||
      getAntSquareColor(square, teamCol) ||
      getEmptySquareColor(square, teamCol);

    if (pixelColor) {
      backBufferCtx.fillStyle = `rgb(${pixelColor[0]}, ${pixelColor[1]}, ${pixelColor[2]})`;
      backBufferCtx.fillRect(x, y, 1, 1);
    } else {
      backBufferCtx.clearRect(x, y, 1, 1);
    }
  }
}
let rendering = false;
function ensureRendering() {
  if (rendering) return;
  rendering = true;
  requestAnimationFrame(() => updateCanvas(context.value));
}
</script>

<template>
  <div class="battle-feed">
    <canvas ref="canvas" :width="props.battle.args.mapWidth" :height="props.battle.args.mapHeight">
    </canvas>
  </div>
</template>

<style scoped lang="scss">
canvas {
  background-color: black;
  zoom: 2;
}
</style>
