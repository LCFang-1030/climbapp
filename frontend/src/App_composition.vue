<!-- Composition API 畫面顯示檔案 -->

<template>
  {{ count }}
  <button @click="incrementCount_ref">Add button</button>
  {{ state }}
  <button @click="incrementCount_reactive">Add button</button>
  <p>
  phone: {{ phone }}
  <input type="text" v-model="phone" /> &nbsp;
  name: {{ name }}
  <input type="text" v-model.lazy="name" /> &nbsp;
  address: {{ address }}
  <input type="text" v-model="address" />
  </p>
  inputRef: <input type="text" ref="inputRef" />
  <hr>
  <CompositionsComponent :name="name" @getName="getName" />

  {{ counter }}
  <button @click="increment">button</button>

</template>

<script>
import { ref, reactive, toRefs, watch} from 'vue';
import { onBeforeMount, onMounted, onBeforeUpdate, onUpdated, onBeforeUnmount, onUnmounted } from 'vue';
import CompositionsComponent from './components/CompositionsComponent.vue';
import Counter from './Counter';

export default {
  name: 'App',
  components: {
    CompositionsComponent,
  },
  setup() {
    onBeforeMount(() => {
      console.log('onBeforeMount');
    });
    onMounted(() => {
      console.log('onMounted');
       //測試 onMounted
      inputRef.value.focus();
    });
    onBeforeUpdate(() => {
      console.log('onBeforeUpdate');
    });
    onUpdated(() => {
      console.log('onUpdated');
    });
    onBeforeUnmount(() => {
      console.log('onBeforeUnmount');
    });
    onUnmounted(() => {
      console.log('onUnmounted');
    });

    // 單一值 / number / string → ref
    const count = ref(0);
    function incrementCount_ref() {
      count.value++;
      console.log(count.value);
    }

    // 物件 / 陣列 → reactive 或 ref([])
    const state = reactive({
      count: 0,
    });
    function incrementCount_reactive() {
      state.count++;
      console.log(state.count);
    }

    const user = reactive({
      phone: '',
    });
    const name = ref('Jack');
    const address = ref('');

    const inputRef = ref(null);

    function getName(value) {
      alert(value);
    }

    const { counter, increment } = Counter(1000, 100);

    watch(
      // [name, address],
      () => {
        return { ...user };
      },
      (newValue, oldValue) => {
        console.log('user', newValue.phone, oldValue.phone);
        // console.log('name', newValue[0], oldValue[0]);
        // console.log('address', newValue[1], oldValue[1]);
      },
      // {
      //   immediate: true, //如果變數一開始有值，就會被 watch
      // }
    );

    return {
      count,
      state,
      incrementCount_ref,
      incrementCount_reactive,
      ...toRefs(user),
      name, address,
      inputRef,
      getName,
      counter,
      increment,
    };
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
  margin-top: 60px;
}
</style>
