<script setup lang="ts">
import ModalWrapper from '@/components/ModalWrapper.vue';
import UserAuthenticator from '@/components/UserAuthenticator.vue';
import useApiClient from '@/composables/api-client.ts';

const apiClient = useApiClient();
</script>

<template>
  <modal-wrapper :visible="!!apiClient.loginResolver.value" @dismissed="() => apiClient.logout()">
    <user-authenticator />
  </modal-wrapper>
</template>

<style scoped lang="scss"></style>
