<script setup lang="ts">
import { computed, ref } from 'vue';

const tips = [
  'Press <kbd>Shift</kbd> + <kbd>Space</kbd> to step forward a paused battle',
  'Press <kbd>Enter</kbd> to start a game on the battle page',
  'Hold <kbd>Ctrl</kbd> while hovering the battlefield to show the magnifier',
  'Press <kbd>Esc</kbd> to stop a game',
  'Right-click the magnifier to pin it in place',
  'When stepping a paused battle, the number of turns are determined by the speed gauge',
  'Run a game at full speed, then replay interesting results slowly to see what happened',
  "Click the rows in 'Recent battles' to see details and watch an instant replay",
  'Click here for more tips',
  'The team(s) you select for a game are given priority when battles are created. Empty slots are filled by randomly selected teams',
  'Start a game with no teams selected to pit random teams against each other',
  'Achieve optimum speed by disabling the live feed under UI settings. You can still watch battle replays after the game finishes',
];

const currentTip = ref(Math.round(Math.random() * tips.length));

function nextTipIndex() {
  return (currentTip.value + 1) % tips.length;
}

const tipRegex = /(?<nonKey>[^<]+)|(<kbd>(?<key>[^<]+)<\/kbd>)/g;

const currentTipTokens = computed(() => {
  // Split the tip so keyboard shortcuts can be rendered nicely without v-html type shenanigans
  const tokens = [];
  for (const match of tips[currentTip.value].matchAll(tipRegex)) {
    tokens.push({ key: match.groups?.key, nonKey: match.groups?.nonKey });
  }
  return tokens;
});
</script>

<template>
  <div class="card" @click="currentTip = nextTipIndex()">
    <div class="card-content">
      <div class="content">
        <p class="title is-4">Tip</p>
        <p>
          <template v-for="(token, idx) in currentTipTokens" :key="idx">
            <span v-if="token.nonKey">{{ token.nonKey }}</span>
            <kbd v-else>{{ token.key }}</kbd>
          </template>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.card-content {
  font-style: italic;
  user-select: none;
  &:hover {
    cursor: pointer;
  }

  kbd {
    background-color: #f1f1f1;
    border: 1px solid #ccc;
    border-radius: 3px;
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.2),
      0 0 0 2px #fff inset;
    color: #333;
    display: inline-block;
    font-family: Arial, Helvetica, sans-serif;
    margin: 0 0.1em;
    padding: 0.1em 0.6em;
  }
}
</style>
