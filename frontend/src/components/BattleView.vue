<script setup lang="ts">
import AntDebugger from '@/components/AntDebugger.vue';
import BattleFeed from '@/components/BattleFeed.vue';

import { useGameStore } from '@/stores/game.ts';
import BattleBars from '@/components/BattleBars.vue';
import BattleArgs from '@/components/BattleArgs.vue';
import BattleGraph from '@/components/BattleGraph.vue';
import { computed, ref } from 'vue';
import BattleRender from '@/components/BattleRender.vue';

const gameStore = useGameStore();

const isLive = computed(() => {
  return gameStore.gameRunning;
});

const summaryStats = computed(() => gameStore.selectedBattleSummaryStats);

const activeTab = ref<'graph' | 'bars' | 'params' | 'debugger'>('graph');

const activeTabComputed = computed(() =>
  !gameStore.gameRunning && activeTab.value === 'debugger' ? 'graph' : activeTab.value,
);
</script>

<template>
  <nav class="panel is-primary">
    <div class="panel-heading">Battle</div>
    <battle-feed class="panel-block battle-feed" v-if="gameStore.liveFeed" />
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
  </nav>
</template>

<style scoped lang="scss">
.battle-args {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
