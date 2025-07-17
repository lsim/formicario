<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import AntMagnifier from '@/components/AntMagnifier.vue';
import { useMagicKeys, useMouseInElement } from '@vueuse/core';
import { filter, tap } from 'rxjs';
import useBattleRenderer from '@/renderer.ts';
import { useWorker } from '@/workers/WorkerDispatcher.ts';

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const canvasDefaultZoom = ref(2);

const backBuffer = document.createElement('canvas');
const backBufferCtx = backBuffer.getContext('2d') as CanvasRenderingContext2D;

const battleRenderer = useBattleRenderer();
const worker = useWorker();

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

const mapWidth = ref(0);
const mapHeight = ref(0);

const context = computed(() => canvas.value?.getContext('2d') || undefined);

let lastRenderedTurn = -1;
let lastReceivedTurn = -1;
function updateCanvas(ctx?: CanvasRenderingContext2D) {
  // squares is a list of squares that have changed since the last status update
  if (!ctx || lastReceivedTurn <= lastRenderedTurn) {
    // All caught up
    console.debug('All caught up at turn', lastReceivedTurn);
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

const subscription = worker.battleStatusSubject
  .pipe(
    filter(() => !!canvas.value && !!context.value && !!backBufferCtx),
    tap((battle) => {
      if (lastRenderedTurn === -1 || battle.turns < lastReceivedTurn) {
        // First status from new battle

        lastRenderedTurn = 0;
        backBuffer.width = battle.args.mapWidth;
        backBuffer.height = battle.args.mapHeight;
        backBufferCtx.clearRect(0, 0, battle.args.mapWidth, battle.args.mapHeight);
        context.value?.clearRect(0, 0, battle.args.mapWidth, battle.args.mapHeight);
        battleRenderer.setTeamColors(battle.teams.map((t) => t.color));
        mapWidth.value = battle.args.mapWidth;
        mapHeight.value = battle.args.mapHeight;
      }
      lastReceivedTurn = battle.turns;
    }),
  )
  .subscribe((battle) => {
    battleRenderer.renderDeltasToBackBuffer(battle.deltaSquares, battle.args, backBufferCtx);
    ensureRendering();
  });

let rendering = false;
function ensureRendering() {
  if (rendering) return;
  rendering = true;
  requestAnimationFrame(() => updateCanvas(context.value));
}

function getAntData() {
  worker
    .getDebugAnts(
      Math.round(magX.value / canvasDefaultZoom.value),
      Math.round(magY.value / canvasDefaultZoom.value) - 1,
    )
    .then(() => {});
}

onBeforeUnmount(() => {
  subscription?.unsubscribe();
});
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
