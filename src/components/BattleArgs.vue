<script setup lang="ts">
// This component shows the randomized parameters of an ongoing or finished battle

import { onBeforeUnmount, ref } from 'vue';
import { first, type Subscription } from 'rxjs';
import type { TeamStatus } from '@/GameSummary.ts';
import type { BattleArgs } from '@/Battle.ts';
import { useWorker } from '@/workers/WorkerDispatcher.ts';

const props = defineProps<{
  args?: BattleArgs;
  teams?: TeamStatus[];
  seed?: number;
}>();

const worker = useWorker();

const battleArgs = ref<BattleArgs | undefined>(props.args);
const battleTeams = ref<TeamStatus[] | undefined>(props.teams);

let subscription: Subscription | undefined;
if (!battleArgs.value) {
  subscription = worker.battleStatusSubject.pipe(first()).subscribe((status) => {
    battleArgs.value = status.args;
    battleTeams.value = status.teams;
  });
}

onBeforeUnmount(() => {
  subscription?.unsubscribe();
});
</script>

<template>
  <div class="args-table" v-if="battleArgs && battleTeams">
    <div class="lbl">Teams:</div>
    <div class="val">{{ battleTeams.map((t) => t.name).join(', ') }}</div>
    <template v-if="seed">
      <div class="lbl">Seed:</div>
      <div class="val">{{ seed }}</div>
      <div class="lbl">Map width:</div>
    </template>
    <div class="val">{{ battleArgs.mapWidth }}</div>
    <div class="lbl">Map height:</div>
    <div class="val">{{ battleArgs.mapHeight }}</div>
    <div class="lbl">Start ants:</div>
    <div class="val">{{ battleArgs.startAnts }}</div>
    <div class="lbl">New food space:</div>
    <div class="val">{{ battleArgs.newFoodSpace }}</div>
    <div class="lbl">New food min:</div>
    <div class="val">{{ battleArgs.newFoodMin }}</div>
    <div class="lbl">New food diff:</div>
    <div class="val">{{ battleArgs.newFoodDiff }}</div>
    <div class="lbl">Half time turn:</div>
    <div class="val">{{ battleArgs.halfTimeTurn }}</div>
    <div class="lbl">Time out turn:</div>
    <div class="val">{{ battleArgs.timeOutTurn }}</div>
    <div class="lbl">Win percent:</div>
    <div class="val">{{ battleArgs.winPercent }}</div>
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
