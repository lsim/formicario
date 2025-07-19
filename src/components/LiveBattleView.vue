<script setup lang="ts">
import AntDebugger from '@/components/AntDebugger.vue';
import BattleFeed from '@/components/BattleFeed.vue';

import { useGameStore } from '@/stores/game.ts';
import TeamBattleStats from '@/components/TeamBattleStats.vue';
import BattleArgs from '@/components/BattleArgs.vue';

const gameStore = useGameStore();
</script>

<template>
  <div class="box" v-if="gameStore.gameRunning">
    <battle-feed class="control battle-feed" v-if="gameStore.liveFeed" />
    <ant-debugger
      class="control ant-debugger"
      v-if="gameStore.gameRunning && gameStore.gamePaused"
    />
    <team-battle-stats class="team-stats" v-if="gameStore.gameRunning && gameStore.liveFeed" />
    <battle-args class="battle-args" v-if="gameStore.gameRunning" />
  </div>
</template>

<style scoped lang="scss"></style>
