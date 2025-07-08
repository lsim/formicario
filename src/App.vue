<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div id="root" class="article">
    <div class="ui masthead vertical segment">
      <div class="ui container">
        <h1 class="ui header">Myrekrig</h1>
      </div>

      <!--      <div class="wrapper">-->
      <!--        <nav>-->
      <!--          <RouterLink to="/">Home</RouterLink>-->
      <!--        </nav>-->
      <!--      </div>-->
    </div>

    <div class="ui main container">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
#root {
  header {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  main {
    margin-top: 2rem;
    width: 100%;
  }
}
</style>
