<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import MessageToaster from '@/components/MessageToaster.vue';
import AuthenticationModal from '@/components/AuthenticationModal.vue';
import { computed } from 'vue';
import useApiClient from '@/composables/api-client.ts';
import { faSignOutAlt, faUser } from '@fortawesome/free-solid-svg-icons';
import { useTeamStore } from '@/stores/teams.ts';

const route = useRoute();
const apiClient = useApiClient();
const isPasswordReset = computed(() => route.name === 'password-reset');

const teamStore = useTeamStore();

const isEditingTeamName = computed(() => {
  if (teamStore.currentlyEditing) {
    return teamStore.localTeams.find((t) => t.id === teamStore.currentlyEditing)?.name;
  }
  return '';
});

const editTabTitle = computed(() => {
  if (isEditingTeamName.value) {
    return `Edit ${isEditingTeamName.value}`;
  }
  return 'Create';
});
</script>

<template>
  <div id="root" class="article">
    <authentication-modal />
    <section class="hero is-small">
      <div class="hero-head">
        <nav class="navbar">
          <div class="container">
            <div class="navbar-menu">
              <div class="navbar-end" id="navbarMenu"></div>
              <div class="navbar-end">
                <div class="navbar-item">
                  <div class="field has-addons">
                    <div class="control">
                      <span class="button is-static">
                        <span class="icon">
                          <font-awesome-icon :icon="faUser" />
                        </span>
                        <span>
                          {{ apiClient.userName.value }}
                        </span>
                      </span>
                    </div>
                    <div class="control">
                      <a
                        class="button is-primary"
                        @click="apiClient.logout"
                        v-if="apiClient.token.value"
                        title="Log out"
                      >
                        <span class="icon">
                          <font-awesome-icon :icon="faSignOutAlt" />
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
      <message-toaster />
      <div class="hero-body">
        <p class="title">Formicario</p>
      </div>
      <div class="hero-foot">
        <nav class="tabs is-boxed" v-show="!isPasswordReset">
          <div class="container">
            <ul>
              <li :class="{ 'is-active': route.name === 'home' }">
                <router-link to="/">Battle</router-link>
              </li>
              <li :class="{ 'is-active': route.name === 'edit' || route.name === 'editTeam' }">
                <router-link to="/edit">{{ editTabTitle }}</router-link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </section>
    <section class="top-level section">
      <RouterView />
    </section>
  </div>
</template>

<style scoped lang="scss">
#root {
  height: 100vh;
  .hero {
    background-image: url('@/assets/battle.png');
    // Rotate the background image slowly
    animation: rotate 1000s linear infinite;
    @keyframes rotate {
      0% {
        background-position: 0 0;
      }
      100% {
        background-position: 100% 100%;
      }
    }
  }
  .top-level {
    height: 100%;
  }
}

p {
  font-size: 400%;
  filter: drop-shadow(3px 3px 10px gray);
}

.tabs {
  background-color: rgba(grey, 0.5);
}
</style>
