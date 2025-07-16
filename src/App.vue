<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div id="root" class="article">
    <section class="hero is-warning">
      <div class="hero-body">
        <p class="title">Formicario</p>
      </div>
    </section>

    <!--      <div class="wrapper">-->
    <!--        <nav>-->
    <!--          <RouterLink to="/">Home</RouterLink>-->
    <!--        </nav>-->
    <!--      </div>-->

    <div class="box">
      <RouterView />
    </div>
  </div>
</template>

<style scoped lang="scss">
#root {
}
</style>
