<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div id="root">
    <header>
      <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

      <h1>Myrekrig</h1>

<!--      <div class="wrapper">-->
<!--        <nav>-->
<!--          <RouterLink to="/">Home</RouterLink>-->
<!--        </nav>-->
<!--      </div>-->
    </header>

    <main>
      <RouterView />
    </main>
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
