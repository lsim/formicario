<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';

const props = defineProps<{
  backBuffer: HTMLCanvasElement;
  zoomLevel: number;
  centerX: number;
  centerY: number;
}>();

const magnifierPixels = ref(500);

const canvasRef = useTemplateRef('canvasRef');

const ctx = computed(() => canvasRef.value?.getContext('2d'));

const keepRendering = ref(false);

function render(sourceCanvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const subImageWidth = magnifierPixels.value / props.zoomLevel;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, magnifierPixels.value, magnifierPixels.value);
  ctx.drawImage(
    props.backBuffer,
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
    requestAnimationFrame(() => render(sourceCanvas, ctx));
  }
}

watch(
  () => [props.backBuffer, ctx.value],
  ([buf, ctx]) => {
    keepRendering.value = !!(buf && ctx);
    if (buf && ctx) {
      requestAnimationFrame(() =>
        render(buf as HTMLCanvasElement, ctx as CanvasRenderingContext2D),
      );
    }
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
