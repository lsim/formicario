<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import { useWorker, type WorkerName } from '@/workers/WorkerDispatcher.ts';

const props = defineProps<{
  workerName: WorkerName;
  battleId: number;
  zoomLevel: number;
  centerX: number;
  centerY: number;
}>();

const magnifierPixels = ref(500);

const canvasRef = useTemplateRef('canvasRef');

const ctx = computed(() => canvasRef.value?.getContext('2d'));

const worker = useWorker(props.workerName);

const keepRendering = ref(false);

function render(ctx: CanvasRenderingContext2D) {
  const subImageWidth = magnifierPixels.value / props.zoomLevel;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, magnifierPixels.value, magnifierPixels.value);
  ctx.drawImage(
    worker.renderedBattle,
    props.centerX - subImageWidth / 2,
    props.centerY - subImageWidth / 2,
    subImageWidth,
    subImageWidth,
    0,
    0,
    magnifierPixels.value,
    magnifierPixels.value,
  );
  if (keepRendering.value) {
    requestAnimationFrame(() => render(ctx));
  }
}

watch(
  () => [props.battleId, ctx.value],
  ([, ctx]) => {
    if (!ctx || keepRendering.value) return;
    keepRendering.value = true;
    requestAnimationFrame(() => render(ctx as CanvasRenderingContext2D));
  },
);

onBeforeUnmount(() => {
  keepRendering.value = false;
});
</script>

<template>
  <div class="container">
    <canvas ref="canvasRef" :width="magnifierPixels" :height="magnifierPixels" />
  </div>
</template>

<style scoped lang="scss">
.container {
  border-radius: 50%;
  background-color: black;
  position: relative;
  overflow: hidden;
  height: auto;
  width: auto;

  canvas {
    margin-bottom: -7px; // No idea why this is needed
  }
}
</style>
