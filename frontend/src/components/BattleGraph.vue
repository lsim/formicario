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
import { map, Subscription, switchAll } from 'rxjs';
import { useGameStore } from '@/stores/game.ts';
import StatPropChooser from '@/components/StatPropChooser.vue';

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
  elements: {
    point: { radius: 0 },
    line: {
      // tension: 0.9,
      borderWidth: 2,
      cubicInterpolationMode: 'monotone',
    },
  },
  animations: {
    y: {
      type: 'number',
      properties: ['y'],
      // Last point in the dataset animates from the previous point for less seizure inducing visuals
      from(ctx) {
        if (ctx.type !== 'data') return;
        if (ctx.mode !== 'default') return;
        const data = ctx.chart.getDatasetMeta(ctx.datasetIndex)?.data;
        if (!data || data.length < 2) return;
        if (data.length - 1 === ctx.dataIndex) {
          const point = data[ctx.dataIndex - 1];
          return point?.y;
        }
      },
    },
  },
};

function clearChart() {
  if (!chartRef.value) return;
  const chartInstance = chartRef.value.chart as { clear: () => void };
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

let subscription: Subscription | null = null;
watch(
  () => [props.isLive, props.battleStats],
  ([newIsLive, newBattleStats]) => {
    if (newIsLive) {
      let lastBattleSeed = 0;
      subscription?.unsubscribe();
      subscription = gameStore.battleStreams$
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
    } else if (newBattleStats) {
      subscription?.unsubscribe();
      subscription = null;
      chartData.value = chartDataFromStats(newBattleStats as BattleStats);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  subscription?.unsubscribe();
  subscription = null;
});

watch(
  () => props.battleStats,
  (newStats) => {
    clearChart();
    chartData.value = chartDataFromStats(newStats);
  },
  { immediate: true },
);

watch(
  () => gameStore.selectedStatusProperty,
  () => {
    clearChart();
    chartData.value = chartDataFromStats(props.battleStats);
  },
);
</script>

<template>
  <div class="columns">
    <div class="column is-one-fifth">
      <stat-prop-chooser />
    </div>
    <div class="column">
      <Line :data="chartData" :options="options" ref="chart" />
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
