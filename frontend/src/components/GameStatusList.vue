z
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { BattleSummary } from '@/GameSummary.ts';
import Color from 'color';
import { useGameStore } from '@/stores/game.ts';
import { filter, map, switchAll, tap } from 'rxjs';
import type { BattleSummaryStats } from '@/composables/stats.ts';
import { useTeamStore } from '@/stores/teams.ts';

const gameStore = useGameStore();
const teamStore = useTeamStore();

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
    filter((bss) => bss.summary.terminationReason !== 'user-abort' && bss.summary.isRanked),
    tap((bss: BattleSummaryStats) => battleSummaryStats.value.push(bss)),
  )
  .subscribe();

onBeforeUnmount(() => {
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
  <article class="panel is-primary">
    <p class="panel-heading">Recent battles</p>
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
              v-for="(battle, idx) in battleSummaryStats"
              :key="battle.summary.battleId"
              :class="{
                'is-selected': selectedRow === idx,
              }"
              @click="selectedRow = selectedRow === idx ? null : idx"
            >
              <td>{{ battle.summary.battleId }}</td>
              <td>
                <span class="button is-static" :style="winnerStyle(battle.summary)">{{
                  teamStore.teamName(battle.summary.winner)
                }}</span>
              </td>
              <td>{{ battle.summary.turns }}</td>
              <td>
                {{
                  battle.summary.teams
                    .filter((t) => t.id !== battle.summary.winner)
                    .map((t) => teamStore.teamName(t.id))
                    .join(', ')
                }}
              </td>
              <td>{{ battle.summary.args.mapWidth }}</td>
              <td>{{ battle.summary.args.mapHeight }}</td>
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
