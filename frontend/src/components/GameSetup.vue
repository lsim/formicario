<script setup lang="ts">
import TeamChooser from '@/components/TeamChooser.vue';
import { useTeamStore } from '@/stores/teams.ts';
import { useGameStore } from '@/stores/game.ts';
import { computed, ref, type Ref, watch } from 'vue';
import IntervalInput from '@/components/IntervalInput.vue';
import { faPlay } from '@fortawesome/free-solid-svg-icons';

const teamStore = useTeamStore();
const gameStore = useGameStore();

const activeTab: Ref<'teams' | 'intervals' | 'winning' | 'other' | 'ui'> = ref('teams');

const expanded = ref(true);

watch(
  () => gameStore.gameRunning,
  () => {
    // Collapse when a game has started or ended
    expanded.value = false;
  },
);

const readyToStart = computed(() => !gameStore.gameRunning);
</script>

<template>
  <div class="panel is-primary" :class="{ expanded }">
    <div class="panel-heading" @click="expanded = !expanded">
      <span class="collapse-icon" :class="{ expanded }"> ▶ </span>
      Next game
      <span class="is-pulled-right"
        ><button
          class="button is-success"
          :class="{ 'is-loading': gameStore.gameRunning }"
          :disabled="!readyToStart"
          @click.capture.prevent.stop="gameStore.start()"
        >
          <font-awesome-icon :icon="faPlay" /></button
      ></span>
    </div>
    <p class="panel-tabs" @click.capture="expanded = true">
      <a :class="{ 'is-active': activeTab === 'teams' }" @click="activeTab = 'teams'"
        >Teams ({{ teamStore.battleTeams.length }})</a
      >
      <a :class="{ 'is-active': activeTab === 'intervals' }" @click="activeTab = 'intervals'"
        >Map/Food</a
      >
      <a :class="{ 'is-active': activeTab === 'winning' }" @click="activeTab = 'winning'"
        >Winning</a
      >
      <a :class="{ 'is-active': activeTab === 'ui' }" @click="activeTab = 'ui'">UI</a>
      <a :class="{ 'is-active': activeTab === 'other' }" @click="activeTab = 'other'">Other</a>
    </p>
    <div class="panel-block" v-if="activeTab === 'teams'">
      <team-chooser class="team-chooser" />
    </div>

    <template v-if="activeTab === 'intervals'">
      <div class="panel-block">
        <interval-input
          label="Map width interval for battles"
          title="The width of the map in squares/pixels"
          v-model:lower="gameStore.gameSpec.mapWidth[0]"
          v-model:upper="gameStore.gameSpec.mapWidth[1]"
          :min="64"
          :max="1024"
          :step="64"
        />
      </div>
      <div class="panel-block">
        <interval-input
          label="Map height interval for battles"
          title="The height of the map in squares/pixels"
          v-model:lower="gameStore.gameSpec.mapHeight[0]"
          v-model:upper="gameStore.gameSpec.mapHeight[1]"
          :min="64"
          :max="1024"
          :step="64"
        />
      </div>
      <div class="panel-block">
        <interval-input
          label="New food space interval for battles"
          title="The average distance between food stashes"
          v-model:lower="gameStore.gameSpec.newFoodSpace[0]"
          v-model:upper="gameStore.gameSpec.newFoodSpace[1]"
          :min="1"
          :max="100"
          :step="1"
        />
      </div>
      <div class="panel-block">
        <interval-input
          label="New food min interval for battles"
          title="The minimum size of food stashes"
          v-model:lower="gameStore.gameSpec.newFoodMin[0]"
          v-model:upper="gameStore.gameSpec.newFoodMin[1]"
          :min="1"
          :max="100"
          :step="1"
        />
      </div>
      <div class="panel-block">
        <interval-input
          label="New food diff interval for battles"
          title="The variance of food stash sizes. Max stash size is min + diff"
          v-model:lower="gameStore.gameSpec.newFoodDiff[0]"
          v-model:upper="gameStore.gameSpec.newFoodDiff[1]"
          :min="0"
          :max="100"
          :step="1"
        />
      </div>
    </template>
    <template v-if="activeTab === 'winning'">
      <div class="panel-block">
        <div class="control">
          <div class="field has-addons">
            <div class="control">
              <a class="button is-static">Win with</a>
            </div>
            <div class="control">
              <input
                class="input"
                type="number"
                v-model="gameStore.gameSpec.winPercent"
                min="10"
                max="100"
              />
            </div>
            <div class="control">
              <a class="button is-static">% dominance at any point</a>
            </div>
          </div>
        </div>
      </div>
      <div class="panel-block">
        <div class="control">
          <div class="field has-addons">
            <div class="control">
              <a class="button is-static">or</a>
            </div>
            <div class="control">
              <input
                class="input"
                type="number"
                v-model="gameStore.gameSpec.halfTimePercent"
                min="10"
                max="100"
              />
            </div>
            <div class="control">
              <a class="button is-static">% dominance after</a>
            </div>
            <div class="control">
              <input
                class="input"
                type="number"
                v-model="gameStore.gameSpec.halfTimeTurn"
                min="100"
                max="100000"
                step="100"
              />
            </div>
            <div class="control">
              <a class="button is-static">turns</a>
            </div>
          </div>
        </div>
      </div>
      <div class="panel-block">
        <div class="control">
          <div class="field has-addons">
            <div class="control">
              <a class="button is-static">or majority after</a>
            </div>
            <div class="control">
              <input
                class="input"
                type="number"
                v-model="gameStore.gameSpec.timeOutTurn"
                min="100"
                max="100000"
                step="100"
              />
            </div>
            <div class="control">
              <a class="button is-static">turns</a>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-if="activeTab === 'ui'">
      <div class="panel-block">
        <div class="control">
          <label class="checkbox label"
            >Live feed
            <input type="checkbox" v-model="gameStore.liveFeed" />
          </label>
        </div>
      </div>
      <div class="panel-block">
        <div class="control">
          <label class="label"
            >Feed update interval
            <input
              class="input"
              type="number"
              :disabled="!gameStore.liveFeed"
              v-model="gameStore.gameSpec.statusInterval"
              min="1"
          /></label>
        </div>
      </div>
    </template>

    <template v-if="activeTab === 'other'">
      <div class="panel-block">
        <div class="control">
          <label class="label"
            >Number of battles<input
              class="input"
              type="number"
              v-model="gameStore.gameSpec.numBattles"
          /></label>
        </div>
      </div>
      <div class="panel-block">
        <div class="control">
          <label class="label"
            >Number of teams per battle<input
              class="input"
              type="number"
              v-model="gameStore.gameSpec.numBattleTeams"
          /></label>
        </div>
      </div>
      <div class="panel-block">
        <interval-input
          label="Number of starting ants"
          title="The number of starting ants for each team"
          v-model:lower="gameStore.gameSpec.startAnts[0]"
          v-model:upper="gameStore.gameSpec.startAnts[1]"
          :min="10"
          :max="100"
          :step="5"
        />
      </div>
      <div class="panel-block">
        <div class="control">
          <label class="label"
            >Seed<input class="input" type="number" v-model="gameStore.gameSpec.seed"
          /></label>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.panel-heading {
  cursor: pointer;
  pointer-events: all;
  .collapse-icon {
    transition: transform 0.5s ease-in-out;
    display: inline-block;
    &.expanded {
      transform: rotate(90deg);
    }
  }
}
div.panel {
  height: 8em;
  overflow: hidden;
  transition: all 0.5s ease-in-out;
  // Chrome only feature: Transitioning to auto size
  interpolate-size: allow-keywords;
  &.expanded {
    height: auto;
  }
}
</style>
