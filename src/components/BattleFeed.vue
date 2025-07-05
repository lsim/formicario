<script setup lang="ts">
import type { BattleStatus } from '@/GameSummary.ts';
import { ref, watch } from 'vue';

const canvas = ref<HTMLCanvasElement | undefined>();

const props = defineProps<{
  battle: BattleStatus;
}>();

watch(
  () => props.battle,
  (newVal) => {
    if (!canvas.value) return;
    const c = canvas.value;
    const ctx = canvas.value.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);

    // squares is a list of squares that have changed since the last status update
    const squares = newVal.deltaSquares;
    const teams = newVal.teams;
    for (let i = 0; i < squares.length; i++) {
      const square = squares[i];
      const x = square.index % props.battle.args.mapWidth;
      const y = Math.floor(square.index / props.battle.args.mapWidth);
      ctx.fillStyle = square.team ? teams[square.team - 1].color : 'black';
      ctx.fillRect(x, y, 1, 1);
    }
  },
);
</script>

<template>
  <div class="battle-feed">
    <canvas
      id="battle-feed-canvas"
      ref="canvas"
      :width="props.battle.args.mapWidth"
      :height="props.battle.args.mapHeight"
    >
    </canvas>
  </div>
</template>

<style scoped></style>
