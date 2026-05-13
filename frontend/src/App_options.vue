<!-- Options API畫面顯示檔案 -->
<!-- 有呼叫 Server API 的話，通常會放在 created() {}  -->
<!-- 有 UI 的相關邏輯處理，會放在 mounted() {}  -->

<template>
  <!-- 第一種是傳label, 第二種是傳變數 -->
  <!-- <AppHeader name="ANDY"/> -->
  <AppHeader :name="message" :email="users2[1].email"/>
  <hr />

  <AppView @viewText="getViewText" />
  cb from AppView: {{ text_from_view }}
  <hr />
  <AppInput v-model="text_from_input" />
  cb from AppInput: {{ text_from_input }}
  <hr />

  <AppCard>
    <a href="">Link</a>
    <template v-slot:header>
      <h6>Test Card Header</h6>
    </template>
    <template v-slot:content>
      <h6>Test Card Content</h6>
    </template>
  </AppCard>
  <hr />

  <button @click="showComponent('tab1')">AppComponent1</button>
  <button @click="loadComponent('tab2')">AppComponent2</button>
  <button @click="showComponent('tab3')">AppComponent3</button>
  <AppComponent1 v-if="components_tab === 'tab1'" />
  <!-- mounted -->
  <!-- 頁面一出現，就把游標自動指向這裡 -->
  <input type="text" ref="inputRef" />
  <!-- <AppComponent2 v-if="components_tab === 'tab2'" /> -->
  <AppComponent2 v-if="isLoad" />
  <!-- keep-alive保留元件內的輸入內容 -->
  <keep-alive>
  <AppComponent3 v-if="components_tab === 'tab3'" />
  </keep-alive>
  <hr />
  {{ count }}
  <button @click="incrementCount">Add Count</button>
  <hr />

  <div>
    <h1>{{ message }}</h1>
    <!-- v-pre作為label直接顯示 -->
    <h3><p v-pre>{{ message }}</p></h3>
    <!-- v-once不顯示更新值，變數本身還是有改變 -->
    <h6><p v-once>{{ messaget }}</p></h6>
    <input type="text" v-model="messaget" />
    <ul>
      <input type="checkbox" v-model="isShow" /> <p v-show="isShow"> Hello World TEST </p>
      <p v-if="x === 0"> run in if x = 0 </p>
      <p v-else>  run in else x 1= 0 </p>
      <p v-for="(user, index) in users2" :key="index">
        <template v-if="user.name === 'Jake'"> 
          <!-- {{ index }} {{ user.name }} {{ user.email }} -->
          Debug index: {{ index }} | Name: {{ user.name }} | Email: {{ user.email }}
        </template>
      </p>
      <!-- call function -->
      i*y: {{ func1() }}
      <!-- button click v-on:click/@click -->
      <button v-on:click="func_count"> button 加一 </button>
      <br>
      <!-- trim去除前後空白, lazy確認後才會寫入值ㄝ -->
      <input type="text" v-model="name1" /> {{ name1 }} &nbsp;&nbsp;&nbsp;
      <input type="text" v-model.trim="name2" /> {{ name2 }} &nbsp;&nbsp;&nbsp;
      <input type="text" v-model.lazy="name3" /> {{ name3 }} <br>
      <br>
      <!-- 文字框 -->
      textarea: {{ text1 }} 
      <textarea v-model="text1" />
      <br />
      <!-- 下拉式選單 -->
      select: {{ selectValue }} 
      <select v-model="selectValue">
        <option value="">select</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>
      <br />
      <!-- 單選checkbox -->
      <input type="checkbox" v-model="isCheck" /> {{ isCheck }}  is check
      <br />
      <!-- 多選checkbox -->
      checkbox: {{ checkbox }} &nbsp;&nbsp;
      <input type="checkbox" value="0" v-model="checkbox" /> 0
      <input type="checkbox" value="1" v-model="checkbox" /> 1
      <input type="checkbox" value="2" v-model="checkbox" /> 2
      <input type="checkbox" value="3" v-model="checkbox" /> 3
      <br />
      <!-- 單選 radio -->
      radio: {{ radio }} &nbsp;&nbsp;
      <input type="radio" value="0" v-model="radio" /> 0
      <input type="radio" value="1" v-model="radio" /> 1
      <input type="radio" value="2" v-model="radio" /> 2
      <input type="radio" value="3" v-model="radio" /> 3
      <br />
      <!-- data structure -->
      formData text: <input type="text" v-model="formData.fd_name" />
      <!-- 表單submit -->
      <button @click="submit">送出</button>
      <br />
      watch array: <button @click="addItem">Add item</button>
      <br /> 
      <div v-for="data in checkDatas" :key="data.id">
        {{ data.id }} {{ data.name }}
      </div>
      <hr />

      formData: {{ formData }}

      <!-- <li v-for="m in members" :key="m.id">{{ m.name }}</li> --> 
    </ul>
  </div>
