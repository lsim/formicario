<script setup lang="ts">
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  type ChartData,
  type ChartOptions,
} from 'chart.js';

import { type BattleStats } from '@/composables/stats.ts';
import { onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue';
import { map, switchAll } from 'rxjs';
import { useGameStore } from '@/stores/game.ts';

ChartJS.register(Title, Tooltip, Legend, PointElement, LineElement, CategoryScale, LinearScale);

const chartRef = useTemplateRef('chart');

const gameStore = useGameStore();

const props = withDefaults(
  defineProps<{
    isLive?: boolean;
    battleStats?: BattleStats;
  }>(),
  {
    isLive: false,
  },
);

const chartData = shallowRef<ChartData<'line', number[]>>({ labels: [], datasets: [] });

const options: ChartOptions<'line'> = {
  elements: { point: { radius: 0 } },
  animation: false,
};

function clearChart() {
  if (!chartRef.value) return;
  const chartInstance = chartRef.value.chart as { clear: () => void };
  console.debug('BattleGraph clearing');
  chartInstance.clear();
}

function chartDataFromStats(stats?: BattleStats) {
  // Use actual turn numbers as x-axis labels
  if (!stats) return { labels: [], datasets: [] };
  const labels = stats.turn;
  // A dataset for each team
  const datasets = Object.entries(stats.teams).map(([teamName, teamStats]) => {
    return {
      label: teamName,
      data: teamStats.stats[gameStore.selectedStatusProperty],
      borderColor: teamStats.teamColor,
      borderWidth: 1,
    };
  });
  return { labels, datasets };
}

if (props.isLive || !props.battleStats) {
  let lastBattleSeed = 0;
  const subscription = gameStore.battleStreams$
    .pipe(
      map(([, , stats]) => stats),
      switchAll(),
      // When status from a new battle is received, clear the chart. The new battle will have a new seed.
    )
    .subscribe((stats) => {
      if (stats.seed !== lastBattleSeed) {
        // Clear chart when new battle is received
        clearChart();
        lastBattleSeed = stats.seed;
      }
      chartData.value = chartDataFromStats(stats);
    });

  onBeforeUnmount(() => {
    subscription.unsubscribe();
  });
} else {
  chartData.value = chartDataFromStats(props.battleStats);
}

watch(
  () => gameStore.selectedStatusProperty,
  () => {
    clearChart();
    chartData.value = chartDataFromStats(props.battleStats);
  },
);
</script>

<template>
  <div>
    <Line :data="chartData" :options="options" ref="chart" />
  </div>
</template>

<style scoped lang="scss"></style>
