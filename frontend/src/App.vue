<template>
  <div class="app-layout">
    <nav class="side-nav">
      <router-link to="/">Home</router-link>
      <router-link to="/about?x=aaa">About</router-link>
      <router-link to="/staff">Staff</router-link>
      <router-link to="/member?x=aaa">Member</router-link>
      <router-link to="/entry">Entry</router-link>
      <router-link to="/account?x=aaa">Account</router-link>
    </nav>

    <main class="main-content">
      <router-view/>
    </main>
  </div>
</template>

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
  gap: 16px;
  border-right: 1px solid #ddd;
}

.main-content {
  flex: 1;
  padding: 30px;
}
</style>
