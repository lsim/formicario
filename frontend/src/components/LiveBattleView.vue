<script setup lang="ts">
import AntDebugger from '@/components/AntDebugger.vue';
import BattleFeed from '@/components/BattleFeed.vue';

import { useGameStore } from '@/stores/game.ts';
import BattleBars from '@/components/BattleBars.vue';
import BattleArgs from '@/components/BattleArgs.vue';
import BattleGraph from '@/components/BattleGraph.vue';

const gameStore = useGameStore();
</script>

<template>
  <div class="box">
    <battle-feed class="control battle-feed" v-if="gameStore.liveFeed" />
    <ant-debugger class="control ant-debugger" v-if="gameStore.gamePaused" :is-live="true" />
    <battle-bars class="team-stats" :is-live="true" />
    <battle-graph :is-live="true" class="battle-graph" />
    <battle-args class="battle-args" :is-live="true" />
  </div>
</template>

<style scoped lang="scss"></style>
