

<template>
  {{ thisName }}
  <br />
  <button @click="sendValue">傳出</button>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'CompositionsComponent',
  props: ['name'],
  emits: ['getName'],

  setup(props, context) {
    const thisName = ref('');

    onMounted(() => {
      console.log("onMounted", props.name);
      thisName.value = props.name;
    });

    function sendValue() {
      context.emit('getName', thisName.value);
    }
    
    return {
      thisName,
      sendValue,
    };
  },
};
</script>