<script setup lang="ts">
import AntDebugger from '@/components/AntDebugger.vue';
import BattleFeed from '@/components/BattleFeed.vue';

import { useGameStore } from '@/stores/game.ts';
import BattleBars from '@/components/BattleBars.vue';
import BattleArgs from '@/components/BattleArgs.vue';
import BattleGraph from '@/components/BattleGraph.vue';
import { computed, onBeforeUnmount, ref } from 'vue';
import BattleRender from '@/components/BattleRender.vue';
import { useTeamStore } from '@/stores/teams.ts';
import useApiClient from '@/composables/api-client.ts';
import type { TeamWithCode } from '@/Team.ts';
import TeamDisqualifications from '@/components/TeamDisqualifications.vue';
import { throttleTime } from 'rxjs';
import { useWorker } from '@/workers/WorkerDispatcher.ts';
import useSingleBattle, { BattleState } from '@/composables/single-battle.ts';
import GameControls from '@/components/GameControls.vue';

const gameStore = useGameStore();
const teamStore = useTeamStore();
const worker = useWorker('game-worker');
const singleBattle = useSingleBattle('game-worker');

const apiClient = useApiClient();

const isLive = computed(() => {
  return gameStore.gameRunning || !!battleReplay.value;
});

const summaryStats = computed(() => gameStore.selectedBattleSummaryStats);

const currentTurn = ref(0);
const currentTps = ref(0);

const subscription = worker.battleStatuses$.pipe(throttleTime(100)).subscribe((status) => {
  currentTurn.value = status.turns;
  currentTps.value = status.turnsPerSecond >> 0;
});

const battleReplay = ref<BattleState | undefined>();

async function runBattle(startPaused = false) {
  const battle = summaryStats.value?.summary;
  if (!battle) return;
  battleReplay.value?.stop();
  battleReplay.value = undefined;
  const teamIds = battle.teams.map((t) => t.id);
  const teams = (await Promise.all(
    teamIds
      .map(async (n) => {
        const localTeam = teamStore.localTeams.find((t) => t.id === n);
        if (localTeam) return localTeam;
        const remoteTeam = teamStore.remoteTeams.find((t) => t.id === n);
        if (remoteTeam) return await apiClient.getFullPublication(remoteTeam.id);
        console.warn('Team not found for battle', n);
        return null;
      })
      .filter((t) => !!t),
  )) as TeamWithCode[];
  battleReplay.value = await singleBattle.runBattle(
    battle.args,
    teams,
    battle.seed,
    startPaused ? 1 : -1,
  );

  battleReplay.value.endPromise.then(() => {
    battleReplay.value = undefined;
  });
}

const activeTab = ref<'graph' | 'bars' | 'params' | 'debugger' | 'disqualifications'>('graph');

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
</script>

<template>
  <nav class="panel is-primary">
    <div
      class="panel-heading is-flex is-flex-direction-row is-align-items-center is-justify-content-space-between"
    >
      Battle - turn {{ currentTurn }} - {{ currentTps }} tps live: {{ isLive }}
      <span class="navbar battle-controls">
        <game-controls
          :battle-state="battleReplay"
          :size="'small'"
          @start="handleStart"
          @step="handleStep"
        />
      </span>
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
.battle-args {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.battle-controls {
  background-color: transparent;
}
</style>
