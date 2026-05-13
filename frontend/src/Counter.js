import { ref } from 'vue';

// startIndex, step 給外部輸入的參數
export default function Counter(startIndex, step) {
  const counter = ref(startIndex);
// export default function Counter() {
//   const counter = ref(0);
  
  function increment() {
    // counter.value++;
    counter.value += step
  }

  return {
    counter,
    increment,
  };
}