<!-- 按鍵觸發事件回傳 -->

<template>
  <div>
    <input type="text" v-model="text" />
    <!-- <button>Send</button> -->
    <button @click="$emit('viewText', text)">Send</button>
  </div>
</template>

<script>
export default {
  name: 'AppView',
  // 回傳資料給上層
  emits: ['viewText'],
  data() {
    return {
      text: '',
    };
  },
};
</script>