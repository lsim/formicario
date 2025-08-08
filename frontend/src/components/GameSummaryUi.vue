<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import type { BattleSummary, GameSummary } from '@/GameSummary.ts';
import Color from 'color';
import { useGameStore } from '@/stores/game.ts';
import { map, switchAll, tap } from 'rxjs';
import type { BattleSummaryStats } from '@/composables/stats.ts';
import { useTeamStore } from '@/stores/teams.ts';

const worker = useWorker('game-worker');
const gameStore = useGameStore();
const teamStore = useTeamStore();

const gameSummary = ref<GameSummary>();

const subscription = worker.gameSummaries$.subscribe((summary) => (gameSummary.value = summary));

const battleSummaryStats = ref<BattleSummaryStats[]>([]);

const selectedRow = ref<number | null>(null);

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

onBeforeUnmount(() => {
  subscription.unsubscribe();
  subscription2.unsubscribe();
});

function winnerStyle(battle: BattleSummary) {
  const winnerTeam = battle.teams.find((t) => t.id === battle.winner);
  if (!winnerTeam) return {};
  const c = new Color(winnerTeam.color);
  return {
    'background-color': `hsl(${c.hue()}, ${c.saturationl()}%, ${c.lightness()}%)`,
    color: `hsl(${c.hue()}, ${c.saturationl()}%, ${c.lightness() > 50 ? 0 : 100}%)`,
  };
}

watch(
  () => selectedRow.value,
  (newIdx) => {
    if (newIdx == null) {
      gameStore.selectedBattleSummaryStats = null;
      return;
    }
    // Delay the heavy lifting a bit, so the table selection updates smoothly
    setTimeout(() => {
      gameStore.selectedBattleSummaryStats =
        selectedRow.value != null ? battleSummaryStats.value[selectedRow.value] || null : null;
    }, 50);
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
              <th>Losers</th>
              <th>Width</th>
              <th>Height</th>
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
              <td>{{ battle.battleId }}</td>
              <td>
                <span class="button is-static" :style="winnerStyle(battle)">{{
                  teamStore.teamName(battle.winner)
                }}</span>
              </td>
              <td>{{ battle.turns }}</td>
              <td>
                {{
                  battle.teams
                    .filter((t) => t.id !== battle.winner)
                    .map((t) => teamStore.teamName(t.id))
                    .join(', ')
                }}
              </td>
              <td>{{ battle.args.mapWidth }}</td>
              <td>{{ battle.args.mapHeight }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
.table td {
  cursor: pointer;
}

.table tr {
  &.is-selected {
    background-color: var(--bulma-primary-dark);
    color: var(--bulma-primary-light);
  }
}
</style>
