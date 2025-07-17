<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div id="root" class="article">
    <section class="hero">
      <div class="hero-body">
        <p class="title">Formicario</p>
      </div>
      <div class="hero-foot">
        <nav class="navbar">
          <div class="container">
            <div class="navbar-menu">
              <div class="navbar-end" id="navbarMenu"></div>
            </div>
          </div>
        </nav>
      </div>
    </section>
    <!--    <div class="slide-in-menu">-->
    <!--      <aside class="menu">-->
    <!--        <ul class="menu-list">-->
    <!--          <li><a>Foo</a></li>-->
    <!--          <li><a>Bar</a></li>-->
    <!--        </ul>-->
    <!--      </aside>-->
    <!--    </div>-->

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
  .slide-in-menu {
    position: fixed;
    //position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 200px;
    z-index: 100;

    transform: translateX(-90%);
    transition: transform 0.3s ease;
    &:hover {
      transform: translateX(0);
    }
  }
}
</style>
