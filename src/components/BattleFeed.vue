<script setup lang="ts">
import type { BattleStatus, SquareStatus, TeamStatus } from '@/GameSummary.ts';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { normal } from 'color-blend';
import AntMagnifier from '@/components/AntMagnifier.vue';
import { useMagicKeys, useMouseInElement } from '@vueuse/core';

const props = defineProps<{
  battle: BattleStatus;
}>();

const emit = defineEmits<{
  (event: 'debug-ants', coords: { x: number; y: number }): void;
}>();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const canvasDefaultZoom = ref(2);

const backBuffer = document.createElement('canvas');
const backBufferCtx = backBuffer.getContext('2d') as CanvasRenderingContext2D;

// Magnifier stuff
const { ctrl, meta } = useMagicKeys();
const { elementX: magnifierX, elementY: magnifierY, isOutside } = useMouseInElement(canvas);
const magnifierPinned = ref(false);
const magnifierActive = computed(() => (ctrl.value || meta.value) && !isOutside.value);
const pinnedX = ref(0);
const pinnedY = ref(0);

const magX = computed(() => {
  if (magnifierPinned.value) {
    return pinnedX.value;
  }
  return magnifierX.value;
});

const magY = computed(() => {
  if (magnifierPinned.value) {
    return pinnedY.value;
  }
  return magnifierY.value;
});

const magActive = computed(() => magnifierActive.value || magnifierPinned.value);

watch(
  () => magnifierPinned.value,
  (newVal) => {
    if (newVal) {
      pinnedX.value = magnifierX.value;
      pinnedY.value = magnifierY.value;
    }
  },
);

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
    return s.numFood > 0 ? teamCol : mixColors([0, 0, 0], teamCol, 0.6);
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

function getAntData() {
  emit('debug-ants', {
    x: Math.round(magX.value / canvasDefaultZoom.value),
    y: Math.round(magY.value / canvasDefaultZoom.value) - 1,
  });
}
</script>

<template>
  <div class="battle-feed">
    <canvas
      ref="canvas"
      :width="props.battle.args.mapWidth"
      :height="props.battle.args.mapHeight"
      :style="{ zoom: canvasDefaultZoom }"
      @click.exact="magnifierPinned = false"
      @click.ctrl.exact="getAntData"
      @click.meta.exact="getAntData"
      @click.ctrl.right.capture.prevent="magnifierPinned = true"
      @click.meta.right.capture.prevent="magnifierPinned = true"
      title="[Ctrl] or [Cmd] for magnifier, click to view brain, right click to pin"
    >
    </canvas>
    <ant-magnifier
      v-if="magActive"
      class="magnifier"
      :back-buffer="backBuffer"
      :zoom-level="5"
      :center-x="magX / canvasDefaultZoom"
      :center-y="magY / canvasDefaultZoom"
      :style="{ left: `${magX}px`, top: `${magY}px` }"
    />
  </div>
</template>

<style scoped lang="scss">
.battle-feed {
  position: relative;
  width: auto;
  height: auto;
}
canvas {
  background-color: black;
}

.magnifier {
  position: absolute;
  pointer-events: none;
  z-index: 1;
  top: 0;
  left: 0;
  width: auto;
  height: auto;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 0 1rem rgba(white, 0.5));
}
</style>
