<template>
  <div class="app-layout">
    <nav :class="['side-nav', { 'side-nav--collapsed': isNavCollapsed }]">
      <button class="brand-button" type="button" @click="isNavCollapsed = !isNavCollapsed">
        <img class="brand-logo" src="./assets/logo.png" alt="Vue logo">
      </button>

      <div class="nav-links">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :title="item.label"
        >
          <span class="nav-icon-wrap">
            <img class="nav-icon" src="./assets/logo.png" :alt="item.label">
          </span>
          <span v-if="!isNavCollapsed" class="nav-label">{{ item.label }}</span>
        </router-link>
      </div>
    </nav>

    <main class="main-content">
      <router-view/>
    </main>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isNavCollapsed: false,
      navItems: [
        { label: 'Home', to: '/' },
        { label: 'About', to: '/about?x=aaa' },
        { label: 'Staff', to: '/staff' },
        { label: 'Member', to: '/member?x=aaa' },
        { label: 'Entry', to: '/entry' },
        { label: 'Account', to: '/account?x=aaa' },
      ],
    }
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

.nav-link {
  display: grid;
  grid-template-columns: 32px 1fr;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.side-nav--collapsed .nav-link {
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

.nav-label {
  min-width: 0;
}

.main-content {
  flex: 1;
  padding: 30px;
}
</style>
