<template>
  <div class="member">
    <h1>Member Board</h1>

    <p v-if="isLoading">讀取會員資料中...</p>
    <p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <div v-else-if="members.length" class="member-board-list">
      <section class="member-section">
        <h2>男性會員</h2>
        <table v-if="maleMembers.length" border="1" class="member-board">
          <thead>
            <tr>
              <th>會員編號</th>
              <th>姓名</th>
              <th>長期票</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in maleMembers" :key="memberKey(member)">
              <td>
                <button
                  type="button"
                  class="member-code-button"
                  @click="openMemberDialog(member)"
                >
                  {{ member.member_code }}
                </button>
              </td>
              <td>{{ member.name }}</td>
              <td>{{ passText(member.pass_type) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else>目前沒有男性會員資料</p>
      </section>

      <section class="member-section">
        <h2>女性會員</h2>
        <table v-if="femaleMembers.length" border="1" class="member-board">
          <thead>
            <tr>
              <th>會員編號</th>
              <th>姓名</th>
              <th>長期票</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in femaleMembers" :key="memberKey(member)">
              <td>
                <button
                  type="button"
                  class="member-code-button"
                  @click="openMemberDialog(member)"
                >
                  {{ member.member_code }}
                </button>
              </td>
              <td>{{ member.name }}</td>
              <td>{{ passText(member.pass_type) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else>目前沒有女性會員資料</p>
      </section>

      <section class="member-section">
        <h2>其他會員</h2>
        <table v-if="othersMembers.length" border="1" class="member-board">
          <thead>
            <tr>
              <th>會員編號</th>
              <th>姓名</th>
              <th>長期票</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in othersMembers" :key="memberKey(member)">
              <td>
                <button
                  type="button"
                  class="member-code-button"
                  @click="openMemberDialog(member)"
                >
                  {{ member.member_code }}
                </button>
              </td>
              <td>{{ member.name }}</td>
              <td>{{ passText(member.pass_type) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else>目前沒有其他會員資料</p>
      </section>
    </div>

    <p v-else>目前沒有會員資料</p>

    <div
      v-if="isDialogOpen"
      class="member-dialog-overlay"
      @click.self="closeMemberDialog"
    >
      <aside class="member-dialog" aria-label="會員詳細資料">
        <div class="member-dialog-header">
          <h2>會員詳細資料</h2>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉會員詳細資料"
            @click="closeMemberDialog"
          >
            X
          </button>
        </div>

        <dl v-if="selectedMember" class="member-detail-list">
          <template v-for="[key, value] in selectedMemberDetails" :key="key">
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

export default {
  mounted() {
    this.fetchMembers()
  },

  data() {
    return {
      members: [],
      isLoading: false,
      errorMessage: '',
      selectedMember: null,
      isDialogOpen: false,
    }
  },

  computed: {
    maleMembers() {
      return this.members.filter((member) => Number(member.gender) === 1)
    },

    femaleMembers() {
      return this.members.filter((member) => Number(member.gender) === 2)
    },

    othersMembers() {
      return this.members.filter((member) => Number(member.gender) === 3)
    },

    selectedMemberDetails() {
      if (!this.selectedMember) {
        return []
      }

      return Object.entries(this.selectedMember).filter(([key]) => key !== 'pass_type')
    },
  },

  methods: {
    async fetchMembers() {
      this.isLoading = true
      this.errorMessage = ''

      try {
        const res = await axios.get('/api/members')
        this.members = res.data
      } catch (err) {
        console.error('取得 members 失敗', err)
        this.errorMessage = '取得會員資料失敗'
      } finally {
        this.isLoading = false
      }
    },

    memberKey(member) {
      return member.id ?? member.mid ?? member.member_id ?? JSON.stringify(member)
    },

    openMemberDialog(member) {
      this.selectedMember = member
      this.isDialogOpen = true
    },

    closeMemberDialog() {
      this.isDialogOpen = false
      this.selectedMember = null
    },

    fieldLabel(key) {
      const labels = {
        member_id: '會員序號',
        member_code: '會員編號',
        name: '姓名',
        nationality: '國籍',
        idcard: '身分證字號',
        phone: '電話',
        birthday: '生日',
        gender: '性別',
        contact_address: '通訊住址',
        email: '電子信箱',
        emergency_name: '緊急聯絡人',
        emergency_phone: '緊急聯絡人電話',
        emergency_address: '緊急聯絡人住址',
        emergency_relation: '關係',
        line_user_id: 'Line',
        is_active: '狀態',
        note: '備註',
        created_at: '建立時間',
        updated_at: '更新時間',
      }

      return labels[key] ?? key
    },

    passText(passType) {
      const passLabels = {
        0: 'NONE',
        single: 'NONE',
        1: '月票',
        monthly: '月票',
        2: '季票',
        quarterly: '季票',
        3: '半年票',
        half_year: '半年票',
        4: '年票',
        yearly: '年票',
      }

      return passLabels[passType] ?? passType ?? 'NONE'
    },

    formatValue(value, key = '') {
      if (value === null || value === undefined) {
        return ''
      }

      if (key === 'member_id') {
        return String(value).padStart(6, '0')
      }

      if (key === 'gender') {
        const genderText = {
          1: '男性',
          2: '女性',
          3: '其他',
        }

        return genderText[Number(value)] ?? value
      }

      if (key === 'is_active') {
        const statusText = {
          1: '已啟用',
          2: '已停用',
        }

        return statusText[Number(value)] ?? value
      }

      return value
    },
  },
}
</script>

<style scoped>
.member-board-list {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.member-section h2 {
  margin-bottom: 10px;
}

.member-board {
  border-collapse: collapse;
  min-width: 480px;
}

.member-board th,
.member-board td {
  padding: 8px 12px;
  text-align: left;
}

.member-board th {
  background: #f2f2f2;
}

.member-code-button {
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #1565c0;
  cursor: pointer;
  font: inherit;
  padding: 4px 6px;
  text-decoration: underline;
}

.member-code-button:hover,
.member-code-button:focus {
  background: #e3f2fd;
  outline: 2px solid #1565c0;
  outline-offset: 2px;
}

.member-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: rgba(0, 0, 0, 0.35);
}

.member-dialog {
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

.member-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.member-dialog-header h2 {
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

.member-detail-list {
  display: grid;
  grid-template-columns: 140px 1fr;
  border-top: 1px solid #cfcfcf;
  border-left: 1px solid #cfcfcf;
  margin: 0;
}

.member-detail-list dt {
  background: #f2f2f2;
  color: #555;
  font-weight: 700;
  margin: 0;
}

.member-detail-list dd {
  margin: 0;
  word-break: break-word;
}

.member-detail-list dt,
.member-detail-list dd {
  border-right: 1px solid #cfcfcf;
  border-bottom: 1px solid #cfcfcf;
  padding: 10px 12px;
}

.error-message {
  color: #c62828;
}

@keyframes slide-in-from-right {
  from {
    transform: translateX(100%);
  }

  to {
    transform: translateX(0);
  }
}
</style>
