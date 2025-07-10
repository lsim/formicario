<script setup lang="ts">
import type { AntData } from '@/Battle.ts';
import { computed, ref } from 'vue';
import { useMagicKeys, whenever } from '@vueuse/core';

const props = defineProps<{
  ants?: AntData[];
}>();

const emit = defineEmits<{
  (event: 'debug'): void;
  (event: 'clear'): void;
}>();

const orderByProp = ref<keyof AntData>('team');

const { up, down } = useMagicKeys({
  passive: false,
  onEventFired: (e) => {
    e.preventDefault();
    e.stopPropagation();
  },
});

whenever(up, () => skipAnt(-1));
whenever(down, () => skipAnt(1));

const sortedAnts = computed(() => {
  if (!props.ants) return [];
  return [...props.ants].sort((a, b) => {
    if (a[orderByProp.value] < b[orderByProp.value]) return -1;
    if (a[orderByProp.value] > b[orderByProp.value]) return 1;
    return 0;
  });
});

const selectedAnt = ref<AntData | undefined>();

const brainProps = computed(() => {
  if (!selectedAnt.value) return [];
  const ant = selectedAnt.value;
  return Object.keys(ant.brain)
    .map((key) => ({
      key,
      value: ant?.brain[key],
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
});

function clear() {
  emit('clear');
  selectedAnt.value = undefined;
}

function skipAnt(skip: number) {
  console.log('Skipping ant', skip);
  const ants = sortedAnts.value;
  if (!ants.length) return;
  const index = ants.findIndex((a) => a.index === selectedAnt.value?.index);
  if (index === -1) return;
  selectedAnt.value = ants[(index + skip) % ants.length];
}
</script>

<template>
  <form class="ant-debugger">
    <div class="field is-grouped is-grouped-right">
      <div class="control">
        <button class="button is-primary" type="button" @click="emit('debug')">Debug</button>
      </div>
      <div class="control">
        <button class="button is-link" type="button" @click="clear">Clear</button>
      </div>
    </div>
    <div class="field" v-if="sortedAnts.length">
      <div class="table-container">
        <table class="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th @click="orderByProp = 'index'">Index</th>
              <th @click="orderByProp = 'team'">Team</th>
              <th @click="orderByProp = 'xPos'">X</th>
              <th @click="orderByProp = 'yPos'">Y</th>
              <th @click="orderByProp = 'age'">Age</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ant in sortedAnts"
              :key="ant.index"
              :class="{ 'is-selected': ant.index === selectedAnt?.index }"
              @click="selectedAnt = selectedAnt === ant ? undefined : ant"
            >
              <td>
                {{ ant.index }}
              </td>
              <td>{{ ant.team }}</td>
              <td>{{ ant.xPos }}</td>
              <td>{{ ant.yPos }}</td>
              <td>{{ ant.age }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="field" v-for="prop in brainProps" :key="prop.key">
      <label class="label">{{ prop.key }}</label>
      <div class="control">
        <input class="input" type="text" :value="prop.value" disabled />
      </div>
    </div>
  </form>
</template>

<style scoped lang="scss">
.table-container {
  overflow: auto;
  max-height: 300px;

  table {
    tr {
      cursor: pointer;
    }
  }
}
</style>
