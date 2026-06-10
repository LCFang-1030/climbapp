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

      <div v-if="currentStaff" ref="profileMenu" class="staff-profile">
        <div v-if="isProfileMenuOpen" class="staff-profile-menu">
          <div class="staff-profile-menu-actions">
            <button type="button" class="profile-menu-button profile-menu-button--wide" @click="openChangePasswordConfirm">
              更改密碼
            </button>
            <button type="button" class="profile-menu-button profile-menu-button--wide profile-menu-button--danger" @click="logout">
              登出
            </button>
          </div>
        </div>

        <button type="button" class="staff-profile-card staff-profile-trigger" @click.stop="toggleProfileMenu">
          <p class="staff-profile-title">登入帳號</p>
          <p class="staff-profile-line">
            {{ currentStaff.employee_id }}
            <span class="staff-profile-separator">|</span>
            {{ currentStaff.alias || '未設定暱稱' }}
            <span class="staff-profile-separator">|</span>
            {{ currentStaff.employee_title || '未設定職稱' }}
          </p>
        </button>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>

    <div
      v-if="activeProfilePanel"
      class="profile-dialog-overlay"
      @click.self="closePasswordDialog"
    >
      <div class="profile-dialog">
        <div class="profile-dialog-header">
          <h3 class="profile-dialog-title">
            {{ activeProfilePanel === 'confirm' ? '確認目前密碼' : '修改密碼' }}
          </h3>
          <button
            type="button"
            class="profile-dialog-close"
            aria-label="關閉修改密碼視窗"
            @click="closePasswordDialog"
          >
            ×
          </button>
        </div>

        <div v-if="activeProfilePanel === 'confirm'" class="staff-profile-panel">
          <input
            ref="currentPasswordInput"
            v-model.trim="currentPasswordConfirm"
            class="staff-profile-input"
            type="password"
            @keyup.enter="handleConfirmCurrentPassword"
            placeholder="請輸入目前密碼"
          >
          <div class="staff-profile-actions">
            <button type="button" class="profile-menu-button profile-menu-button--ghost" @click="closePasswordDialog">
              取消
            </button>
            <button type="button" class="profile-menu-button" :disabled="isPasswordChecking" @click="handleConfirmCurrentPassword">
              下一步
            </button>
          </div>
        </div>

        <div v-else class="staff-profile-panel">
          <input
            ref="newPasswordInput"
            v-model.trim="passwordForm.newPassword"
            class="staff-profile-input"
            type="password"
            @keyup.enter="focusConfirmPasswordInput"
            placeholder="請輸入新密碼"
          >
          <input
            ref="confirmPasswordInput"
            v-model.trim="passwordForm.confirmPassword"
            class="staff-profile-input"
            type="password"
            @keyup.enter="submitPasswordChange"
            placeholder="請再次輸入新密碼"
          >
          <div class="staff-profile-actions">
            <button type="button" class="profile-menu-button profile-menu-button--ghost" @click="goBackToPasswordConfirm">
              返回
            </button>
            <button
              type="button"
              class="profile-menu-button"
              :disabled="isPasswordSubmitting"
              @click="submitPasswordChange"
            >
              {{ isPasswordSubmitting ? '送出中...' : '確認修改' }}
            </button>
          </div>
        </div>

        <p v-if="profileErrorMsg" class="staff-profile-feedback staff-profile-feedback--error">
          {{ profileErrorMsg }}
        </p>
        <p v-if="profileSuccessMsg" class="staff-profile-feedback staff-profile-feedback--success">
          {{ profileSuccessMsg }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
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
      { label: '帳號開通', to: '/staff-signup', requiresAuth: false },
      { label: '排班', to: '/scheduling', permissionKey: 'scheduling', requiresAuth: true },
      { label: '財務', to: '/financial', permissionKey: 'financial', requiresAuth: true },
      { label: '系統', to: '/business', permissionKey: 'business', requiresAuth: true },
      { label: '關於', to: '/about', permissionKey: 'about', requiresAuth: true },
      { label: '會員註冊', to: '/form', permissionKey: 'form', requiresAuth: true },
      { label: '員工登入', to: '/login', requiresAuth: false },
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
      isProfileMenuOpen: false,
      activeProfilePanel: null,
      currentPasswordConfirm: '',
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      },
      profileErrorMsg: '',
      profileSuccessMsg: '',
      isPasswordSubmitting: false,
      isPasswordChecking: false,
    }
  },
  mounted() {
    this.refreshAuthState()
    window.addEventListener('storage', this.refreshAuthState)
    document.addEventListener('click', this.handleDocumentClick)
  },
  beforeUnmount() {
    window.removeEventListener('storage', this.refreshAuthState)
    document.removeEventListener('click', this.handleDocumentClick)
  },
  watch: {
    $route() {
      this.refreshAuthState()
    },
    activeProfilePanel(value) {
      if (!value) {
        return
      }

      this.$nextTick(() => {
        if (value === 'confirm') {
          this.focusCurrentPasswordInput()
          return
        }

        this.focusNewPasswordInput()
      })
    },
  },
  methods: {
    handleDocumentClick(event) {
      if (!this.isProfileMenuOpen) {
        return
      }

      if (this.$refs.profileMenu?.contains(event.target)) {
        return
      }

      this.closeProfileMenu()
    },
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
    toggleProfileMenu() {
      this.isProfileMenuOpen = !this.isProfileMenuOpen
    },
    closeProfileMenu() {
      this.isProfileMenuOpen = false
    },
    resetPasswordDialog() {
      this.activeProfilePanel = null
      this.currentPasswordConfirm = ''
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }
      this.profileErrorMsg = ''
      this.profileSuccessMsg = ''
      this.isPasswordSubmitting = false
      this.isPasswordChecking = false
    },
    focusCurrentPasswordInput() {
      this.$refs.currentPasswordInput?.focus()
    },
    focusNewPasswordInput() {
      this.$refs.newPasswordInput?.focus()
    },
    focusConfirmPasswordInput() {
      this.$refs.confirmPasswordInput?.focus()
    },
    goBackToPasswordConfirm() {
      this.passwordForm.newPassword = ''
      this.passwordForm.confirmPassword = ''
      this.profileErrorMsg = ''
      this.profileSuccessMsg = ''
      this.activeProfilePanel = 'confirm'
    },
    openChangePasswordConfirm() {
      this.closeProfileMenu()
      this.resetPasswordDialog()
      this.activeProfilePanel = 'confirm'
    },
    closePasswordDialog() {
      this.resetPasswordDialog()
    },
    async handleConfirmCurrentPassword() {
      if (!this.currentStaff?.eid) {
        this.profileErrorMsg = '找不到目前登入的員工資料'
        return
      }

      if (!this.currentPasswordConfirm) {
        this.profileErrorMsg = '請先輸入目前密碼確認。'
        return
      }

      this.profileErrorMsg = ''
      this.profileSuccessMsg = ''
      this.isPasswordChecking = true

      try {
        await axios.post(`/api/staff/${this.currentStaff.eid}/verify-password`, {
          current_password: this.currentPasswordConfirm,
        })

        this.passwordForm.currentPassword = this.currentPasswordConfirm
        this.passwordForm.newPassword = ''
        this.passwordForm.confirmPassword = ''
        this.currentPasswordConfirm = ''
        this.activeProfilePanel = 'change-password'
      } catch (error) {
        this.profileErrorMsg = error.response?.data || '目前密碼驗證失敗'
      } finally {
        this.isPasswordChecking = false
      }
    },
    confirmCurrentPassword() {
      if (!this.currentPasswordConfirm) {
        this.profileErrorMsg = '請先輸入目前密碼確認。'
        return
      }

      this.passwordForm.currentPassword = this.currentPasswordConfirm
      this.currentPasswordConfirm = ''
      this.activeProfilePanel = 'change-password'
      this.profileErrorMsg = ''
      this.profileSuccessMsg = ''
    },
    async submitPasswordChange() {
      if (!this.currentStaff?.eid) {
        this.profileErrorMsg = '找不到登入帳號資訊，請重新登入。'
        return
      }

      if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
        this.profileErrorMsg = '請完整輸入目前密碼與新密碼。'
        return
      }

      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        this.profileErrorMsg = '新密碼與確認新密碼不一致。'
        return
      }

      this.profileErrorMsg = ''
      this.profileSuccessMsg = ''
      this.isPasswordSubmitting = true

      try {
        await axios.post(`/api/staff/${this.currentStaff.eid}/change-password`, {
          current_password: this.passwordForm.currentPassword,
          new_password: this.passwordForm.newPassword,
        })

        this.closePasswordDialog()
      } catch (error) {
        this.profileErrorMsg = error.response?.data || '修改密碼失敗，請稍後再試。'
      } finally {
        this.isPasswordSubmitting = false
      }
    },
    logout() {
      clearStoredAuth()
      this.currentStaff = null
      this.closeProfileMenu()
      this.closePasswordDialog()
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
  padding-bottom: 100px;
}

