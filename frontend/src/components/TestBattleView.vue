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
import { useStorage, watchDebounced } from '@vueuse/core';
import type { BattleStatus } from '@/GameSummary.ts';
import type { Observable } from 'rxjs';
import useSingleBattle, { BattleState } from '@/composables/single-battle.ts';
import { useTeamStore } from '@/stores/teams.ts';
import DemoBars from '@/components/DemoBars.vue';

const teamStore = useTeamStore();

const props = defineProps<{
  code: string;
  color: string;
  id?: string;
  battleStatuses$: Observable<BattleStatus>;
}>();

const emits = defineEmits<{
  (e: 'ant-debug-requested', x: number, y: number): void;
}>();

const singleBattle = useSingleBattle('debug-worker');

const testBattlesCompleted = ref(0);
const battleSeed = ref(1);

watchDebounced(
  () => ({
    code: props.code,
    color: props.color,
    testBattlesCompleted: testBattlesCompleted.value,
  }),
  ({ code, color }) => {
    if (activeBattle.value?.isPaused) return;
    startDemo(code, color);
  },
  { debounce: 3000 },
);

// Battle state is the type of the returned object from runBattle
const activeBattle = ref<BattleState>();
async function startDemo(code: string, color: string, incrementSeed = true) {
  if (!code) return;
  const battleArgs: BattleArgs = {
    mapWidth: 128,
    mapHeight: 128,
    newFoodSpace: 25,
    newFoodMin: 20,
    newFoodDiff: 20,
    startAnts: 25,
    halfTimeTurn: 10000,
    halfTimePercent: 65,
    timeOutTurn: 20000,
    winPercent: 75,
    statusInterval: 10,
  };

  const teamWithCode = {
    id: 'TestAnt',
    name: 'Test Ant',
    code,
    color,
  };

  // TODO: Let the Game constructor handle this - make a single battle game in stead.
  //  That way the seed will also determine the opponent
  const randomTeam = teamStore.localTeams[Math.floor(Math.random() * teamStore.localTeams.length)];

  await activeBattle.value?.stop();
  const nextSeed = incrementSeed ? battleSeed.value++ : battleSeed.value;
  activeBattle.value = await singleBattle.runBattle(
    battleArgs,
    includeOpponent.value
      ? [teamWithCode, { ...randomTeam, code: randomTeam.code! }]
      : [teamWithCode],
    nextSeed,
    -1,
    true,
  );
  activeBattle.value.endPromise.then((reason) => {
    if (reason === 'user-abort' || reason === 'error' || reason === 'disqualification') return;
    testBattlesCompleted.value++;
  });
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

const autoMagnifier = useStorage('autoMagnifier', true, localStorage);
const includeOpponent = useStorage('includeOpponent', true, localStorage);

function handleAntDebugRequested(x: number, y: number) {
  emits('ant-debug-requested', x, y);
}

onBeforeUnmount(() => {
  activeBattle.value?.stop();
});
</script>

<template>
  <div class="panel is-primary test-battle-view">
    <div class="panel-block is-display-flex is-justify-content-center">
      <div class="field has-addons">
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
    <div class="panel-block is-fullwidth">
      <demo-bars :battle-status$="activeBattle?.battleStatus$" />
    </div>
    <div class="demo-toggles">
      <div class="panel-block is-fullwidth">
        <div class="control">
          <label class="checkbox">
            <input type="checkbox" v-model="includeOpponent" />
            Include Opponent
          </label>
        </div>
      </div>
      <div class="panel-block is-fullwidth">
        <div class="control">
          <div class="control">
            <label class="checkbox">
              <input type="checkbox" v-model="autoMagnifier" />
              Auto magnifier
            </label>
          </div>
        </div>
      </div>
      <div class="panel-block is-justify-content-center">
        <speed-gauge :worker-name="'debug-worker'" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.test-battle-view {
  // Chrome only feature: Transitioning to auto size
  interpolate-size: allow-keywords;

  &:hover {
    .demo-toggles {
      height: auto;
    }
  }

  // Demo toggles collapse when the mouse is not over the panel
  .demo-toggles {
    height: 0;
    overflow: hidden;
    transition: height 0.5s;
  }
}
</style>
