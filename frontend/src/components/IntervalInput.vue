<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

const lower = defineModel<number>('lower', { required: true });
const upper = defineModel<number>('upper', { required: true });

const a = ref(lower.value);
const b = ref(upper.value);

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
    max: 100,
  },
);

// Ensure that lower is always less or equal to upper
watch(
  () => [a.value, b.value],
  (newValues) => {
    const sorted = newValues.sort((a, b) => a - b);
    lower.value = sorted[0];
    upper.value = sorted[1];
  },
);
</script>

<template>
  <div class="control">
    <label class="label">{{ props.label }}</label>
    <a class="button is-static">
      <div
        class="wrap wrap--2x"
        :style="{
          '--min': props.min,
          '--max': props.max,
          '--a': a,
          '--b': b,
          '--p': '',
        }"
      >
        <input
          id="a"
          type="range"
          :min="props.min"
          :max="props.max"
          v-model.number="a"
          :step="props.step"
        />
        <output for="a" :style="{ '--c': a }"></output>
        <input
          id="b"
          type="range"
          :min="props.min"
          :max="props.max"
          v-model.number="b"
          :step="props.step"
        />
        <output for="b" :style="{ '--c': b }"></output>
      </div>
    </a>
  </div>
</template>

<style scoped lang="scss">
$track-w: 25em;
$track-h: 0.5em;
$track-r: 0.5 * $track-h;
$track-bg: linear-gradient(#5b5b5b, #828282 70%, #888);
$progr-bg:
  linear-gradient(#096daa, rgba(#096daa, 0.01) 0.25em),
  repeating-linear-gradient(135deg, transparent, transparent 4px, #027bc1 5px, #027bc1 7px),
  linear-gradient(#2f9cdb, #2f9cdb);
$thumb-d: 1em;
$thumb-r: 0.5 * $thumb-d;

$arrow-a: 35deg;

@mixin track($f: 1) {
  border: none;
  width: 100%;
  height: $track-h;
  border-radius: $track-r;
  background: transparent;
  color: transparent;
}

@mixin progr() {
  border: none;
  width: 100%;
  height: $track-h;
  border-radius: $track-r 0 0 $track-r;
  background: $progr-bg;
}

@mixin thumb($m: 0) {
  box-sizing: border-box;
  margin-top: $m;
  border: solid 1px #9f9ea3;
  width: $thumb-d;
  height: $thumb-d;
  border-radius: 50%;
  //box-shadow: 0 0.375em 0.25em #777;
  background: #e3e3e3;
  pointer-events: auto;
  cursor: ew-resize;
}

/* level browser inconsistencies */
* {
  margin: 0;
  padding: 0;
  font: inherit;
}

.wrap {
  --min: 0; /* default minimum */
  --max: 100; /* default maximum */
  --p: ; /* prefix */
  --s: ; /* suffix */
  --track-w: #{$track-w};
  --uu: calc(var(--track-w) - #{$thumb-d}) / (var(--max) - var(--min));
  display: grid;
  align-content: center;
  position: relative;
  margin: 2.5rem auto 0.3rem auto;
  width: var(--track-w);
  max-width: 100%;
  height: $track-h;
  border-radius: $track-r;
  //box-shadow: 0 1px #f3f6f8;
  background: $track-bg;
  filter: grayScale(0.65);
  cursor: pointer;

  &::before,
  &::after {
    --i: 0;
    --noti: calc(1 - var(--i));
    --sgni: calc(1 - 2 * var(--i));
    position: absolute;
    z-index: 0;
    top: 0;
    bottom: 0;
    left: calc(
      #{$thumb-r} + (var(--noti) * (var(--a) - var(--min)) + var(--i) * (var(--b) - var(--min))) *
        var(--uu)
    );
    width: calc(var(--sgni) * (var(--b) - var(--a)) * var(--uu));
    background: $progr-bg;
    content: '';
  }

  &::after {
    --i: 1;
  }

  &:focus-within {
    filter: none;
  }

  @media (max-width: 480px) {
    --track-w: 100vw;
  }
}

input,
output {
  --hl: 0;
  --nothl: calc(1 - var(--hl));
}

input[type='range'] {
  grid-area: 1/ 1;
  position: relative; /* ugh, Edge */
  z-index: calc(1 + var(--hl));
  width: var(--track-w);
  min-height: 2 * $thumb-d;
  background: none;

  &,
  &::-webkit-slider-thumb,
  &::-webkit-slider-runnable-track {
    -webkit-appearance: none;
  }

  &::-webkit-slider-runnable-track {
    @include track();
  }
  &::-moz-range-track {
    @include track();
  }
  &::-ms-track {
    @include track();
  }

  &::-webkit-slider-thumb {
    @include thumb(calc(0.5 * (#{$track-h} - #{$thumb-d})));
  }
  &::-moz-range-thumb {
    @include thumb();
  }
  &::-ms-thumb {
    @include thumb();
  }

  &:only-of-type {
    --pos: calc(#{$thumb-r} + (var(--c) - var(--min)) * var(--uu));

    .js &::-webkit-slider-runnable-track {
      @include progr();
      background-repeat: no-repeat;
      background-size: var(--pos) 100%;
    }

    &::-moz-range-progress {
      @include progr();
    }
    &::-ms-fill-lower {
      @include progr();
    }
  }

  &:not(:only-of-type) {
    pointer-events: none;

    &::-ms-fill-lower {
      display: none;
    }
  }

  &:focus {
    outline: solid 0 transparent;

    &,
    & + [for] {
      --hl: 1;
    }
  }
}

output[for] {
  --ar: 0;
  --pos: calc((var(--c) - var(--min)) * var(--uu));
  position: absolute;
  z-index: var(--hl);
  bottom: 100%;
  left: $thumb-r;
  transform: translate(calc(var(--pos) - 50%));
  //filter: drop-shadow(0 2px 3px #afb0b4);
  counter-reset: c var(--c);

  &::after {
    display: block;
    margin-bottom: 0.375em;
    border: solid calc(var(--ar) * 0.75em) transparent;
    padding: 0 0.5em;
    border-radius: calc(0.25em + var(--ar) * 0.75em);
    background: linear-gradient(#3c3c3c, #101010) border-box;
    color: #027bc1;
    filter: grayScale(var(--nothl));
    --mask:
      linear-gradient(red, red) padding-box,
      conic-gradient(from #{-$arrow-a} at 50% 100%, red #{2 * $arrow-a}, transparent 0%) 50% 100%/
        100% calc(var(--ar) * 0.75em) no-repeat border-box;
    -webkit-mask: var(--mask);
    mask: var(--mask);
    content: var(--p) counter(c) var(--s);
  }

  @supports (background: conic-gradient(from 1deg at 0%, red 9%, tan 0%)) {
    --ar: 1;
  }
}
</style>