</template>

<script>
import AppHeader from './components/AppHeader.vue';
import AppView from './components/AppView.vue';
import AppInput from './components/AppInput.vue';
import AppCard from './components/AppCard.vue';
import AppComponent1 from './components/AppComponent1.vue';
import AppComponent2 from './components/AppComponent2.vue';
import AppComponent3 from './components/AppComponent3.vue';
import Count from './Count';

export default {
  name: 'App',
  components: {
    AppHeader,
    AppView,
    AppInput,
    AppCard,
    AppComponent1,
    AppComponent2,
    AppComponent3,
  },

  //加入模組
  mixins: [Count],

  beforeCreate() {
    console.log('beforeCreate');
  },
  created() {
    console.log('created');
    //API 呼叫
  },
  beforeMount() {
    console.log('beforeMount');
  },
  mounted() {
    console.log('mounted');

    //UI控制
    // 頁面一出現，就把游標自動指向這裡
    this.$refs.inputRef.focus();
  },
  beforeUpdate() {
    console.log('beforeUpdate');
  },
  updated() {
    console.log('updated');
  },

  data() {
    return {
      text_from_view: '',
      text_from_input: '',
      components_tab: 'tab1',
      isLoad: false,

      message: 'Climb Gym Members',
      messaget: 'Climb Gym Members',
      isShow: false,
      x: 0,
      cnt_i:3, cnt_j:4,
      users2: [
        { name: 'Jake', email: 'jake@gmail.com' },
        { name: 'Allan', email: 'allan@gmail.com' },
        { name: 'Eason', email: 'eason@gmail.com' },
      ],
      name1: '',  name2: '',  name3: '',
      text1: '',
      selectValue: '',
      isCheck: false,
      checkbox: [],
      radio: '',
      formData: {
        fd_name: '',
      },
      datas: [
        { id: 1, name: 'Jake' },
        { id: 2, name: 'Allan' },
        { id: 1, name: 'Eason' },
      ],
      items: [],

      members: [] }
  },

  methods: {
    getViewText(text) {
      this.text_from_view = text;
    },
    showComponent(index) {
      this.components_tab = index;
    },
    loadComponent() {
      this.isLoad = !this.isLoad;
    },
    func1() {
        return this.cnt_i * this.cnt_j;
    },
    func_count() {
        return this.cnt_i += 1;
    },
    submit() {
        console.log(this.formData);
    },
    addItem() {
      this.items.push('test');
    },
  },

  // 用於一次性的複雜運算
  computed: {
    checkDatas() {
      return this.datas.filter((data) => data.id === 1);
    },
  },

  // 事件監聽
  watch: {
    // 變數監聽
    cnt_i(newValue, oldValue) {
      console.log(newValue, oldValue);
    },
    // 物件變數監聽
    formData: {
      handler(newValue) {
        console.log(newValue);
      },
      deep: true, //要監聽物件時，要設定才會起作用
    },
    // 陣列監聽
    items: {
      handler(newValue) {
        console.log(newValue);
      },
      deep: true, //要監聽陣列時，要設定才會起作用
    },
  },

  // mounted() {
  //   fetch('http://localhost:3000/api/members')
  //     .then(res => res.json())
  //     .then(data => this.members = data)
  // }
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

<!-- <script setup>
  import { onMounted } from 'vue'
  
  const users2 = [
    { name: 'Jake', email: 'jake@gmail.com' },
    { name: 'Allan', email: 'allan@gmail.com' },
    { name: 'Eason', email: 'eason@gmail.com' },
  ]
  
  onMounted(() => {
    // 組件渲染後執行
    // debug 用：印出符合條件的 index 與資料
    users2.forEach((user, index) => {
      if (user.name === 'Jake') console.log('Debug index:', index, user)
    })
  })
</script> -->