<script setup lang="ts">
import type { BattleSummary } from '@/GameSummary.ts';
import { useTemplateRef, watch } from 'vue';
import useBattleRenderer from '@/composables/renderer.ts';

const props = withDefaults(
  defineProps<{
    summary: BattleSummary;
    zoomLevel?: number;
  }>(),
  {
    zoomLevel: 1,
  },
);

const battleRenderer = useBattleRenderer();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

watch(
  () => [canvas.value, props.summary],
  ([newCanvas, newSummary]) => {
    const [c, s]: [HTMLCanvasElement | undefined, BattleSummary | undefined] = [
      newCanvas as HTMLCanvasElement | undefined,
      newSummary as BattleSummary | undefined,
    ];
    if (!s || !c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = s.args.mapWidth;
    c.height = s.args.mapHeight;
    battleRenderer.setTeamColors(s.teams.map((t) => t.color));
    battleRenderer.renderDeltasToBackBuffer(s.squares, s.args, ctx);
  },
  { immediate: true },
);
</script>

<template>
  <div class="battle-render">
    <canvas ref="canvas" class="battle-render-canvas" :style="{ zoom: zoomLevel }" />
  </div>
</template>

<style scoped lang="scss">
.battle-render {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
