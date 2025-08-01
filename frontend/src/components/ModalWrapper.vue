<script setup lang="ts">
const props = defineProps<{
  visible?: boolean;
}>();

const emit = defineEmits<{
  (e: 'dismissed'): void;
}>();
</script>

<template>
  <div class="modal" :class="{ 'is-active': props.visible }">
    <Transition name="modal-background-fade">
      <div class="modal-background" @click="emit('dismissed')" v-if="props.visible"></div>
    </Transition>
    <Transition name="modal-fade">
      <div class="modal-content" v-if="props.visible">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.modal {
  .modal-fade-enter-active {
    //animation: easeInBounce 0.6s reverse ease-in-out;
    animation: easeInElastic 0.9s reverse ease-in-out;
  }
  .modal-fade-leave-active {
    transition:
      opacity 0.6s ease-in-out,
      transform 0.6s ease-in-out;
  }

  .modal-fade-enter-from,
  .modal-fade-leave-to {
    opacity: 0;
    transform: translateY(-60vh);
  }

  // Background just fades9
  .modal-background-fade-enter-active,
  .modal-background-fade-leave-active {
    transition: opacity 0.4s ease;
  }

  .modal-background-fade-enter-from,
  .modal-background-fade-leave-to {
    opacity: 0;
  }

  @keyframes easeInBounce {
    0% {
      transform: translateY(0vh);
    }

    4% {
      transform: translateY(-1.54vh);
    }

    8% {
      transform: translateY(-0.66vh);
    }

    18% {
      transform: translateY(-6.25vh);
    }

    26% {
      transform: translateY(-1.63vh);
    }

    46% {
      transform: translateY(-24.98vh);
    }

    64% {
      transform: translateY(-1.99vh);
    }

    76% {
      transform: translateY(-56.44vh);
    }

    88% {
      transform: translateY(-89.11vh);
    }

    100% {
      transform: translateY(-100vh);
    }
  }

  @keyframes easeInElastic {
    0% {
      transform: translateY(0vh);
    }

    4% {
      transform: translateY(-0.04vh);
    }

    8% {
      transform: translateY(-0.16vh);
    }

    14% {
      transform: translateY(-0.17vh);
    }

    18% {
      transform: translateY(0.04vh);
    }

    26% {
      transform: translateY(0.58vh);
    }

    28% {
      transform: translateY(0.55vh);
    }

    40% {
      transform: translateY(-1.56vh);
    }

    42% {
      transform: translateY(-1.64vh);
    }

    56% {
      transform: translateY(4.63vh);
    }

    58% {
      transform: translateY(4.4vh);
    }

    72% {
      transform: translateY(-13.12vh);
    }

    86% {
      transform: translateY(37.06vh);
    }

    100% {
      transform: translateY(-100vh);
    }
  }

  @keyframes easeOutElastic {
    0% {
      transform: translateY(0vh);
    }

    16% {
      transform: translateY(-132.27vh);
    }

    28% {
      transform: translateY(-86.88vh);
    }

    44% {
      transform: translateY(-104.63vh);
    }

    59% {
      transform: translateY(-98.36vh);
    }

    73% {
      transform: translateY(-100.58vh);
    }

    88% {
      transform: translateY(-99.8vh);
    }

    100% {
      transform: translateY(-100vh);
    }
  }
}
</style>
