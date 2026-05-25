<template>
  <div class="app-layout">
    <nav :class="['side-nav', { 'side-nav--collapsed': isNavCollapsed }]">
      <button class="brand-button" type="button" @click="isNavCollapsed = !isNavCollapsed">
        <img class="brand-logo" src="./assets/logo.png" alt="Vue logo">
      </button>

      <div class="nav-links">
        <template v-for="item in navItems" :key="item.label">
          <router-link
            v-if="item.type === 'link'"
            :to="item.to"
            class="nav-link"
            :title="item.label"
          >
            <span class="nav-icon-wrap">
              <img class="nav-icon" src="./assets/logo.png" :alt="item.label">
            </span>
            <span v-if="!isNavCollapsed" class="nav-label">{{ item.label }}</span>
          </router-link>

          <div v-else class="nav-group">
            <button
              type="button"
              class="nav-group-toggle"
              :title="item.label"
              @click="toggleGroup(item.key)"
            >
              <span class="nav-icon-wrap">
                <img class="nav-icon" src="./assets/logo.png" :alt="item.label">
              </span>
              <span v-if="!isNavCollapsed" class="nav-group-text">
                <span class="nav-group-label">{{ item.label }}</span>
                <span class="nav-group-arrow">
                  {{ expandedGroups[item.key] ? '-' : '+' }}
                </span>
              </span>
            </button>

            <div v-if="!isNavCollapsed && expandedGroups[item.key]" class="nav-sublinks">
              <router-link
                v-for="child in item.children"
                :key="child.to"
                :to="child.to"
                class="nav-link nav-link--child"
                :title="child.label"
              >
                <span class="nav-icon-wrap">
                  <img class="nav-icon" src="./assets/logo.png" :alt="child.label">
                </span>
                <span class="nav-label">{{ child.label }}</span>
              </router-link>
            </div>
          </div>
        </template>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isNavCollapsed: false,
      expandedGroups: {
        records: true,
        products: true,
        settings: true,
      },
      navItems: [
        { type: 'link', label: '首頁', to: '/' },
        { type: 'link', label: '入場', to: '/entry' },
        {
          type: 'group',
          key: 'records',
          label: '紀錄列表',
          children: [
            { label: '會員', to: '/member?x=aaa' },
            { label: '交易', to: '/visithistory' },
          ],
        },
        {
          type: 'group',
          key: 'products',
          label: '商品相關',
          children: [
            { label: '單品', to: '/items' },
            { label: '活動', to: '/activity' },
          ],
        },
        {
          type: 'group',
          key: 'settings',
          label: '設定相關',
          children: [
            { label: '會員註冊', to: '/form' },
            { label: '員工', to: '/staff' },
            { label: '財務', to: '/account?x=aaa' },
            { label: '系統', to: '/business' },
            { label: '關於', to: '/about?x=aaa' },
          ],
        },
      ],
    }
  },
  methods: {
    toggleGroup(groupKey) {
      this.expandedGroups[groupKey] = !this.expandedGroups[groupKey]
    },
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 30px 20px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

.side-nav {
  width: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  border-right: 1px solid #ddd;
  transition: width 0.2s ease;
}

.side-nav--collapsed {
  width: 72px;
  padding: 30px 12px;
}

.brand-button {
  height: 144px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.brand-logo {
  width: 130px;
  height: auto;
  transition: width 0.2s ease;
}

.side-nav--collapsed .brand-logo {
  width: 48px;
}

.nav-links {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nav-link,
.nav-group-toggle {
  display: grid;
  grid-template-columns: 32px 1fr;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
}

.nav-group-toggle {
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
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
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.nav-label,
.nav-group-label {
  min-width: 0;
}

.nav-group-label {
  font-weight: bold;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-group-text {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 6px;
}

.nav-group-arrow {
  font-size: 14px;
  line-height: 1;
}

.nav-sublinks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 32px;
}

.nav-link--child {
  grid-template-columns: 32px 1fr;
}

.main-content {
  flex: 1;
  padding: 30px;
}
</style>
