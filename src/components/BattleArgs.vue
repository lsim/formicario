<script setup lang="ts">
// This component shows the randomized parameters of an ongoing or finished battle

import { ref } from 'vue';
import { first } from 'rxjs';
import { battleStatusSubject } from '@/workers/WorkerDispatcher.ts';
import type { BattleStatus } from '@/GameSummary.ts';

const battleStatus = ref<BattleStatus | undefined>();

battleStatusSubject.pipe(first()).subscribe((status) => {
  battleStatus.value = status;
});
</script>

<template>
  <div class="args-table" v-if="battleStatus">
    <div class="lbl">Teams:</div>
    <div class="val">{{ battleStatus.teams.map((t) => t.name).join(', ') }}</div>
    <div class="lbl">Map width:</div>
    <div class="val">{{ battleStatus.args.mapWidth }}</div>
    <div class="lbl">Map height:</div>
    <div class="val">{{ battleStatus.args.mapHeight }}</div>
    <div class="lbl">Start ants:</div>
    <div class="val">{{ battleStatus.args.startAnts }}</div>
    <div class="lbl">New food space:</div>
    <div class="val">{{ battleStatus.args.newFoodSpace }}</div>
    <div class="lbl">New food min:</div>
    <div class="val">{{ battleStatus.args.newFoodMin }}</div>
    <div class="lbl">New food diff:</div>
    <div class="val">{{ battleStatus.args.newFoodDiff }}</div>
    <div class="lbl">Half time turn:</div>
    <div class="val">{{ battleStatus.args.halfTimeTurn }}</div>
    <div class="lbl">Time out turn:</div>
    <div class="val">{{ battleStatus.args.timeOutTurn }}</div>
    <div class="lbl">Win percent:</div>
    <div class="val">{{ battleStatus.args.winPercent }}</div>
  </div>
</template>

<style scoped lang="scss">
.args-table {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(6, 1fr);
  gap: 4px;
  font-size: 80%;
  .lbl {
    text-align: right;
    grid-column: 1;
  }
  .val {
    grid-column: 2;
  }
}
</style>
