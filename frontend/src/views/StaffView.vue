
<template>
  <div class="staff">
    <h1>{{ isSignupMode ? '員工註冊' : '員工登入' }}</h1>

    <div v-if="!isSignupMode" class="login-form">
      <label class="form-row">
        <span>username:</span>
        <select ref="inputRef" v-model="username">
          <option disabled value="">請選擇員工</option>
          <option
            v-for="staff in staffList"
            :key="staff.eid"
            :value="staff.eid"
          >
            {{ staff.name }}（{{ staff.eid }}）
          </option>
        </select>
      </label>

      <label class="form-row">
        <span>password:</span>
        <input type="password" v-model.trim="password" />
      </label>

      <div class="login-action">
        <button class="login-button" @click="GotoSignup()"> Sign up </button>
        <button class="login-button" @click="Setlogin()"> Login </button>
      </div>
    </div>

    <!-- 註冊表單 -->
    <div v-else class="login-form">
      <div v-for="(label, key) in labels" :key="key" class="form-row">
        <span>{{ label }}:</span>
        
        <select v-if="key === 'role'" v-model="form.role">
          <option value="1">員工</option>
          <option value="2">管理人</option>
          <option value="3">老闆</option>
        </select>

        <input 
          v-else 
          :type="key === 'password' ? 'password' : 'text'" 
          v-model.trim="form[key]" 
        />
      </div>

      <div class="login-action">
        <button class="login-button" @click="isSignupMode = false"> 取消 </button>
        <button class="login-button" @click="SetSignup()"> Set Signup </button>
      </div>
    </div>

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

      username: '',
      password: '',
      islogin: false,
      isSignupMode: false, // 控制顯示登入或註冊表單
      datetime: '',
      staffList: [],

      labels: {
        name: "姓名",
        idcard: "身分證字號",
        phone: "電話",
        address: "住址",
        role: "角色",
        username: "帳號",
        password: "密碼",
      },

      form: {
        name: "",
        idcard: "",
        phone : "",
        address: "",
        role: "1",
        username: "",
        password: "",
      }
    }
  },

  methods: {
    Setlogin() {
      localStorage.setItem('islogin', 'true');
      this.datetime = new Date().toLocaleString('zh-TW', { hour12: false });
      
      setTimeout(() => {
        console.log('login success, changed');
        this.$router.push('/entry');
      }, 500);
    },

    GotoSignup() {
      // 進入註冊頁面前先重設表單資料
      this.Clearform();
      this.isSignupMode = true; // 切換到註冊模式
    },

    async SetSignup() {
      try {
        // 基本檢查
        if (
          !this.form.name ||
          !this.form.idcard ||
          !this.form.phone ||
          !this.form.address ||
          !this.form.role ||
          !this.form.username ||
          !this.form.password
        ) {
          alert('請填寫完整資料');
          return;
        }

        const res = await axios.post('/api/staff', {
          name: this.form.name,
          idcard: this.form.idcard,
          phone: this.form.phone,
          address: this.form.address,
          role: this.form.role || 1,
          username: this.form.username,
          password: this.form.password,
        });
        
        alert(`註冊成功！員工編號為: ${res.data.eid}`);
        this.Clearform();
        this.isSignupMode = false; // 註冊成功後切回登入畫面
        this.fetchStaff(); // 重新取得員工列表，以便登入時選擇新員工
        console.log(res.data);
      } catch (err) {
        console.error('註冊員工失敗', err);
        if (err.response?.data) {
          alert(err.response.data);
        } else {
          alert('註冊員工失敗');
        }
      }
    },

    Clearform(){
      this.form = {
        name: "",
        idcard: "",
        phone : "",
        address: "",
        role: "1",
        username: "",
        password: "",
      };
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

<style scoped>
.login-form {
  display: inline-flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: 90px 220px;
  column-gap: 12px;
  align-items: center;
}

.form-row span {
  text-align: right;
}

.form-row input,
.form-row select {
  width: 220px;
  box-sizing: border-box;
}

.login-action {
  display: flex;
  align-items: center;
  gap: 12px;
  align-self: flex-end;
  margin-top: 6px;
}

.login-button {
  width: fit-content;
}
</style>
