
<template>
  <div class="about">
    <h1>This is an about page</h1>
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