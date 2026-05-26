<template>
  <div class="login-page">
    <section class="login-hero">
      <p class="login-kicker">Staff Portal</p>
      <h1>員工登入</h1>
      <p class="login-copy">
        使用員工編號與密碼登入系統。一般員工可使用首頁、入場、會員、交易、單品與活動頁面，
        管理人員則可進入所有功能頁。
      </p>
    </section>

    <section class="login-card">
      <header class="login-card-header">
        <h2>登入帳號</h2>
        <p>註冊後預設密碼為員工編號，可再於後續流程中調整。</p>
      </header>

      <form class="login-form" @submit.prevent="submitLogin">
        <label class="form-row">
          <span>員工</span>
          <select
            ref="employeeSelectRef"
            v-model="employeeId"
            :disabled="isSubmitting"
            :class="{ 'placeholder-selected': !employeeId }"
          >
            <option value="">請選擇員工帳號</option>
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
          <span>密碼</span>
          <input
            v-model.trim="password"
            :disabled="isSubmitting"
            type="password"
            placeholder="請輸入密碼"
          >
        </label>

        <p v-if="errorMsg" class="error-box">{{ errorMsg }}</p>

        <div class="login-actions">
          <router-link class="signup-link" to="/staff-signup">
            前往員工註冊
          </router-link>
          <button type="submit" class="login-button" :disabled="isSubmitting">
            {{ isSubmitting ? '登入中...' : '登入' }}
          </button>
        </div>
      </form>
    </section>

    <section class="staff-board-shell">
      <div class="staff-board-header">
        <div>
          <h2>現有員工</h2>
          <p>點選員工編號可查看詳細資料。</p>
        </div>
        <button type="button" class="login-button secondary-outline" @click="fetchStaff">
          重新整理
        </button>
      </div>

      <div class="staff-board-wrap">
        <table class="staff-board">
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
    </section>

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
import { normalizeAuthPayload, setStoredAuth } from '../utils/auth'

export default {
  data() {
    return {
      employeeId: '',
      password: '',
      staffList: [],
      selectedStaff: null,
      isDialogOpen: false,
      errorMsg: '',
      isSubmitting: false,
    }
  },
  computed: {
    selectedStaffDetails() {
      if (!this.selectedStaff) {
        return []
      }

      return Object.entries(this.selectedStaff)
    },
  },
  mounted() {
    this.fetchStaff()
    this.$nextTick(() => {
      this.$refs.employeeSelectRef?.focus()
    })
  },
  methods: {
    async fetchStaff() {
      try {
        const res = await axios.get('/api/staff')
        this.staffList = res.data
      } catch (error) {
        console.error('取得員工清單失敗', error)
        this.errorMsg = '取得員工清單失敗，請稍後再試。'
      }
    },
    async submitLogin() {
      if (!this.employeeId || !this.password) {
        this.errorMsg = '請選擇員工並輸入密碼。'
        return
      }

      this.errorMsg = ''
      this.isSubmitting = true

      try {
        const res = await axios.post('/api/staff/login', {
          employee_id: this.employeeId,
          password: this.password,
        })

        setStoredAuth(normalizeAuthPayload(res.data))

        const redirectTarget = this.$route.query.redirect || '/'
        this.$router.push(redirectTarget)
      } catch (error) {
        console.error('員工登入失敗', error)
        this.errorMsg = error.response?.data || '登入失敗，請確認帳號密碼。'
      } finally {
        this.isSubmitting = false
      }
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
      return title || ''
    },
    fieldLabel(key) {
      const labels = {
        eid: '系統流水號',
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
        employee_id: '員工編號',
        employee_status: '員工狀態',
        employee_title: '員工職稱',
        is_active: '帳號狀態',
        note: '備註',
        created_at: '建立時間',
        updated_at: '更新時間',
      }
      return labels[key] ?? key
    },
    formatValue(value, key = '') {
      if (value === null || value === undefined) {
        return ''
      }

      if (key === 'gender') {
        return Number(value) === 1 ? '男' : Number(value) === 2 ? '女' : value
      }

      if (key === 'employee_status') {
        return this.employeeStatusText(value)
      }

      if (key === 'is_active') {
        return Number(value) === 1 ? '啟用' : Number(value) === 0 ? '停用' : value
      }

      return value
    },
    async openStaffDialog(staff) {
      try {
        const res = await axios.get(`/api/staff/${staff.eid}`)
        this.selectedStaff = res.data
        this.isDialogOpen = true
      } catch (error) {
        console.error('取得員工詳細資料失敗', error)
        this.errorMsg = error.response?.data || '取得員工詳細資料失敗，請稍後再試。'
      }
    },
    closeStaffDialog() {
      this.isDialogOpen = false
      this.selectedStaff = null
    },
  },
}
</script>

