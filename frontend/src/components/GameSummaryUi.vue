<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import type { BattleSummary, GameSummary } from '@/GameSummary.ts';
import Color from 'color';
import { useGameStore } from '@/stores/game.ts';
import { map, switchAll, tap } from 'rxjs';
import type { BattleSummaryStats } from '@/composables/stats.ts';

const worker = useWorker();
const gameStore = useGameStore();

const gameSummary = ref<GameSummary>();

const subscription = worker.gameSummarySubject$.subscribe(
  (summary) => (gameSummary.value = summary),
);

const battleSummaryStats = ref<BattleSummaryStats[]>([]);

const subscription2 = gameStore.battleStreams$
  .pipe(
    map(([, summaryStats]) => summaryStats),
    tap(() => {
      battleSummaryStats.value = [];
      selectedRow.value = null;
    }),
    switchAll(),
    tap((bss: BattleSummaryStats) => battleSummaryStats.value.push(bss)),
  )
  .subscribe();

const selectedRow = ref<number | null>(null);

onBeforeUnmount(() => {
  subscription.unsubscribe();
  subscription2.unsubscribe();
});

function winnerStyle(battle: BattleSummary) {
  const winnerTeam = battle.teams.find((t) => t.name === battle.winner);
  if (!winnerTeam) return {};
  const c = new Color(winnerTeam.color);
  return {
    'background-color': `hsl(${c.hue()}, ${c.saturationl()}%, ${c.lightness()}%)`,
    color: `hsl(${c.hue()}, ${c.saturationl()}%, ${c.lightness() > 50 ? 0 : 100}%)`,
  };
}

watch(
  () => selectedRow.value,
  () => {
    gameStore.selectedBattleSummaryStats =
      selectedRow.value != null ? battleSummaryStats.value[selectedRow.value] || null : null;
  },
);
</script>

<template>
  <article class="panel is-primary" v-if="gameSummary">
    <p class="panel-heading">
      Previous game
      <span class="is-pulled-right" v-if="gameSummary">Seed:{{ gameSummary.seed }}</span>
    </p>
    <div class="panel-block">
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Battle</th>
              <th>Winner</th>
              <th>Turns</th>
              <th>Teams</th>
              <th>Width</th>
              <th>Height</th>
              <th>Seed</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(battle, idx) in gameSummary.battles"
              :key="battle.seed + '-' + battle.turns"
              :class="{
                'is-selected': selectedRow === idx,
              }"
              @click="selectedRow = selectedRow === idx ? null : idx"
            >
              <td>{{ idx + 1 }}</td>
              <td>
                <span class="button is-static" :style="winnerStyle(battle)">{{
                  battle.winner
                }}</span>
              </td>
              <td>{{ battle.turns }}</td>
              <td>{{ battle.teams.map((t) => t.name).join(', ') }}</td>
              <td>{{ battle.args.mapWidth }}</td>
              <td>{{ battle.args.mapHeight }}</td>
              <td>{{ battle.seed }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
.table-container {
}
</style>
