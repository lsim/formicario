<script setup lang="ts">
import AntDebugger from '@/components/AntDebugger.vue';
import BattleFeed from '@/components/BattleFeed.vue';

import { useGameStore } from '@/stores/game.ts';
import BattleBars from '@/components/BattleBars.vue';
import BattleArgs from '@/components/BattleArgs.vue';
import BattleGraph from '@/components/BattleGraph.vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import BattleRender from '@/components/BattleRender.vue';
import TeamDisqualifications from '@/components/TeamDisqualifications.vue';
import { throttleTime } from 'rxjs';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import useSingleBattle, { GameProxy } from '@/composables/single-battle.ts';
import GameControls from '@/components/GameControls.vue';
import { useStorage } from '@vueuse/core';

const gameStore = useGameStore();
const worker = useWorker('game-worker');
const singleBattle = useSingleBattle('game-worker');

const isLive = computed(() => {
  return gameStore.gameRunning || !!battleReplay.value;
});

const summaryStats = computed(() => gameStore.selectedBattleSummaryStats);

const currentTurn = ref(0);
const currentHalfTime = ref(0);
const currentFullTime = ref(0);
const currentTps = ref(0);

const subscription = worker.battleStatuses$.pipe(throttleTime(100)).subscribe((status) => {
  currentTurn.value = status.turns;
  currentTps.value = status.turnsPerSecond >> 0;
  currentHalfTime.value = status.args.halfTimeTurn;
  currentFullTime.value = status.args.timeOutTurn;
});

const battleReplay = ref<GameProxy | undefined>();

async function runBattle(startPaused = false) {
  const battle = summaryStats.value?.summary;
  if (!battle) return;
  battleReplay.value?.stop();
  battleReplay.value = await singleBattle.replayFromSummary(battle, startPaused);
  battleReplay.value.endPromise.finally(() => {
    battleReplay.value = undefined;
  });
}

watch(
  () => gameStore.selectedBattleSummaryStats,
  () => {
    battleReplay.value?.stop();
  },
);

const activeTab = useStorage<'graph' | 'bars' | 'params' | 'debugger' | 'disqualifications'>(
  'activeTab',
  'graph',
);

const activeTabComputed = computed(() =>
  !gameStore.gameRunning && activeTab.value === 'debugger' ? 'graph' : activeTab.value,
);

onBeforeUnmount(() => {
  gameStore.stop();
  subscription?.unsubscribe();
});

function handleAntDebugRequested(x: number, y: number) {
  worker.getDebugAnts(x, y);
}

function handleStart() {
  if (battleReplay.value) return;
  runBattle();
}

function handleStep() {
  if (battleReplay.value) {
    battleReplay.value.step();
  } else {
    runBattle(true);
  }
}

const progress = computed(() => (currentTurn.value / (currentFullTime.value || 1)) * 100);
const pastHalfTime = computed(() => currentTurn.value > currentHalfTime.value);
</script>

<template>
  <nav class="panel is-primary">
    <div
      class="panel-heading is-flex is-flex-direction-row is-align-items-center is-justify-content-space-between"
    >
      Battle
      <span class="tps">{{ currentTps }} tps</span>
      <span class="navbar battle-controls">
        <game-controls
          :battle-state="battleReplay"
          :size="'small'"
          @start="handleStart"
          @step="handleStep"
        />
      </span>
      <progress
        class="progress is-small"
        :class="{ 'is-info': !pastHalfTime, 'is-warning': pastHalfTime }"
        :value="progress"
        max="100"
        :title="`Turn ${currentTurn}/${currentFullTime}`"
      ></progress>
    </div>
    <battle-feed
      class="panel-block battle-feed"
      v-if="isLive && gameStore.liveFeed"
      :worker-name="'game-worker'"
      @ant-debug-requested="handleAntDebugRequested"
    />
    <battle-render
      class="panel-block battle-render"
      :summary="summaryStats?.summary"
      :zoom-level="2"
      v-if="!isLive && summaryStats"
    />
    <p class="panel-tabs">
      <a :class="{ 'is-active': activeTabComputed === 'graph' }" @click="activeTab = 'graph'"
        >Graph</a
      >
      <a :class="{ 'is-active': activeTabComputed === 'bars' }" @click="activeTab = 'bars'">Bars</a>
      <a :class="{ 'is-active': activeTabComputed === 'params' }" @click="activeTab = 'params'"
        >Parameters</a
      >
      <a
        :class="{ 'is-active': activeTabComputed === 'debugger' }"
        @click="activeTab = 'debugger'"
        v-if="gameStore.gameRunning"
        >Debugger</a
      >
      <a
        :class="{ 'is-active': activeTabComputed === 'disqualifications' }"
        @click="activeTab = 'disqualifications'"
        v-if="!gameStore.gameRunning"
        >Disqualifications ({{
          summaryStats?.summary.teams.filter((t) => !!t.disqualification).length || 0
        }})</a
      >
    </p>
    <template v-if="activeTabComputed === 'graph'">
      <battle-graph
        class="panel-block battle-graph"
        :is-live="isLive"
        :stat-prop="gameStore.selectedStatusProperty"
        :battle-stats="summaryStats?.stats"
      />
    </template>
    <template v-else-if="activeTabComputed === 'bars'">
      <battle-bars
        class="panel-block"
        :is-live="isLive"
        :battle-summary="summaryStats?.summary"
        :battle-stats="summaryStats?.stats"
      />
    </template>
    <template v-else-if="activeTabComputed === 'params'">
      <div class="panel-block battle-args">
        <battle-args
          :is-live="isLive"
          :args="summaryStats?.summary.args"
          :seed="summaryStats?.summary.seed"
        />
      </div>
    </template>
    <template v-else-if="gameStore.gameRunning && activeTabComputed === 'debugger'">
      <ant-debugger class="panel-block ant-debugger" :is-live="isLive" />
    </template>
    <template v-else-if="activeTabComputed === 'disqualifications' && !isLive">
      <team-disqualifications
        class="panel-block disqualifications"
        :is-live="isLive"
        :team-statuses="summaryStats?.summary.teams"
      />
    </template>
  </nav>
</template>

<style scoped lang="scss">
.panel-heading {
  position: relative;
  .tps {
    font-size: 70%;
    position: absolute;
    right: 5px;
    top: 3px;
    opacity: 0.3;
  }
  .progress {
    position: absolute;
    bottom: 3px;
    left: 5px;
    width: calc(100% - 10px);
  }
}
.battle-args {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.battle-controls {
  background-color: transparent;
}
</style>
