<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { distinctUntilChanged, map, switchAll, tap } from 'rxjs';
import type { BattleArgs } from '@/Battle.ts';
import { useGameStore } from '@/stores/game.ts';

const props = withDefaults(
  defineProps<{
    isLive?: boolean;
    args?: BattleArgs;
    seed?: number;
  }>(),
  {
    isLive: false,
  },
);

const gameStore = useGameStore();
const battleArgs = ref<BattleArgs | undefined>();

if (props.isLive) {
  const subscription = gameStore.battleStreams$
    .pipe(
      map(([status]) =>
        status.pipe(
          distinctUntilChanged((prev, curr) => prev?.seed === curr.seed),
          tap((status) => {
            battleArgs.value = status.args;
          }),
        ),
      ),
      switchAll(),
    )
    .subscribe();

  onBeforeUnmount(() => {
    subscription.unsubscribe();
  });
} else {
  watch(
    () => props.args,
    (newArgs) => {
      battleArgs.value = newArgs;
    },
    { immediate: true },
  );
}
</script>

<template>
  <div class="args-table" v-if="battleArgs">
    <div class="lbl">Map width:</div>
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
