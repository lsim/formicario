<script setup lang="ts">
import { ref, watch } from 'vue';

const lowerModel = defineModel<number>('lower', { required: true });
const upperModel = defineModel<number>('upper', { required: true });

const props = withDefaults(
  defineProps<{
    label?: string;
    step?: number;
    min?: number;
    max?: number;
  }>(),
  {
    label: '',
    step: 1,
    min: 1,
    max: 1000,
  },
);

const lowerString = ref(lowerModel.value.toString());
const upperString = ref(upperModel.value.toString());

// Prevent lower to be higher than upper
watch(
  () => lowerString.value,
  (newLowerString) => {
    const newLower = Number.parseInt(newLowerString, 10);
    if (newLower > upperModel.value) {
      lowerModel.value = upperModel.value;
      lowerString.value = lowerModel.value.toString();
    } else lowerModel.value = newLower;
  },
);
// Prevent upper to be lower than lower
watch(
  () => upperString.value,
  (newUpperString) => {
    const newUpper = Number.parseInt(newUpperString, 10);
    if (newUpper < lowerModel.value) {
      upperModel.value = lowerModel.value;
      upperString.value = upperModel.value.toString();
    } else upperModel.value = newUpper;
  },
);
</script>

<template>
  <div class="control">
    <label class="label">{{ props.label }}</label>
    <div class="field has-addons">
      <div class="control">
        <a class="button is-static">
          <input type="range" v-model="lowerString" :min="props.min" :max="props.max" />
          <span class="interval-summary">[ {{ lowerString }} ; {{ upperString }} ]</span>
          <input type="range" v-model="upperString" :min="props.min" :max="props.max" />
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.interval-summary {
  width: 7em;
}
input {
  pointer-events: all;
}
</style>
