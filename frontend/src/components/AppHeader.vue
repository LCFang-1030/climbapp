<!-- 上層參數傳入資料 -->
<!-- 子元件負責「怎麼顯示」, 父元件只負責「給資料」-->
<!-- props 適合 結構固定、資料會變 的元件 -->

<template>
  <h1>Hello Component</h1>
  <p>{{ name }}</p>
  <p>{{ email }}</p>
</template>

<script>
export default {
  name: 'AppHeader',
  // props接收外部變數
  props: {
    // 定義型別
    name: String,
    // 傳入參數缺少時顯示預設值
    email: {
      type: String,
      default: 'demo@demo',
    },
  },
};
</script>