<!-- 自動化偵測事件回傳 -->

<template>
  <input type="text"
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script>
export default {
  name: 'AppInput',
  props: {
    modelValue: String, // modelValue 為系統名稱，不能自由命名
  },
};
</script>