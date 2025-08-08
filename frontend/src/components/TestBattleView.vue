<script setup lang="ts">
import BattleFeed from '@/components/BattleFeed.vue';
import SpeedGauge from '@/components/SpeedGauge.vue';
import {
  faForwardFast,
  faPause,
  faPlay,
  faRotateLeft,
  faStepForward,
} from '@fortawesome/free-solid-svg-icons';
import type { BattleArgs } from '@/Battle.ts';
import { onBeforeUnmount, ref } from 'vue';
import { watchDebounced } from '@vueuse/core';
import type { BattleStatus } from '@/GameSummary.ts';
import type { Observable } from 'rxjs';
import useSingleBattle, { BattleState } from '@/composables/single-battle.ts';

const props = defineProps<{
  code: string;
  color: string;
  battleStatuses$: Observable<BattleStatus>;
}>();

const emits = defineEmits<{
  (e: 'ant-debug-requested', x: number, y: number): void;
}>();

const singleBattle = useSingleBattle('debug-worker');

const battleSeed = ref(1);

watchDebounced(
  () => ({ code: props.code, color: props.color }),
  async ({ code, color }) => startDemo(code, color),
  { debounce: 3000 },
);

// Battle state is the type of the returned object from runBattle
const activeBattle = ref<BattleState>();

async function startDemo(code: string, color: string, incrementSeed = true) {
  if (!code) return;
  const battleArgs: BattleArgs = {
    mapWidth: 64,
    mapHeight: 128,
    newFoodSpace: 25,
    newFoodMin: 20,
    newFoodDiff: 20,
    startAnts: 25,
    halfTimeTurn: 2000,
    halfTimePercent: 60,
    timeOutTurn: 4000,
    winPercent: 70,
    statusInterval: 10,
  };

  const teamWithCode = {
    id: 'TestAnt',
    name: 'Test Ant',
    code,
    color,
  };

  await activeBattle.value?.stop();
  const nextSeed = incrementSeed ? battleSeed.value++ : battleSeed.value;
  activeBattle.value = await singleBattle.runBattle(battleArgs, [teamWithCode], nextSeed);
}

function pauseDemo() {
  activeBattle.value?.pause();
}

function resumeDemo() {
  activeBattle.value?.resume();
}

function stepForward() {
  activeBattle.value?.step(1);
}

function restartSame() {
  startDemo(props.code, props.color, false);
}

function skipForward() {
  startDemo(props.code, props.color, true);
}

const autoMagnifier = ref(true);

function handleAntDebugRequested(x: number, y: number) {
  emits('ant-debug-requested', x, y);
}

onBeforeUnmount(() => {
  activeBattle.value?.stop();
});
</script>

<template>
  <div class="panel is-primary">
    <div class="panel-block">
      <div class="field has-addons is-fullwidth" style="width: 100%">
        <div class="control" v-if="activeBattle && !activeBattle.isPaused">
          <a class="button is-small is-success" @click="pauseDemo"
            ><font-awesome-icon :icon="faPause"
          /></a>
        </div>
        <div class="control" v-if="activeBattle?.isPaused">
          <a class="button is-small is-success" @click="resumeDemo"
            ><font-awesome-icon :icon="faPlay"
          /></a>
        </div>
        <div class="control" v-if="activeBattle?.isPaused">
          <a class="button is-small is-success" @click="stepForward"
            ><font-awesome-icon :icon="faStepForward"
          /></a>
        </div>
        <div class="control">
          <a class="button is-small is-success" @click="restartSame"
            ><font-awesome-icon :icon="faRotateLeft"
          /></a>
        </div>
        <div class="control">
          <a
            class="button is-small is-success last-button"
            @click="skipForward"
            style="border-top-right-radius: 3px; border-bottom-right-radius: 3px"
            ><font-awesome-icon :icon="faForwardFast"
          /></a>
        </div>
        <div class="floating-checkbox">
          <label for="" class="label">
            Magnifier
            <input type="checkbox" v-model="autoMagnifier" />
          </label>
        </div>
      </div>
    </div>
    <div class="panel-block is-justify-content-center">
      <battle-feed
        :zoom-level="2"
        :center-magnifier="autoMagnifier"
        :worker-name="'debug-worker'"
        @ant-debug-requested="handleAntDebugRequested"
      />
    </div>
    <div class="panel-block is-justify-content-center">
      <speed-gauge :worker-name="'debug-worker'" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.last-button {
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
}

.floating-checkbox {
  width: 100%;
  text-align: right;
}
</style>
