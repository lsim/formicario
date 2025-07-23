<script setup lang="ts">
import type { BattleSummary } from '@/GameSummary.ts';
import TeamBattleStats from '@/components/TeamBattleStats.vue';
import BattleArgs from '@/components/BattleArgs.vue';
import { ref, useTemplateRef, watch } from 'vue';
import useBattleRenderer from '@/composables/renderer.ts';
import type { BattleStats } from '@/composables/stats.ts';
import BattleGraph from '@/components/BattleGraph.vue';
import StatPropChooser from '@/components/StatPropChooser.vue';

const props = defineProps<{
  summary: BattleSummary;
  stats: BattleStats;
}>();

const battleRenderer = useBattleRenderer();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

const activeTab = ref<'bars' | 'graph' | 'params' | 'end-shot'>('graph');

watch(
  () => [activeTab.value, canvas.value, props.summary],
  ([newTab, newCanvas, newSummary]) => {
    const [t, c, s]: [string, HTMLCanvasElement | undefined, BattleSummary | undefined] = [
      newTab as typeof activeTab.value,
      newCanvas as HTMLCanvasElement | undefined,
      newSummary as BattleSummary | undefined,
    ];
    if (!s) return;
    if (t === 'end-shot') {
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      c.width = s.args.mapWidth;
      c.height = s.args.mapHeight;
      battleRenderer.setTeamColors(s.teams.map((t) => t.color));
      battleRenderer.renderDeltasToBackBuffer(s.squares, s.args, ctx);
    }
  },
  { immediate: true },
);

// // Format duration as in HH:MM:SS
// function formatTimespan(milliseconds: number) {
//   // Convert milliseconds to seconds
//   const totalSeconds = Math.floor(milliseconds / 1000);
//
//   // Calculate hours, minutes, and seconds
//   const hours = Math.floor(totalSeconds / 3600);
//   const minutes = Math.floor((totalSeconds % 3600) / 60);
//   const seconds = totalSeconds % 60;
//
//   // Format with leading zeros
//   const pad = (num: number) => num.toString().padStart(2, '0');
//
//   return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
// }
</script>

<template>
  <p class="panel-tabs">
    <a :class="{ 'is-active': activeTab === 'bars' }" @click="activeTab = 'bars'">Bars</a>
    <a :class="{ 'is-active': activeTab === 'graph' }" @click="activeTab = 'graph'">Graph</a>
    <a :class="{ 'is-active': activeTab === 'params' }" @click="activeTab = 'params'">Parameters</a>
    <a :class="{ 'is-active': activeTab === 'end-shot' }" @click="activeTab = 'end-shot'"
      >End shot</a
    >
  </p>
  <div class="panel-block" v-if="activeTab === 'bars' || activeTab === 'graph'">
    <stat-prop-chooser />
  </div>
  <template v-if="activeTab === 'bars'">
    <team-battle-stats
      v-if="props.summary && props.stats"
      class="panel-block team-stats"
      :battle-summary="props.summary"
      :battle-stats="props.stats"
    />
  </template>
  <template v-else-if="activeTab === 'graph'">
    <battle-graph
      class="panel-block battle-graph"
      :battle-stats="props.stats"
      :is-live="false"
      :stat-prop="'numAnts'"
    />
  </template>
  <template v-else-if="activeTab === 'params'">
    <battle-args
      class="panel-block battle-args"
      :args="props.summary.args"
      :teams="props.summary.teams"
      :seed="props.summary.seed"
    />
  </template>
  <canvas ref="canvas" class="panel-block battle-canvas" v-else-if="activeTab === 'end-shot'" />
  <!--  </article>-->
</template>

<style scoped lang="scss"></style>
