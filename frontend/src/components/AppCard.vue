<!-- 上層透過slot傳入畫面結構/HTML -->
<!-- 子元件只負責「框架 / 版型」, 內容完全由父元件決定 -->
<!-- Slots適合版型固定、內容變化很大的元件 -->

<template>
  <div>
    <slot></slot>
    <slot name="header">header</slot>
    <slot name="content">content</slot>
  </div>
</template>

<script>
export default {
  name: 'AppCard'
};
</script>