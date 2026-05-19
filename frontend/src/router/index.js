import { createRouter, createWebHistory } from 'vue-router'
// import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    // component: HomeView
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue'),
  },
  {
    path: '/staff',
    name: 'staff',
    component: () => import('../views/StaffView.vue'),
  },
  {
    path: '/member',
    name: 'member',
    component: () => import('../views/MemberView.vue'),
  },
  {
    path: '/entry',
    name: 'entry',
    component: () => import('../views/EntryView.vue'),
    meta: { requiresAuth: true },   // 👈 標記需要登入
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('../views/AccountView.vue'),
  },
  {
    path: '/form',
    name: 'form',
    component: () => import('../views/FormView.vue'),
  },
  
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  const islogin = localStorage.getItem('islogin')

  if (to.meta.requiresAuth && !islogin) {
    console.log('未登入，禁止進入 Entry')
    next({
      path: '/staff',
      query: { t: Date.now() } // 強迫 route 改變
    });
  } else {
    next()
  }
})

export default router
