
<template>
  <div class="member">
    <h1>This is an member page</h1>
    <h1>{{ x }}</h1>
  </div>
</template>

<script>
export default {
  data() {
    return {
      x: this.$route.query.x
    }
  }
}
</script>