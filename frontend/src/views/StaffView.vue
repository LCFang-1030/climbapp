<template>
  <div class="staff">
    <div v-if="errorMsg" class="error-box">
      ⚠ {{ errorMsg }}
    </div>

    <h1>{{ isSignupMode ? '員工註冊' : '員工登入' }}</h1>

    <div v-if="!isSignupMode" class="login-form">
      <label class="form-row">
        <span>username:</span>
        <select
          ref="inputRef"
          v-model="username"
          :class="{ 'placeholder-selected': !username }"
        >
          <option value="">請選擇員工</option>
          <option
            v-for="staff in staffList"
            :key="staff.eid"
            :value="staff.employee_id"
          >
            {{ staff.alias }} ({{ staff.employee_id }})
          </option>
        </select>
      </label>

      <label class="form-row">
        <span>password:</span>
        <input type="password" v-model.trim="password" />
      </label>

      <div class="login-action">
        <button class="login-button" @click="GotoSignup()">Sign up</button>
        <button class="login-button" @click="Setlogin()">Login</button>
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
              <select v-if="key === 'employee_title'" v-model="form.employee_title">
                <option value="">請選擇職稱</option>
                <option value="S">管理人員 (S)</option>
                <option value="O">行政人員 (O)</option>
                <option value="L">定線員 (L)</option>
              </select>
              <select v-else-if="key === 'employee_status'" v-model="form.employee_status">
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
        <button class="login-button" @click="BackToLogin()">返回</button>
        <button class="login-button" @click="SetSignup()">Set Signup</button>
      </div>
    </div>

    <div v-if="!isSignupMode">
      <h4>datetime: {{ datetime }}</h4>

      <table border="1" class="staff-board">
        <thead>
          <tr>
            <th>員工編號</th>
            <th>姓名</th>
            <th>暱稱</th>
            <th>員工職稱</th>
            <th>員工狀態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="staff in staffList" :key="staff.eid">
            <td>
              <button
                type="button"
                class="staff-code-button"
                @click="openStaffDialog(staff)"
              >
                {{ staff.employee_id }}
              </button>
            </td>
            <td>{{ staff.name }}</td>
            <td>{{ staff.alias }}</td>
            <td>{{ employeeTitleText(staff.employee_title) }}</td>
            <td>{{ employeeStatusText(staff.employee_status) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="isDialogOpen"
      class="staff-dialog-overlay"
      @click.self="closeStaffDialog"
    >
      <aside class="staff-dialog" aria-label="員工詳細資料">
        <div class="staff-dialog-header">
          <h2>員工詳細資料</h2>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉員工詳細資料"
            @click="closeStaffDialog"
          >
            X
          </button>
        </div>

        <dl v-if="selectedStaff" class="staff-detail-list">
          <template v-for="[key, value] in selectedStaffDetails" :key="key">
            <dt>{{ fieldLabel(key) }}</dt>
            <dd>{{ formatValue(value, key) }}</dd>
          </template>
        </dl>
      </aside>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const initialForm = () => ({
  name: '',
  alias: '',
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
  employee_title: '',
  employee_status: '1',
  is_active: '1',
  password: '',
  note: '',
})

export default {
  mounted() {
    this.$refs.inputRef?.focus()
    this.fetchStaff()
  },

  data() {
    return {
      x: this.$route.query.x,
      errorMsg: '',
      username: '',
      password: '',
      islogin: false,
      isSignupMode: false,
      datetime: '',
      staffList: [],
      selectedStaff: null,
      isDialogOpen: false,

      labels: {
        name: '姓名',
        alias: '暱稱',
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
        employee_title: '員工職稱',
        employee_status: '員工狀態',
        is_active: '帳號狀態',
        password: '密碼',
        note: '備註',
      },

      form: initialForm(),
    }
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
        'alias',
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
        'emergency_address',
        'emergency_relation',
      ])
    },

    jobRelatedLabels() {
      return this.pickLabels([
        'employee_title',
        'employee_status',
        'is_active',
      ])
    },

    noteLabels() {
      return this.pickLabels(['note'])
    },

    selectedStaffDetails() {
      if (!this.selectedStaff) {
        return []
      }

      return Object.entries(this.selectedStaff)
    },
  },

  methods: {
    Setlogin() {
      if (!this.username) {
        this.errorMsg = '請先選擇員工'
        return
      }

      this.errorMsg = ''
      localStorage.setItem('islogin', 'true')
      this.datetime = new Date().toLocaleString('zh-TW', { hour12: false })

      setTimeout(() => {
        this.$router.push('/entry')
      }, 500)
    },

    GotoSignup() {
      this.errorMsg = ''
      this.Clearform()
      this.isSignupMode = true
    },

    BackToLogin() {
      this.errorMsg = ''
      this.isSignupMode = false
    },

    async SetSignup() {
      try {
        this.errorMsg = ''
        const requiredFields = this.staffFields.filter((key) => key !== 'note')

        for (const field of requiredFields) {
          const value = this.form[field]
          if (value === null || value === undefined || value.toString().trim() === '') {
            this.errorMsg = `請輸入${this.labels[field] || field}`
            return
          }
        }

        const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (this.form.email && !emailRule.test(this.form.email)) {
          this.errorMsg = 'Email 格式不正確'
          return
        }

        const idcardRule = /^[A-Z][12]\d{8}$/
        if (this.form.idcard && !idcardRule.test(this.form.idcard)) {
          this.errorMsg = '身分證字號格式不正確，例如 A123456789'
          return
        }

        const phoneRule = /^09\d{8}$/
        if (this.form.phone && !phoneRule.test(this.form.phone)) {
          this.errorMsg = '手機格式不正確，例如 09xxxxxxxx'
          return
        }

        const payload = Object.fromEntries(
          this.staffFields.map((key) => [key, this.form[key]])
        )

        const res = await axios.post('/api/staff', payload)

        this.errorMsg = ''
        alert(`註冊成功，員工編號: ${res.data.employee_id}`)
        this.Clearform()
        this.isSignupMode = false
        this.fetchStaff()
      } catch (err) {
        console.error('註冊員工失敗', err)
        this.errorMsg = err.response?.data || '註冊員工失敗'
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
      const map = {
        1: '在職',
        2: '離職',
        3: '留職停薪',
      }
      return map[Number(status)] ?? '未知'
    },

    employeeTitleText(title) {
      const map = {
        S: '管理人員 (S)',
        O: '行政人員 (O)',
        L: '定線員 (L)',
      }
      return map[title] ?? title
    },

    activeText(status) {
      const map = {
        1: '啟用',
        0: '停用',
      }
      return map[Number(status)] ?? status
    },

    fieldLabel(key) {
      const extraLabels = {
        eid: '流水號',
        employee_id: '員工編號',
        created_at: '建立時間',
        updated_at: '更新時間',
      }
      return extraLabels[key] ?? this.labels[key] ?? key
    },

    formatValue(value, key = '') {
      if (value === null || value === undefined) {
        return ''
      }

      if (key === 'eid') {
        return String(value).padStart(4, '0')
      }

      if (key === 'gender') {
        const genderText = {
          1: '男',
          2: '女',
        }
        return genderText[Number(value)] ?? value
      }

      if (key === 'employee_status') {
        return this.employeeStatusText(value)
      }

      if (key === 'employee_title') {
        return this.employeeTitleText(value)
      }

      if (key === 'is_active') {
        return this.activeText(value)
      }

      return value
    },

    async fetchStaff() {
      try {
        const res = await axios.get('/api/staff')
        this.staffList = res.data
      } catch (err) {
        console.error('取得員工資料失敗', err)
        this.errorMsg = '取得員工資料失敗'
      }
    },

    async openStaffDialog(staff) {
      try {
        const res = await axios.get(`/api/staff/${staff.eid}`)
        this.selectedStaff = res.data
        this.isDialogOpen = true
      } catch (err) {
        console.error('取得員工詳細資料失敗', err)
        this.errorMsg = err.response?.data || '取得員工詳細資料失敗'
      }
    },

    closeStaffDialog() {
      this.isDialogOpen = false
      this.selectedStaff = null
    },
  },

  watch: {
    username(newValue) {
      if (newValue) {
        this.errorMsg = ''
      }
    },

    $route() {
      this.$nextTick(() => {
        this.$refs.inputRef?.focus()
      })
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

.error-box {
  background: #ffe5e5;
  color: #d10000;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ffb3b3;
  border-radius: 6px;
  font-weight: bold;
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

.placeholder-selected {
  color: #808080;
}

.placeholder-selected option {
  color: #111;
}

.placeholder-selected option[value=""] {
  color: #808080;
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

.staff-board {
  border-collapse: collapse;
  min-width: 560px;
}

.staff-board th,
.staff-board td {
  padding: 8px 12px;
  text-align: left;
}

.staff-board th {
  background: #f2f2f2;
}

.staff-code-button {
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #1565c0;
  cursor: pointer;
  font: inherit;
  padding: 4px 6px;
  text-decoration: underline;
}

.staff-code-button:hover,
.staff-code-button:focus {
  background: #e3f2fd;
  outline: 2px solid #1565c0;
  outline-offset: 2px;
}

.staff-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: rgba(0, 0, 0, 0.35);
}

.staff-dialog {
  position: fixed;
  top: 0;
  right: 0;
  width: min(420px, 90vw);
  height: 100vh;
  box-sizing: border-box;
  overflow-y: auto;
  background: #fff;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
  padding: 20px;
  animation: slide-in-from-right 0.25s ease;
}

.staff-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.staff-dialog-header h2 {
  margin: 0;
}

.dialog-close-button {
  width: 32px;
  height: 32px;
  border: 1px solid #bbb;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.dialog-close-button:hover,
.dialog-close-button:focus {
  background: #f2f2f2;
  outline: 2px solid #555;
  outline-offset: 2px;
}

.staff-detail-list {
  display: grid;
  grid-template-columns: 140px 1fr;
  border-top: 1px solid #cfcfcf;
  border-left: 1px solid #cfcfcf;
  margin: 0;
}

.staff-detail-list dt {
  background: #f2f2f2;
  color: #555;
  font-weight: 700;
  margin: 0;
}

.staff-detail-list dd {
  margin: 0;
  word-break: break-word;
}

.staff-detail-list dt,
.staff-detail-list dd {
  border-right: 1px solid #cfcfcf;
  border-bottom: 1px solid #cfcfcf;
  padding: 10px 12px;
}

@keyframes slide-in-from-right {
  from {
    transform: translateX(100%);
  }

  to {
    transform: translateX(0);
  }
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
