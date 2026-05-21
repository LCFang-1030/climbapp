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

    <div v-else class="signup-form-container">
      <div class="signup-form">
        <section class="form-section-card">
          <h3>1. 基本資料</h3>
          <div class="form-section">
            <div v-for="(label, key) in basicInfoLabels" :key="key" class="form-row">
              <span>{{ label }}:</span>
              <div v-if="key === 'gender'" class="radio-row">
                <label><input type="radio" :value="1" v-model="form.gender" /> 男</label>
                <label><input type="radio" :value="2" v-model="form.gender" /> 女</label>
              </div>
              <input v-else-if="key === 'birthday'" type="date" v-model="form[key]" />
              <input v-else type="text" v-model.trim="form[key]" />
            </div>
          </div>
        </section>

        <section class="form-section-card">
          <h3>2. 緊急聯絡人</h3>
          <div class="form-section">
            <div v-for="(label, key) in emergencyContactLabels" :key="key" class="form-row">
              <span>{{ label }}:</span>
              <input type="text" v-model.trim="form[key]" />
            </div>
          </div>
        </section>

        <section class="form-section-card">
          <h3>3. 工作資料</h3>
          <div class="form-section">
            <div v-for="(label, key) in jobRelatedLabels" :key="key" class="form-row">
              <span>{{ label }}:</span>
              <select v-if="key === 'employee_status'" v-model="form.employee_status">
                <option value="1">在職</option>
                <option value="2">離職</option>
                <option value="3">留職停薪</option>
              </select>
              <select v-else-if="key === 'is_active'" v-model="form.is_active">
                <option value="1">啟用</option>
                <option value="0">停用</option>
              </select>
              <input v-else type="text" v-model.trim="form[key]" />
            </div>
          </div>
        </section>

        <section class="form-section-card">
          <h3>4. 備註</h3>
          <div class="form-section">
            <div v-for="(label, key) in noteLabels" :key="key" class="form-row">
              <span>{{ label }}:</span>
              <textarea v-model.trim="form[key]" rows="3"></textarea>
            </div>
          </div>
        </section>
      </div>

      <div class="login-action signup-action">
        <button class="login-button" @click="isSignupMode = false"> 返回 </button>
        <button class="login-button" @click="SetSignup()"> Set Signup </button>
      </div>
    </div>

    <div v-if="!isSignupMode">
      <h4>datetime: {{ datetime }}</h4>

      <table border="1">
      <thead>
        <tr>
          <th>員工編號</th>
          <th>姓名</th>
          <th>員工狀態</th>
          <th>職稱</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="staff in staffList" :key="staff.eid">
          <td>{{ staff.eid }}</td>
          <td>{{ staff.name }}</td>
          <td>{{ employeeStatusText(staff.employee_status) }}</td>
          <td>{{ staff.employee_title }}</td>
        </tr>
      </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const initialForm = () => ({
  name: '',
  nationality: '',
  idcard: '',
  gender: '',
  birthday: '',
  phone: '',
  household_address: '',
  contact_address: '',
  email: '',
  emergency_name: '',
  emergency_phone: '',
  emergency_telphone: '',
  emergency_address: '',
  emergency_relation: '',
  employee_id: '',
  employee_status: '1',
  employee_title: '',
  is_active: '1',
  password: '',
  note: '',
})

export default {
  mounted() {
    console.log('staff mounted');

    //UI控制
    // 頁面一出現，就把游標自動指向這裡
    this.$refs.inputRef?.focus();
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
        name: '姓名',
        nationality: '國籍',
        idcard: '身分證字號',
        gender: '性別',
        birthday: '生日',
        phone: '手機',
        household_address: '戶籍地址',
        contact_address: '通訊地址',
        email: '電子信箱',
        emergency_name: '緊急聯絡人',
        emergency_phone: '緊急聯絡人手機',
        emergency_telphone: '緊急聯絡人電話',
        emergency_address: '緊急聯絡人地址',
        emergency_relation: '關係',
        employee_id: '員工編號',
        employee_status: '員工狀態',
        employee_title: '職稱',
        is_active: '帳號狀態',
        password: '密碼',
        note: '備註',
      },

      form: initialForm(),
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
      this.Clearform();
      this.isSignupMode = true;
    },

    async SetSignup() {
      try {
        const requiredFields = this.staffFields.filter((key) => key !== 'note')

        for (const field of requiredFields) {
          const value = this.form[field]
          if (value === null || value === undefined || value.toString().trim() === '') {
            alert(`請輸入${this.labels[field] || field}`)
            return
          }
        }

        const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (this.form.email && !emailRule.test(this.form.email)) {
          alert('Email 格式不正確');
          return
        }

        const idcardRule = /^[A-Z][12]\d{8}$/
        if (this.form.idcard && !idcardRule.test(this.form.idcard)) {
          alert('身分證字號格式不正確，例如 A123456789');
          return
        }

        const phoneRule = /^09\d{8}$/
        if (this.form.phone && !phoneRule.test(this.form.phone)) {
          alert('手機格式不正確，例如 09xxxxxxxx');
          return
        }

        const payload = Object.fromEntries(
          this.staffFields.map((key) => [key, this.form[key]])
        )

        const res = await axios.post('/api/staff', payload)

        alert(`註冊成功，員工資料編號: ${res.data.eid}`)
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

    Clearform() {
      this.form = initialForm()
    },

    pickLabels(keys) {
      return Object.fromEntries(
        keys
          .filter((key) => this.staffFields.includes(key))
          .map((key) => [key, this.labels[key]])
      )
    },

    employeeStatusText(status) {
      switch (Number(status)) {
        case 1: return '在職'
        case 2: return '離職'
        case 3: return '留職停薪'
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
    },
  },

  watch: {
    $route() {
      this.$nextTick(() => {
        this.$refs.inputRef?.focus();
      });
    },
  },

  computed: {
    staffFields() {
      return Object.keys(this.labels).filter((key) =>
        Object.prototype.hasOwnProperty.call(this.form, key)
      )
    },
    basicInfoLabels() {
      return this.pickLabels([
        'name',
        'nationality',
        'idcard',
        'gender',
        'birthday',
        'phone',
        'household_address',
        'contact_address',
        'email',
        'password',
      ])
    },
    emergencyContactLabels() {
      return this.pickLabels([
        'emergency_name',
        'emergency_phone',
        'emergency_telphone',
        'emergency_relation',
      ])
    },
    jobRelatedLabels() {
      return this.pickLabels([
        'employee_id',
        'employee_status',
        'employee_title',
        'is_active',
      ])
    },
    noteLabels() {
      return this.pickLabels(['note'])
    },
  },
}
</script>

<style scoped>
.login-form {
  display: inline-flex;
  flex-direction: column;
  gap: 8px;
}

.signup-form-container {
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.signup-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.form-section-card {
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
}

.signup-form h3 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #333;
  border-bottom: 1px solid #ccc;
  padding-bottom: 5px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-row {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  column-gap: 12px;
  align-items: center;
}

.form-row span {
  text-align: right;
}

.form-row input,
.form-row select,
.form-row textarea {
  width: 100%;
  box-sizing: border-box;
}

.radio-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.radio-row label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.radio-row input {
  width: auto;
}

.login-action {
  display: flex;
  align-items: center;
  gap: 12px;
  align-self: flex-end;
  margin-top: 6px;
}

.signup-action {
  justify-content: flex-end;
  margin-top: 16px;
}

.login-button {
  width: fit-content;
}

@media (max-width: 768px) {
  .signup-form {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
    row-gap: 4px;
  }

  .form-row span {
    text-align: left;
  }
}
</style>
