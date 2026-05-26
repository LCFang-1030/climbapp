<template>
  <div class="app-layout">
    <nav :class="['side-nav', { 'side-nav--collapsed': isNavCollapsed, 'side-nav--with-profile': currentStaff }]">
      <button class="brand-button" type="button" @click="isNavCollapsed = !isNavCollapsed">
        <img class="brand-logo" src="./assets/logo.png" alt="Climb App">
        <span v-if="!isNavCollapsed" class="brand-text">Climb App</span>
      </button>

      <div class="nav-scroll-area">
        <div class="nav-links">
          <template v-for="item in navItems" :key="item.label">
            <component
              :is="linkComponent(item)"
              v-bind="linkProps(item)"
              :class="navLinkClass(item)"
              :title="item.label"
            >
              <span class="nav-icon-wrap">
                <img class="nav-icon" src="./assets/logo.png" :alt="item.label">
              </span>
              <span v-if="!isNavCollapsed" class="nav-label">{{ item.label }}</span>
            </component>
          </template>

          <div
            v-for="group in navGroups"
            :key="group.key"
            class="nav-group"
          >
            <button
              type="button"
              class="nav-group-toggle"
              :title="group.label"
              @click="toggleGroup(group.key)"
            >
              <span class="nav-icon-wrap">
                <img class="nav-icon" src="./assets/logo.png" :alt="group.label">
              </span>
              <span v-if="!isNavCollapsed" class="nav-group-text">
                <span class="nav-group-label">{{ group.label }}</span>
                <span class="nav-group-arrow">
                  {{ expandedGroups[group.key] ? '-' : '+' }}
                </span>
              </span>
            </button>

            <div v-if="!isNavCollapsed && expandedGroups[group.key]" class="nav-sublinks">
              <template v-for="child in group.children" :key="child.to">
                <component
                  :is="linkComponent(child)"
                  v-bind="linkProps(child)"
                  :class="navLinkClass(child, true)"
                  :title="child.label"
                >
                  <span class="nav-icon-wrap">
                    <img class="nav-icon" src="./assets/logo.png" :alt="child.label">
                  </span>
                  <span class="nav-label">{{ child.label }}</span>
                </component>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentStaff" class="staff-profile">
        <div class="staff-profile-card">
          <p class="staff-profile-title">目前登入</p>
          <p class="staff-profile-line">
            {{ currentStaff.employee_id }}
            <span class="staff-profile-separator">|</span>
            {{ currentStaff.alias || '未設定暱稱' }}
            <span class="staff-profile-separator">|</span>
            {{ currentStaff.employee_title || '未設定職稱' }}
          </p>
        </div>
        <button type="button" class="logout-button" @click="logout">
          登出
        </button>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script>
import { RouterLink } from 'vue-router'
import { canAccessPermission, clearStoredAuth, getStoredAuth } from './utils/auth'

const navItems = [
  { label: '首頁', to: '/', permissionKey: 'home', requiresAuth: true },
  { label: '入場', to: '/entry', permissionKey: 'entry', requiresAuth: true },
]

const navGroups = [
  {
    key: 'records',
    label: '紀錄列表',
    children: [
      { label: '會員', to: '/member', permissionKey: 'member', requiresAuth: true },
      { label: '交易', to: '/visithistory', permissionKey: 'visithistory', requiresAuth: true },
    ],
  },
  {
    key: 'products',
    label: '商品相關',
    children: [
      { label: '單品', to: '/items', permissionKey: 'items', requiresAuth: true },
      { label: '活動', to: '/activity', permissionKey: 'activity', requiresAuth: true },
    ],
  },
  {
    key: 'settings',
    label: '設定',
    children: [
      { label: '會員註冊', to: '/form', permissionKey: 'form', requiresAuth: true },
      { label: '帳號開通', to: '/staff-signup', requiresAuth: false },
      { label: '員工登入', to: '/login', requiresAuth: false },
      { label: '排班', to: '/scheduling', requiresAuth: false },
      { label: '財務', to: '/financial', permissionKey: 'financial', requiresAuth: true },
      { label: '系統', to: '/business', permissionKey: 'business', requiresAuth: true },
      { label: '關於', to: '/about', permissionKey: 'about', requiresAuth: true },
    ],
  },
]

