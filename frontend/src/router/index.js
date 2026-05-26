import { createRouter, createWebHistory } from 'vue-router'
import { canAccessPermission, getStoredAuth } from '../utils/auth'

const routes = [
  {
    path: '/',
    name: '首頁',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true, permissionKey: 'home' },
  },
  {
    path: '/entry',
    name: '入場',
    component: () => import('../views/EntryView.vue'),
    meta: { requiresAuth: true, permissionKey: 'entry' },
  },
  {
    path: '/member',
    name: '會員',
    component: () => import('../views/MemberView.vue'),
    meta: { requiresAuth: true, permissionKey: 'member' },
  },
  {
    path: '/visithistory',
    name: '交易',
    component: () => import('../views/VisitHistoryView.vue'),
    meta: { requiresAuth: true, permissionKey: 'visithistory' },
  },
  {
    path: '/items',
    name: '單品',
    component: () => import('../views/ItemsView.vue'),
    meta: { requiresAuth: true, permissionKey: 'items' },
  },
  {
    path: '/activity',
    name: '活動',
    component: () => import('../views/ActivityView.vue'),
    meta: { requiresAuth: true, permissionKey: 'activity' },
  },
  {
    path: '/form',
    name: '會員註冊',
    component: () => import('../views/FormView.vue'),
    meta: { requiresAuth: true, permissionKey: 'form' },
  },
  {
    path: '/staff-signup',
    name: '帳號開通',
    component: () => import('../views/StaffSignupView.vue'),
  },
  {
    path: '/login',
    name: '員工登入',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/financial',
    name: '財務',
    component: () => import('../views/FinancialView.vue'),
    meta: { requiresAuth: true, permissionKey: 'financial' },
  },
  {
    path: '/business',
    name: '系統',
    component: () => import('../views/BusinessView.vue'),
    meta: { requiresAuth: true, permissionKey: 'business' },
  },
  {
    path: '/about',
    name: '關於',
    component: () => import('../views/AboutView.vue'),
    meta: { requiresAuth: true, permissionKey: 'about' },
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  const auth = getStoredAuth()
  const isLoggedIn = Boolean(auth?.isLoggedIn)

  if (to.meta.requiresAuth && !isLoggedIn) {
    next({
      path: '/login',
      query: { redirect: to.fullPath },
    })
    return
  }

  if (to.path === '/login' && isLoggedIn) {
    next('/')
    return
  }

  if (to.meta.permissionKey && !canAccessPermission(auth, to.meta.permissionKey)) {
    next('/')
    return
  }

  next()
})

export default router
