import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/edit',
      name: 'edit',
      component: () => import('../views/EditView.vue'),
      props: true,
      // Nested route for editing a team by id
      children: [
        {
          path: ':id',
          name: 'editTeam',
          component: () => import('../views/EditView.vue'),
          props: true,
        },
      ],
    },
    {
      path: '/password-reset/:token',
      name: 'password-reset',
      component: () => import('../views/PasswordReset.vue'),
      props: true,
    },
  ],
});

export default router;
