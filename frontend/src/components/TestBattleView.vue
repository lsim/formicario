<script setup lang="ts">
import BattleFeed from '@/components/BattleFeed.vue';
import SpeedGauge from '@/components/SpeedGauge.vue';
import { useGameStore } from '@/stores/game.ts';
import { faPause, faPlay, faStepForward } from '@fortawesome/free-solid-svg-icons';
import type { BattleArgs } from '@/Battle.ts';
import { ref } from 'vue';
import { watchDebounced } from '@vueuse/core';

const props = defineProps<{
  code: string;
  color: string;
}>();

const gameStore = useGameStore();

const battleSeed = ref(1);

watchDebounced(
  () => ({ code: props.code, color: props.color }),
  async ({ code, color }) => {
    await gameStore.stop();
    setTimeout(() => {
      startDemo(code, color);
    }, 1000);
  },
  { debounce: 3000 },
);

function startDemo(code: string, color: string) {
  if (!code) return;
  const battleArgs: BattleArgs = {
    mapWidth: 64,
    mapHeight: 128,
    newFoodSpace: 25,
    newFoodMin: 20,
    newFoodDiff: 20,
    startAnts: 25,
    halfTimeTurn: 10000,
    halfTimePercent: 60,
    timeOutTurn: 20000,
    winPercent: 70,
    statusInterval: 10,
  };

  const teamWithCode = {
    id: 'TestAnt',
    name: 'Test Ant',
    code,
    color,
  };

  gameStore.runBattle(battleArgs, [teamWithCode], battleSeed.value++);
}

function pauseDemo() {
  gameStore.pause();
}

function resumeDemo() {
  gameStore.resume();
}

function stepForward() {
  gameStore.step(1);
}
</script>

<template>
  <div class="panel is-primary">
    <div class="panel-heading is-align-content-space-between">
      <div class="field">
        <a class="control button is-link is-small" @click="pauseDemo" v-if="!gameStore.gamePaused"
          ><font-awesome-icon :icon="faPause"
        /></a>
        <a class="control button is-link is-small" @click="resumeDemo" v-if="gameStore.gamePaused"
          ><font-awesome-icon :icon="faPlay"
        /></a>
        <a class="control button is-link is-small" @click="stepForward" v-if="gameStore.gamePaused"
          ><font-awesome-icon :icon="faStepForward"
        /></a>
      </div>
    </div>
    <div class="panel-block is-justify-content-center">
      <battle-feed :zoom-level="2" :center-magnifier="true" />
    </div>
    <div class="panel-block is-justify-content-center">
      <speed-gauge />
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
