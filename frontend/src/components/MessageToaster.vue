<script setup lang="ts">
import useToast from '@/composables/toast.ts';
import ConfettiExplosion from 'vue-confetti-explosion';

const toast = useToast();
</script>

<template>
  <div class="toast-container">
    <transition-group>
      <div
        class="toast message"
        :class="t.type === 'celebrate' ? 'is-success' : t.type"
        v-for="t in toast.activeToasts.value"
        :key="t.id"
      >
        <div v-if="t.title" class="message-header">
          <p>{{ t.title || '!!!' }}</p>
        </div>
        <confetti-explosion
          v-if="t.type === 'celebrate'"
          style="display: contents; position: absolute; right: 0"
          :duration="t.duration - 500"
          :stage-height="1500"
        />
        <div class="message-body">
          {{ t.message }}
        </div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped lang="scss">
@use 'sass:color';

@mixin colorize($color: string) {
  filter: drop-shadow(0 0 5px rgba(color.scale($color, $lightness: 50%), 0.8));
  background-color: $color;
}
.toast-container {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: end;
  background-color: transparent;
  pointer-events: none;

  .toast {
    width: 20em;
    //padding: 1em;
    //margin: 0.5em;
    //border-radius: 5px;
    //pointer-events: auto;
    //border: 2px solid rgba(white, 0.3);
    &.celebrate {
      @include colorize(purple);
      animation: colorFade 2s ease-in-out;
      @keyframes colorFade {
        0% {
          @include colorize(purple);
        }
        50% {
          @include colorize(pink);
        }
        100% {
          @include colorize(purple);
        }
      }
    }
    //&.success {
    //  @include colorize(green);
    //}
    //&.info {
    //  @include colorize(blue);
    //}
    //&.warning {
    //  @include colorize(orange);
    //}
    //&.error {
    //  @include colorize(red);
    //}
    color: white;

    &:hover {
      opacity: 0.8;
    }
  }

  .v-enter-active,
  .v-leave-active {
    transition:
      transform 0.5s ease,
      opacity 1s ease;
  }
  .v-enter-from,
  .v-leave-to {
    transform: translateX(-120%);
    opacity: 0;
  }
}
</style>
