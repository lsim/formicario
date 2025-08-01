<script setup lang="ts">
import { ref, useTemplateRef, computed, watch } from 'vue';
import useApiClient from '@/composables/api-client.ts';

import useToast from '@/composables/toast.ts';
import { faEnvelope, faPassport, faUser } from '@fortawesome/free-solid-svg-icons';

const toast = useToast();

const props = defineProps<{
  token?: string;
}>();

const username = ref('');
const password = ref('');
const passwordConfirm = ref('');
const email = ref('');

const isPasswordReset = computed(() => !!props.token);

const state = ref<'register' | 'login' | 'recover' | 'password-reset'>('login');

watch(
  isPasswordReset,
  (newVal) => {
    if (newVal) {
      state.value = 'password-reset';
    }
  },
  { immediate: true },
);

const mailInput = useTemplateRef('mail-input');

declare type Fields = 'username' | 'password' | 'passwordConfirm' | 'email';

const fieldShown = computed(() => {
  return {
    username: ['register', 'login'].includes(state.value),
    password: ['register', 'login', 'password-reset'].includes(state.value),
    passwordConfirm: ['register', 'password-reset'].includes(state.value),
    email: ['register', 'recover'].includes(state.value),
  } as Record<Fields, boolean>;
});

const headerText = computed(() => {
  switch (state.value) {
    case 'register':
      return 'Register';
    case 'recover':
      return 'Forgot my password';
    case 'password-reset':
      return 'Choose new password';
    default:
      return 'Login';
  }
});

const visibleNavButtons = computed(() => {
  return {
    register: state.value === 'login' || state.value === 'recover',
    login: state.value === 'register' || state.value === 'recover',
    recover: state.value === 'login' || state.value === 'register',
  };
});

const mailValid = ref(true);
watch(
  () => email.value,
  () => {
    mailValid.value = !email.value || (mailInput.value?.checkValidity() ?? false);
  },
);

const apiClient = useApiClient();

async function resetPassword() {
  if (!props.token) return;
  try {
    const result = await apiClient.resetPassword(password.value, props.token);
    if (result) {
      toast.show('Password updated successfully. This tab will now close.', 'is-success', 10000);
      setTimeout(() => window.close(), 3000);
      return;
    }
  } catch (e) {
    console.error('Failed to update password', e);
  }
  toast.show(
    'Failed to update password. Please try again. This tab will now close.',
    'is-danger',
    10000,
  );
  setTimeout(() => window.close(), 3000);
}

async function sendRecoveryEmail() {
  try {
    await apiClient.sendRecoveryEmail(email.value);
    state.value = 'login';
    toast.show('Recovery email sent. Please check your inbox.', 'is-info', 10000);
  } catch (e) {
    console.error('Failed to send recovery email', e);
    toast.show('Failed to send recovery email. Please try again.', 'is-danger', 10000);
  }
}
</script>

<template>
  <form class="panel is-primary">
    <div class="panel-heading">
      <h2 class="panel-title">{{ headerText }}</h2>
    </div>
    <p class="panel-tabs">
      <a
        :class="{ 'is-active': state === 'register' }"
        @click.prevent="state = 'register'"
        v-show="visibleNavButtons.register"
        >Register</a
      >
      <a
        :class="{ 'is-active': state === 'login' }"
        @click.prevent="state = 'login'"
        v-show="visibleNavButtons.login"
        >Login</a
      >
      <a
        :class="{ 'is-active': state === 'recover' }"
        @click.prevent="state = 'recover'"
        v-show="visibleNavButtons.recover"
        >Recover</a
      >
    </p>
    <div class="panel-block" v-show="fieldShown.username">
      <div class="control has-icons-left">
        <input
          id="username"
          class="input"
          v-model="username"
          type="text"
          placeholder="Username"
          autocomplete="username"
        />
        <span class="icon is-small is-left">
          <font-awesome-icon :icon="faUser" />
        </span>
      </div>
    </div>
    <div class="panel-block" v-show="fieldShown.password">
      <div class="control has-icons-left">
        <input
          id="password"
          class="input"
          v-model="password"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
        />
        <span class="icon is-small is-left">
          <font-awesome-icon :icon="faPassport" />
        </span>
      </div>
    </div>
    <div class="panel-block" v-show="fieldShown.passwordConfirm">
      <div class="control has-icons-left">
        <input
          id="passwordConfirm"
          class="input"
          v-model="passwordConfirm"
          type="password"
          placeholder="Confirm password"
          autocomplete="current-password"
        />
        <span class="icon is-small is-left">
          <font-awesome-icon :icon="faPassport" />
        </span>
      </div>
    </div>
    <div class="panel-block" v-show="fieldShown.email">
      <div class="control has-icons-left">
        <input
          id="email"
          class="input"
          :class="{ 'is-danger': !mailValid }"
          v-model="email"
          type="email"
          placeholder="Email"
          autocomplete="email"
          ref="mail-input"
          title="For account recovery only"
        />
        <span class="icon is-small is-left">
          <font-awesome-icon :icon="faEnvelope" />
        </span>
        <p class="help is-danger" v-show="!mailValid">Please enter a valid email address</p>
      </div>
    </div>
    <div class="panel-block">
      <button
        v-if="state === 'register'"
        type="submit"
        @click.prevent.stop="() => apiClient.register(username, password, email)"
        @submit.prevent.stop="() => apiClient.register(username, password, email)"
        class="button is-primary"
      >
        Register
      </button>
      <button
        v-if="state === 'login'"
        type="submit"
        @click.prevent.stop="() => apiClient.login(username, password)"
        @submit.prevent.stop="() => apiClient.login(username, password)"
        class="button is-primary"
      >
        Login
      </button>
      <button
        v-if="state === 'recover'"
        type="submit"
        @click.prevent.stop="sendRecoveryEmail"
        class="button is-primary"
      >
        Send recovery email
      </button>
      <button
        v-if="state === 'password-reset'"
        type="submit"
        @click.prevent.stop="resetPassword()"
        class="button is-primary"
      >
        Reset password
      </button>
    </div>
  </form>
</template>

<style scoped lang="scss">
#email {
  :valid {
    background-color: #e0ffe0;
  }
  :invalid {
    background-color: #ffe0e0;
  }
}

.panel-tabs {
  justify-content: end;
}
</style>
