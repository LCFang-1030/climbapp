<template>
  <div class="staff-signup-page">
    <section class="page-header">
      <div>
        <p class="page-kicker">Staff Register</p>
        <h1>員工註冊</h1>
        <p class="page-description">
          建立員工帳號後，系統會自動產生員工編號，且初始密碼預設為員工編號。
        </p>
      </div>
      <div class="header-actions">
        <button type="button" class="secondary-button" @click="clearForm">
          清空表單
        </button>
        <button type="submit" class="primary-button" form="staff-signup-form">
          建立員工
        </button>
        <router-link class="back-to-login" to="/login">
          返回登入
        </router-link>
      </div>
    </section>

    <p v-if="errorMsg" class="error-box">{{ errorMsg }}</p>

    <section class="signup-shell">
      <form id="staff-signup-form" class="signup-form" @submit.prevent="setSignup">
        <section class="form-section-card">
          <h2>基本資料</h2>
          <div class="form-section">
            <div v-for="(label, key) in basicInfoLabels" :key="key" class="form-row">
              <span>{{ label }}</span>

              <div v-if="key === 'gender'" class="radio-row">
                <label><input type="radio" :value="1" v-model="form.gender"> 男</label>
                <label><input type="radio" :value="2" v-model="form.gender"> 女</label>
              </div>

              <input
                v-else-if="key === 'password'"
                type="text"
                value="註冊後預設為員工編號"
                readonly
              >

              <input v-else-if="key === 'birthday'" type="date" v-model="form[key]">
              <input v-else type="text" v-model.trim="form[key]">
            </div>
          </div>
        </section>

        <section class="form-section-card form-section-card--stacked">
          <h2>緊急聯絡人</h2>
          <div class="form-section">
            <div v-for="(label, key) in emergencyContactLabels" :key="key" class="form-row">
              <span>{{ label }}</span>
              <input type="text" v-model.trim="form[key]">
            </div>
          </div>

          <div class="section-divider"></div>

          <h2 class="subsection-title">職務資訊</h2>
          <div class="form-section form-section--compact">
            <div v-for="(label, key) in jobRelatedLabels" :key="key" class="form-row">
              <span>{{ label }}</span>

              <select v-if="key === 'employee_title'" v-model="form.employee_title">
                <option value="">請選擇職稱</option>
                <option value="管理人員">管理人員</option>
                <option value="一般人員">一般人員</option>
                <option value="教練">教練</option>
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

              <input v-else type="text" v-model.trim="form[key]">
            </div>
          </div>

          <div class="section-divider"></div>

          <h2 class="subsection-title">備註</h2>
          <div class="form-section form-section--compact">
            <div v-for="(label, key) in noteLabels" :key="key" class="form-row form-row--textarea">
              <span>{{ label }}</span>
              <textarea v-model.trim="form[key]" rows="3"></textarea>
            </div>
          </div>
        </section>
      </form>
    </section>
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
  data() {
    return {
      errorMsg: '',
      labels: {
        name: '姓名',
        alias: '暱稱',
        nationality: '國籍',
        idcard: '身分證字號',
        gender: '性別',
        birthday: '生日',
        phone: '手機',
        household_address: '戶籍地址',
        contact_address: '聯絡地址',
        email: 'Email',
        emergency_name: '緊急聯絡人姓名',
        emergency_phone: '緊急聯絡人手機',
        emergency_telphone: '緊急聯絡人電話',
        emergency_address: '緊急聯絡人地址',
        emergency_relation: '關係',
        employee_title: '員工職稱',
        employee_status: '員工狀態',
        is_active: '帳號狀態',
        password: '登入密碼',
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
  },
  methods: {
    async setSignup() {
      try {
        this.errorMsg = ''
        const requiredFields = this.staffFields.filter((key) => !['note', 'password'].includes(key))

        for (const field of requiredFields) {
          const value = this.form[field]
          if (value === null || value === undefined || value.toString().trim() === '') {
            this.errorMsg = `請填寫${this.labels[field] || field}`
            return
          }
        }

        const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (this.form.email && !emailRule.test(this.form.email)) {
          this.errorMsg = 'Email 格式不正確。'
          return
        }

        const idcardRule = /^[A-Z][12]\d{8}$/
        if (this.form.idcard && !idcardRule.test(this.form.idcard)) {
          this.errorMsg = '身分證字號格式不正確，範例為 A123456789。'
          return
        }

        const phoneRule = /^09\d{8}$/
        if (this.form.phone && !phoneRule.test(this.form.phone)) {
          this.errorMsg = '手機格式不正確，請輸入 09xxxxxxxx。'
          return
        }

        const payload = Object.fromEntries(
          this.staffFields
            .filter((key) => key !== 'password')
            .map((key) => [key, this.form[key]])
        )

        const res = await axios.post('/api/staff', payload)

        alert(`註冊成功，員工編號：${res.data.employee_id}`)
        this.clearForm()
        this.fetchStaff()
      } catch (error) {
        console.error('註冊員工失敗', error)
        this.errorMsg = error.response?.data || '註冊員工失敗'
      }
    },
    clearForm() {
      this.errorMsg = ''
      this.form = initialForm()
    },
    pickLabels(keys) {
      return Object.fromEntries(
        keys
          .filter((key) => this.staffFields.includes(key))
          .map((key) => [key, this.labels[key]])
      )
    },
    activeText(status) {
      const map = {
        1: '啟用',
        0: '停用',
      }
      return map[Number(status)] ?? status
    },
  },
}
</script>

<style scoped>
.staff-signup-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(135deg, #ffffff, #eef7ff);
  box-shadow: 0 24px 48px rgba(32, 52, 74, 0.08);
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.page-kicker {
  margin: 0 0 10px;
  color: #0f5ea8;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0 0 12px;
  font-size: clamp(30px, 4vw, 44px);
}

.page-description {
  margin: 0;
  color: #5f7388;
  line-height: 1.8;
}

.back-to-login {
  padding: 12px 16px;
  border-radius: 14px;
  background: #20344a;
  color: #fff;
  text-decoration: none;
  white-space: nowrap;
}

.error-box {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fff1f1;
  color: #c24343;
  border: 1px solid #f0c2c2;
}

.signup-shell {
  display: block;
}

.signup-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.form-section-card {
  padding: 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 24px 48px rgba(32, 52, 74, 0.08);
}

.form-section-card--stacked {
  display: flex;
  flex-direction: column;
}

.form-section-card h2 {
  margin: 0 0 14px;
}

.subsection-title {
  margin-top: 0;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-section--compact {
  gap: 10px;
}

.section-divider {
  height: 1px;
  margin: 18px 0;
  background: linear-gradient(90deg, rgba(15, 94, 168, 0.18), rgba(15, 94, 168, 0));
}

.form-row {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.form-row--textarea {
  align-items: start;
}

.form-row span {
  color: #405569;
  font-weight: 700;
}

.form-row input,
.form-row select,
.form-row textarea {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 1px solid #d6dde7;
  border-radius: 14px;
  background: #f8fbfe;
}

.form-row textarea {
  resize: vertical;
}

.radio-row {
  display: flex;
  gap: 18px;
}

.radio-row label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.radio-row input {
  width: auto;
  min-height: auto;
}


.primary-button,
.secondary-button {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  cursor: pointer;
}

.primary-button {
  border: 0;
  background: linear-gradient(135deg, #1f7ae0, #49b0ff);
  color: #fff;
  font-weight: 700;
}

.secondary-button {
  border: 1px solid #cfd8e3;
  background: #fff;
  color: #20344a;
}

@media (max-width: 760px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions > * {
    flex: 1 1 100%;
  }

  .signup-form {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
