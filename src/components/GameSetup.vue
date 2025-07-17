<script setup lang="ts">
import TeamChooser from '@/components/TeamChooser.vue';
import { useTeamStore } from '@/stores/teams.ts';
import { useGameStore } from '@/stores/game.ts';

const teamStore = useTeamStore();
const gameStore = useGameStore();
</script>

<template>
  <form>
    <team-chooser @update:teams="teamStore.battleTeams = $event" />
    <div class="field">
      <div class="control">
        <label class="checkbox label"
          >Live feed
          <input type="checkbox" v-model="gameStore.liveFeed" />
        </label>
      </div>
    </div>
    <div class="field">
      <div class="control">
        <label class="label"
          >Feed update interval
          <input
            class="input"
            type="number"
            :disabled="!gameStore.liveFeed"
            v-model="gameStore.gameSpec.statusInterval"
        /></label>
      </div>
    </div>
    <div class="field">
      <div class="control">
        <label class="label"
          >Number of battles
          <input class="input" type="number" v-model="gameStore.gameSpec.numBattles"
        /></label>
      </div>
    </div>
    <div class="field">
      <div class="control">
        <label class="label"
          >Seed <input class="input" type="number" v-model="gameStore.gameSpec.seed"
        /></label>
      </div>
    </div>
  </form>
</template>

<style scoped lang="scss">
.step-size {
  width: 5em;
}
</style>
