<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch, defineProps } from 'vue';
import AntMagnifier from '@/components/AntMagnifier.vue';
import { useMagicKeys, useMouseInElement } from '@vueuse/core';
import { useWorker, type WorkerName } from '@/workers/WorkerDispatcher.ts';

const props = withDefaults(
  defineProps<{
    zoomLevel?: number;
    centerMagnifier?: boolean;
    workerName: WorkerName;
  }>(),
  {
    zoomLevel: 2,
    centerMagnifier: false,
  },
);

// Event when ant debug at specific coordinates is requested
const emits = defineEmits<{
  (e: 'ant-debug-requested', x: number, y: number): void;
}>();

const worker = useWorker(props.workerName);
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const context = computed(() => canvas.value?.getContext('2d'));

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

const lastKnownBattleId = ref(-1);

const subscription = worker.battleStatuses$.subscribe((battle) => {
  if (lastKnownBattleId.value !== battle.battleId) {
    // First status from new battle
    if (props.centerMagnifier) {
      magnifierX.value = (battle.args.mapWidth * props.zoomLevel) / 2;
      magnifierY.value = (battle.args.mapHeight * props.zoomLevel) / 2;
      magnifierPinned.value = true;
    }
    lastKnownBattleId.value = battle.battleId;

    context.value?.clearRect(0, 0, battle.args.mapWidth, battle.args.mapHeight);
    mapWidth.value = battle.args.mapWidth;
    mapHeight.value = battle.args.mapHeight;
  }
  ensureRendering();
});

onBeforeUnmount(() => {
  subscription?.unsubscribe();
});

let renderPending = false;
function ensureRendering() {
  // Skip rendering frames that arrive faster than the browser can render
  if (renderPending || !context.value) return;
  renderPending = true;
  requestAnimationFrame(() => {
    if (!context.value) return;

    // Ensure the canvas is the right size
    if (
      canvas.value &&
      (canvas.value.width !== worker.renderedBattle.width ||
        canvas.value.height !== worker.renderedBattle.height)
    ) {
      canvas.value.width = worker.renderedBattle.width;
      canvas.value.height = worker.renderedBattle.height;
    }
    // Copy from back buffer to canvas
    context.value.imageSmoothingEnabled = false;
    context.value.drawImage(worker.renderedBattle, 0, 0);
    renderPending = false;
  });
}

function getAntData() {
  emits(
    'ant-debug-requested',
    Math.round(magX.value / (props.zoomLevel || 1)),
    Math.round(magY.value / (props.zoomLevel || 1)) - 1,
  );
}
</script>

<template>
  <div class="battle-feed">
    <div class="canvas-container">
      <canvas
        ref="canvas"
        :width="mapWidth"
        :height="mapHeight"
        :style="{ zoom: props.zoomLevel }"
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
        :worker-name="workerName"
        :battle-id="lastKnownBattleId"
        :zoom-level="5"
        :center-x="magX / (props.zoomLevel || 1)"
        :center-y="magY / (props.zoomLevel || 1)"
        :style="{ left: `${magX}px`, top: `${magY}px` }"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.battle-feed {
  display: flex;
  flex-direction: column;
  align-items: center;
  .canvas-container {
    position: relative;
  }
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
