<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div id="root" class="article">
    <section class="hero is-small">
      <div class="hero-head">
        <nav class="navbar">
          <div class="container">
            <div class="navbar-menu">
              <div class="navbar-end" id="navbarMenu"></div>
            </div>
          </div>
        </nav>
      </div>
      <div class="hero-body">
        <p class="title">Formicario</p>
      </div>
      <div class="hero-foot">
        <nav class="tabs is-boxed">
          <div class="container">
            <ul>
              <li :class="{ 'is-active': route.path === '/' }">
                <router-link to="/">Battle</router-link>
              </li>
              <li :class="{ 'is-active': route.path === '/edit' }">
                <router-link to="/edit">Edit</router-link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </section>
    <section class="section">
      <RouterView />
    </section>
  </div>
</template>

<style scoped lang="scss">
#root {
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
}

p {
  font-size: 400%;
  filter: drop-shadow(3px 3px 10px gray);
}

.tabs {
  background-color: rgba(grey, 0.5);
}
</style>