export default {
  components: {
    RouterLink,
  },
  data() {
    return {
      isNavCollapsed: false,
      expandedGroups: {
        records: true,
        products: true,
        settings: true,
      },
      navItems,
      navGroups,
      currentStaff: null,
    }
  },
  mounted() {
    this.refreshAuthState()
    window.addEventListener('storage', this.refreshAuthState)
  },
  beforeUnmount() {
    window.removeEventListener('storage', this.refreshAuthState)
  },
  watch: {
    $route() {
      this.refreshAuthState()
    },
  },
  methods: {
    toggleGroup(groupKey) {
      this.expandedGroups[groupKey] = !this.expandedGroups[groupKey]
    },
    refreshAuthState() {
      this.currentStaff = getStoredAuth()
    },
    isAccessible(item) {
      if (!item.requiresAuth) {
        return true
      }

      return canAccessPermission(this.currentStaff, item.permissionKey)
    },
    linkComponent(item) {
      return this.isAccessible(item) ? 'router-link' : 'div'
    },
    linkProps(item) {
      return this.isAccessible(item)
        ? { to: item.to }
        : { 'aria-disabled': 'true' }
    },
    navLinkClass(item, isChild = false) {
      return [
        'nav-link',
        isChild ? 'nav-link--child' : '',
        !this.isAccessible(item) ? 'nav-link--disabled' : '',
      ]
    },
    logout() {
      clearStoredAuth()
      this.currentStaff = null
      this.$router.push('/login')
    },
  },
}
</script>

<style>
#app {
  font-family: "Segoe UI", "Noto Sans TC", sans-serif;
  color: #20344a;
}

body {
  margin: 0;
  background:
    radial-gradient(circle at top, rgba(114, 185, 255, 0.14), transparent 34%),
    linear-gradient(180deg, #f7fbff 0%, #eef4f9 100%);
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

.side-nav {
  position: relative;
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px 18px;
  box-sizing: border-box;
  height: 100vh;
  overflow: hidden;
  border-right: 1px solid rgba(32, 52, 74, 0.08);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(18px);
  transition: width 0.2s ease, padding 0.2s ease;
}

.side-nav--collapsed {
  width: 84px;
  padding: 28px 12px;
}

.side-nav--with-profile {
  padding-bottom: 148px;
}

.side-nav--collapsed.side-nav--with-profile {
  padding-bottom: 148px;
}

.brand-button {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.brand-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.brand-text {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.nav-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nav-scroll-area::-webkit-scrollbar {
  width: 8px;
}

.nav-scroll-area::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(95, 115, 136, 0.28);
}

.nav-scroll-area::-webkit-scrollbar-track {
  background: transparent;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nav-link,
.nav-group-toggle {
  display: grid;
  grid-template-columns: 32px 1fr;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 14px;
  box-sizing: border-box;
  color: #20344a;
  text-align: left;
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.nav-link:hover,
.nav-group-toggle:hover {
  background: rgba(114, 185, 255, 0.14);
  color: #0f5ea8;
  transform: translateX(2px);
}

.nav-link.router-link-active {
  background: linear-gradient(135deg, #1f7ae0, #4db6ff);
  color: #fff;
  box-shadow: 0 16px 32px rgba(31, 122, 224, 0.18);
}

.nav-group-toggle {
  border: 0;
  background: none;
  cursor: pointer;
}

.nav-link--disabled {
  color: #a3afbd;
  background: rgba(214, 220, 228, 0.3);
  pointer-events: none;
  cursor: not-allowed;
  transform: none;
}

.side-nav--collapsed .nav-link,
.side-nav--collapsed .nav-group-toggle {
  grid-template-columns: 1fr;
  justify-items: center;
}

.nav-icon-wrap {
  width: 32px;
  display: flex;
  justify-content: center;
}

.nav-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-group-text {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.nav-group-label {
  font-weight: 700;
}

.nav-group-arrow {
  font-size: 14px;
  line-height: 1;
}

.nav-sublinks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 14px;
}

.nav-link--child {
  grid-template-columns: 32px 1fr;
}

.staff-profile {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 24px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.staff-profile-card {
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, #eff7ff 0%, #ffffff 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(32, 52, 74, 0.08);
  pointer-events: auto;
}

.staff-profile-card p {
  margin: 0;
}

.staff-profile-title {
  margin-bottom: 8px;
  color: #5f7388;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.staff-profile-line {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.staff-profile-separator {
  color: #7b8da0;
}

.logout-button {
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 12px;
  background: #20344a;
  color: #fff;
  cursor: pointer;
  pointer-events: auto;
}

.main-content {
  flex: 1;
  padding: 32px;
  box-sizing: border-box;
}

@media (max-width: 900px) {
  .app-layout {
    flex-direction: column;
  }

  .side-nav,
  .side-nav--collapsed {
    width: 100%;
    height: auto;
    padding: 18px;
    padding-bottom: 18px;
    position: static;
    overflow: visible;
  }

  .nav-scroll-area {
    overflow: visible;
    padding-right: 0;
  }

  .main-content {
    padding: 20px;
  }

  .staff-profile {
    position: static;
    left: auto;
    right: auto;
    bottom: auto;
  }
}
</style>
