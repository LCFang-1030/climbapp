<!-- 生命週期 -->

<template>
  <p>AppComponent2</p>
</template>

<script>
export default {
  name: 'AppComponent2',
  beforeCreate() {
    console.log('AppComponent2 beforeCreate');
  },
  created() {
    console.log('AppComponent2 created');
  },
  beforeMount() {
    console.log('AppComponent2 beforeMount');
  },
  mounted() {
    console.log('AppComponent2 mounted');
  },
  beforeUpdate() {
    console.log('AppComponent2 beforeUpdate');
  },
  updated() {
    console.log('AppComponent2 updated');
  },
};
</script>