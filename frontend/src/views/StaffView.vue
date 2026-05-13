
<template>
  <div class="staff">
    <h1>This is an staff login page</h1>

    <h4>user: {{ user }} &nbsp; <input type="text" ref="inputRef" v-model.trim="user" /></h4>
    <h4>password: {{ password }} &nbsp; <input type="text" v-model.trim="password" /></h4>

    {{ islogin }}
    <button @click="Setlogin()"> login </button>
    <h4>datetime: {{ datetime }}</h4>

  <table border="1">
    <thead>
      <tr>
        <th>員工編號</th>
        <th>姓名</th>
        <th>角色</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="staff in staffList" :key="staff.eid">
        <td>{{ staff.eid }}</td>
        <td>{{ staff.name }}</td>
        <td>{{ roleText(staff.role) }}</td>
      </tr>
    </tbody>
  </table>

  </div>
</template>

<script>
import axios from 'axios'

export default {
  mounted() {
    console.log('staff mounted');

    //UI控制
    // 頁面一出現，就把游標自動指向這裡
    this.$refs.inputRef.focus();
    this.fetchStaff();
  },

  data() {
    return {
      x: this.$route.query.x,

      user: '',
      password: '',
      islogin: false,
      datetime: '',
      staffList: [],
    }
  },

  methods: {
    Setlogin() {
      // this.islogin = true;
      // 關分頁就清
      // sessionStorage.setItem('islogin', 'true');
      // 永久，除非你刪
      localStorage.setItem('islogin', 'true');
      this.datetime = new Date().toLocaleString('zh-TW', { hour12: false });
      
      setTimeout(() => {
        console.log('login success, changed');
        this.$router.push('/entry');
      }, 500);
    },

    roleText(role) {
      switch (role) {
        case 1: return '員工'
        case 2: return '管理人'
        case 3: return '老闆'
        default: return '未知'
      }
    },

    async fetchStaff() {
      try {
        const res = await axios.get('/api/staff')
        this.staffList = res.data
      } catch (err) {
        console.error('取得 staff 失敗', err)
      }
    }

  },

  watch: {
    $route() {
      this.$nextTick(() => {
        this.$refs.inputRef?.focus();
      });
    }
  },

}
</script>