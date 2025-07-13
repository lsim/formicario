<script setup lang="ts">
import type { SquareStatus, TeamStatus } from '@/GameSummary.ts';
import { computed, ref, useTemplateRef, watch } from 'vue';
import AntMagnifier from '@/components/AntMagnifier.vue';
import { useMagicKeys, useMouseInElement } from '@vueuse/core';
import { battleStatusSubject, getDebugAnts } from '@/workers/WorkerDispatcher.ts';
import { filter, tap } from 'rxjs';
import type { BattleArgs } from '@/Battle.ts';
import Color from 'color';

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
let teamColors: string[] | undefined;
const mapWidth = ref(0);
const mapHeight = ref(0);

function parseTeamColors(teams: TeamStatus[]) {
  teamColors = teams.map((t) => t.color);
}

const context = computed(() => canvas.value?.getContext('2d') || undefined);

function getEmptySquareColor(s: SquareStatus, teamCol: string) {
  if (s.numAnts === 0 && s.numFood === 0 && !s.base && s.team) {
    return Color(teamCol).darken(0.7).hex();
  }
}

function getAntSquareColor(s: SquareStatus, teamCol: string) {
  if (s.numAnts > 0) {
    // Full brightness when there is food as well as ants else slightly dimmed
    return s.numFood > 0 ? Color(teamCol).lighten(0.6).hex() : teamCol;
  }
}

function getEmptyFoodSquareColor(s: SquareStatus, battleArgs: BattleArgs) {
  if (!s.numAnts && s.numFood) {
    // 50% white when there is [;minFood] food, [50%-80%] white when there is [minFood;maxFood] food
    const minFood = battleArgs.newFoodMin;
    const maxFood = battleArgs.newFoodMin + battleArgs.newFoodDiff;
    const food = Math.min(s.numFood, maxFood);
    const whiteRatio = (food - minFood) / (maxFood - minFood || 1);
    return Color('#555').lighten(whiteRatio).hex();
  }
}

function getBaseSquareColor(s: SquareStatus, teamCol: string) {
  // Base squares are mostly white, but tinted with team color
  if (s.base) {
    return Color(teamCol).lighten(0.9).hex();
  }
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
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(backBuffer, 0, 0);

  lastRenderedTurn = lastReceivedTurn;
  requestAnimationFrame(() => updateCanvas(ctx));
}

battleStatusSubject
  .pipe(
    filter(() => !!canvas.value && !!context.value),
    tap((battle) => {
      if (!teamColors) {
        // First status from new battle
        backBuffer.width = battle.args.mapWidth;
        backBuffer.height = battle.args.mapHeight;
        backBuffer.getContext('2d')?.clearRect(0, 0, battle.args.mapWidth, battle.args.mapHeight);
        parseTeamColors(battle.teams);
      }
      if (!mapWidth.value) mapWidth.value = battle.args.mapWidth;
      if (!mapHeight.value) mapHeight.value = battle.args.mapHeight;
      lastReceivedTurn = battle.turns;
    }),
  )
  .subscribe((battle) => {
    renderDeltasToBackBuffer(battle.deltaSquares, battle.args);
    ensureRendering();
  });

function renderDeltasToBackBuffer(deltas: SquareStatus[], battleArgs: BattleArgs) {
  // console.log('Rendering deltas', deltas.length, lastReceivedTurn, lastRenderedTurn);
  for (let i = 0; i < deltas.length; i++) {
    const square = deltas[i];
    const x = square.index % battleArgs.mapWidth;
    const y = Math.floor(square.index / battleArgs.mapWidth);
    const teamCol: string =
      square.team === 0 ? 'magenta' : teamColors?.[square.team - 1] || 'magenta';

    const pixelColor =
      getBaseSquareColor(square, teamCol) ||
      getEmptyFoodSquareColor(square, battleArgs) ||
      getAntSquareColor(square, teamCol) ||
      getEmptySquareColor(square, teamCol);

    if (pixelColor) {
      backBufferCtx.fillStyle = pixelColor;
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
  getDebugAnts(
    Math.round(magX.value / canvasDefaultZoom.value),
    Math.round(magY.value / canvasDefaultZoom.value) - 1,
  ).then(() => {});
}
</script>

<template>
  <div class="battle-feed">
    <canvas
      ref="canvas"
      :width="mapWidth"
      :height="mapHeight"
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
