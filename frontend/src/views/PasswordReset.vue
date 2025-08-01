<script setup lang="ts">
import UserAuthenticator from '@/components/UserAuthenticator.vue';
import ModalWrapper from '@/components/ModalWrapper.vue';

const props = defineProps<{
  token: string;
}>();
</script>

<template>
  <div>
    <modal-wrapper :visible="true">
      <user-authenticator :token="props.token" />
    </modal-wrapper>
  </div>
</template>

<style scoped lang="scss"></style>
