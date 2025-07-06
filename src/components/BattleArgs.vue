<script setup lang="ts">
// This component shows the randomized parameters of an ongoing battle

import type { BattleStatus } from '@/GameSummary.ts';

const props = defineProps<{
  battleStatus: BattleStatus;
}>();
</script>

<template>
  <div class="args-table" v-if="props.battleStatus">
    <div class="lbl">Teams:</div>
    <div class="val">{{ props.battleStatus.teams.map((t) => t.name).join(', ') }}</div>
    <div class="lbl">Map width:</div>
    <div class="val">{{ props.battleStatus.args.mapWidth }}</div>
    <div class="lbl">Map height:</div>
    <div class="val">{{ props.battleStatus.args.mapHeight }}</div>
    <div class="lbl">Start ants:</div>
    <div class="val">{{ props.battleStatus.args.startAnts }}</div>
    <div class="lbl">New food space:</div>
    <div class="val">{{ props.battleStatus.args.newFoodSpace }}</div>
    <div class="lbl">New food min:</div>
    <div class="val">{{ props.battleStatus.args.newFoodMin }}</div>
    <div class="lbl">New food diff:</div>
    <div class="val">{{ props.battleStatus.args.newFoodDiff }}</div>
    <div class="lbl">Half time turn:</div>
    <div class="val">{{ props.battleStatus.args.halfTimeTurn }}</div>
    <div class="lbl">Time out turn:</div>
    <div class="val">{{ props.battleStatus.args.timeOutTurn }}</div>
    <div class="lbl">Win percent:</div>
    <div class="val">{{ props.battleStatus.args.winPercent }}</div>
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