<style scoped>
.login-page {
  min-height: calc(100vh - 64px);
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(340px, 460px);
  gap: 28px;
  align-items: center;
}

.login-hero {
  padding: 28px;
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(18, 104, 182, 0.92), rgba(74, 182, 255, 0.82)),
    linear-gradient(180deg, #165da7, #4eaaf0);
  color: #fff;
  box-shadow: 0 24px 48px rgba(16, 89, 158, 0.18);
}

.login-kicker {
  margin: 0 0 12px;
  opacity: 0.85;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.login-hero h1 {
  margin: 0 0 16px;
  font-size: clamp(32px, 4vw, 48px);
}

.login-copy {
  margin: 0;
  max-width: 520px;
  line-height: 1.8;
}

.login-card {
  padding: 28px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 24px 48px rgba(32, 52, 74, 0.12);
}

.login-card-header h2 {
  margin: 0 0 8px;
  font-size: 28px;
}

.login-card-header p {
  margin: 0;
  color: #5f7388;
  line-height: 1.7;
}

.login-form {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #20344a;
  font-weight: 600;
}

.form-row input,
.form-row select {
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid #d6dde7;
  border-radius: 14px;
  background: #f8fbfe;
}

.placeholder-selected {
  color: #6c7c8b;
}

.error-box {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fff1f1;
  color: #c24343;
  border: 1px solid #f0c2c2;
}

.login-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.signup-link {
  color: #0f5ea8;
  font-weight: 700;
  text-decoration: none;
}

.login-button {
  min-width: 132px;
  min-height: 48px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #1f7ae0, #49b0ff);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 18px 36px rgba(31, 122, 224, 0.22);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.secondary-outline {
  border: 1px solid #cfd8e3;
  background: #fff;
  color: #20344a;
  box-shadow: none;
}

.staff-board-shell {
  grid-column: 1 / -1;
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 24px 48px rgba(32, 52, 74, 0.12);
}

.staff-board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.staff-board-header h2 {
  margin: 0;
}

.staff-board-header p {
  margin: 6px 0 0;
  color: #5f7388;
}

.staff-board-wrap {
  overflow-x: auto;
}

.staff-board {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
}

.staff-board th,
.staff-board td {
  padding: 12px 14px;
  border-bottom: 1px solid #e7edf3;
  text-align: left;
}

.staff-board th {
  color: #5f7388;
  font-size: 14px;
}

.staff-code-button {
  border: 0;
  padding: 0;
  background: none;
  color: #0f5ea8;
  cursor: pointer;
  font-weight: 700;
}

.staff-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(10, 28, 44, 0.35);
}

.staff-dialog {
  position: fixed;
  top: 0;
  right: 0;
  width: min(440px, 92vw);
  height: 100vh;
  box-sizing: border-box;
  overflow-y: auto;
  padding: 22px;
  background: #fff;
  box-shadow: -12px 0 28px rgba(32, 52, 74, 0.16);
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
  width: 34px;
  height: 34px;
  border: 1px solid #cfd8e3;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}

.staff-detail-list {
  display: grid;
  grid-template-columns: 130px 1fr;
  margin: 0;
  border: 1px solid #e7edf3;
  border-bottom: 0;
}

.staff-detail-list dt,
.staff-detail-list dd {
  margin: 0;
  padding: 10px 12px;
  border-bottom: 1px solid #e7edf3;
}

.staff-detail-list dt {
  background: #f7fbff;
  color: #405569;
  font-weight: 700;
}

.staff-detail-list dd {
  word-break: break-word;
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .login-page,
  .login-hero,
  .login-card {
    padding: 0;
  }

  .login-hero,
  .login-card {
    padding: 22px;
    border-radius: 20px;
  }

  .login-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .staff-board-header {
    flex-direction: column;
    align-items: stretch;
  }

  .login-button {
    width: 100%;
  }
}
</style>
