import { createRouter, createWebHistory } from 'vue-router'
// import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    name: '首頁',
    // component: HomeView
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/ticket',
    name: '套票',
    component: () => import('../views/TicketView.vue'),
  },
  {
    path: '/rental',
    name: '裝備',
    component: () => import('../views/RentalEquipmentView.vue'),
  },
  {
    path: '/member',
    name: '會員',
    component: () => import('../views/MemberView.vue'),
  },
  {
    path: '/form',
    name: '會員註冊',
    component: () => import('../views/FormView.vue'),
  },
  {
    path: '/entry',
    name: '入場/交易紀錄',
    component: () => import('../views/EntryView.vue'),
    meta: { requiresAuth: true },   // 👈 標記需要登入
  },
  {
    path: '/staff',
    name: '員工',
    component: () => import('../views/StaffView.vue'),
  },
  {
    path: '/account',
    name: '財務',
    component: () => import('../views/AccountView.vue'),
  },
  {
    path: '/about',
    name: '關於',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue'),
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