.side-nav--collapsed.side-nav--with-profile {
  padding-bottom: 100px;
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

.staff-profile-trigger {
  display: block;
  width: 100%;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
}

.staff-profile-card p {
  margin: 0;
}

.staff-profile-title {
  margin-bottom: 4px;
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

.staff-profile-menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 12px);
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(32, 52, 74, 0.08);
  box-shadow: 0 18px 42px rgba(32, 52, 74, 0.18);
  pointer-events: auto;
}

.staff-profile-menu-actions,
.staff-profile-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.staff-profile-panel-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #20344a;
}

.staff-profile-input {
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #d6dde7;
  border-radius: 12px;
  background: #f8fbfe;
}

.staff-profile-actions {
  display: flex;
  gap: 10px;
}

.profile-menu-button {
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 12px;
  background: #20344a;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.profile-menu-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.profile-menu-button--wide {
  width: 100%;
}

.profile-menu-button--ghost {
  background: #e9f0f6;
  color: #20344a;
}

.profile-menu-button--danger {
  background: #d45555;
}

.profile-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 24, 34, 0.36);
}

.profile-dialog {
  width: min(420px, 100%);
  padding: 20px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(32, 52, 74, 0.22);
}

.profile-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.profile-dialog-title {
  margin: 0;
  font-size: 18px;
  color: #20344a;
}

.profile-dialog-close {
  width: 34px;
  height: 34px;
  border: 1px solid #d6dde7;
  border-radius: 10px;
  background: #fff;
  color: #20344a;
  cursor: pointer;
}

.staff-profile-feedback {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.5;
}

.staff-profile-feedback--error {
  color: #c24343;
}

.staff-profile-feedback--success {
  color: #21855b;
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

  .staff-profile-menu {
    position: static;
    margin-bottom: 12px;
  }
}
</style>
