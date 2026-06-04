<template>
  <div class="member-page">
    <section class="member-hero">
      <div>
        <p class="member-eyebrow">Member Search</p>
        <h1>會員查詢</h1>
        <p class="member-description">
          透過手機號碼、會員編號、姓名、性別、票券資訊與註冊日期快速篩選會員，
          並可點選會員編號開啟完整會員資料。
        </p>
      </div>
      <div class="member-clock-card">
        <span class="member-clock-label">目前時間</span>
        <strong>{{ datetime }}</strong>
      </div>
    </section>

    <section class="search-card">
      <div class="search-grid">
        <label class="search-field">
          <span>手機號碼</span>
          <input
            v-model.trim="filters.phone"
            type="text"
            inputmode="numeric"
            placeholder="請輸入手機號碼"
            @keyup.enter="submitSearch"
          />
        </label>

        <label class="search-field">
          <span>會員編號</span>
          <input
            v-model.trim="filters.memberCode"
            type="text"
            placeholder="請輸入會員編號"
            @keyup.enter="submitSearch"
          />
        </label>

        <label class="search-field">
          <span>姓名</span>
          <input
            v-model.trim="filters.name"
            type="text"
            placeholder="請輸入姓名"
            @keyup.enter="submitSearch"
          />
        </label>

        <label class="search-field">
          <span>性別</span>
          <select v-model="filters.gender">
            <option value="">請選擇性別</option>
            <option :value="allOption">全部</option>
            <option value="1">男性</option>
            <option value="2">女性</option>
            <option value="3">其他</option>
          </select>
        </label>

        <label class="search-field">
          <span>票券資訊</span>
          <select v-model="filters.passType">
            <option value="">請選擇票券資訊</option>
            <option :value="allOption">全部</option>
            <option value="單次票券">單次票券</option>
            <option value="月票">月票</option>
            <option value="季票">季票</option>
            <option value="半年票">半年票</option>
            <option value="年票">年票</option>
          </select>
        </label>

        <label class="search-field">
          <span>註冊日期</span>
          <input v-model="filters.startDate" type="date" />
        </label>

        <label class="search-field">
          <span>至</span>
          <input v-model="filters.endDate" type="date" />
        </label>
      </div>

      <div class="search-actions">
        <div class="search-hint">
          性別與票券資訊未選擇時只作為提示；若選擇「全部」，會作為有效搜尋條件並列出全部結果。
        </div>
        <div class="search-button-group">
          <button
            type="button"
            class="primary-button"
            :disabled="isLoadingMembers"
            @click="submitSearch"
          >
            {{ isLoadingMembers ? '搜尋中...' : '搜尋' }}
          </button>
          <button
            type="button"
            class="secondary-button"
            :disabled="isLoadingMembers"
            @click="resetFilters"
          >
            重設
          </button>
        </div>
      </div>

      <p v-if="searchMessage" class="search-message" :class="searchMessageClass">
        {{ searchMessage }}
      </p>
    </section>

    <section class="results-card">
      <div class="results-header">
        <div>
          <p class="results-tag">Results</p>
          <h2>會員列表</h2>
        </div>
        <p class="results-count">共 {{ filteredMembers.length }} 筆</p>
      </div>

      <div class="results-table-shell">
        <table class="results-table">
          <thead>
            <tr>
              <th>成立時間</th>
              <th>會員編號</th>
              <th>手機號碼</th>
              <th>姓名</th>
              <th>性別</th>
              <th>票券資訊</th>
            </tr>
          </thead>
          <tbody v-if="filteredMembers.length">
            <tr v-for="member in filteredMembers" :key="memberKey(member)">
              <td>{{ formatDateTime(member.created_at) }}</td>
              <td>
                <button
                  type="button"
                  class="member-link-button"
                  @click="openMemberDialog(member)"
                >
                  {{ member.member_code || '-' }}
                </button>
              </td>
              <td>{{ member.phone || '-' }}</td>
              <td>{{ member.name || '-' }}</td>
              <td>{{ genderText(member.gender) }}</td>
              <td>{{ passText(member.pass_type) }}</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="6" class="results-empty-cell">
                <span v-if="!hasSearched && !isLoadingMembers">請輸入搜尋條件後查詢會員資料。</span>
                <span v-else-if="isLoadingMembers">正在載入會員資料...</span>
                <span v-else class="results-empty-highlight">查無符合條件的會員資料。</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div
      v-if="isDialogOpen"
      class="member-dialog-overlay"
      @click.self="closeMemberDialog"
    >
      <aside class="member-dialog" aria-label="會員詳細資料">
        <div class="member-dialog-header">
          <div>
            <p class="results-tag">Member Detail</p>
            <h2>會員詳細資料</h2>
          </div>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉會員詳細資料"
            @click="closeMemberDialog"
          >
            ×
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

const ALL_OPTION = '__all__'

const createFilters = () => ({
  memberCode: '',
  phone: '',
  name: '',
  gender: '',
  passType: '',
  startDate: '',
  endDate: '',
})

const normalizeText = (value) => String(value ?? '').trim().toLowerCase()
const normalizeDigits = (value) => String(value ?? '').replace(/\D/g, '')

export default {
  beforeCreate() {
    if (!localStorage.getItem('islogin')) {
      this.$router.push('/staff')
    }
  },

  async mounted() {
    this.updateCurrentDateTime()
    this.clockTimer = window.setInterval(this.updateCurrentDateTime, 1000)
    await this.preloadSearchData()
  },

  beforeUnmount() {
    if (this.clockTimer) {
      window.clearInterval(this.clockTimer)
    }
  },

  data() {
    return {
      datetime: '',
      clockTimer: null,
      allOption: ALL_OPTION,
      filters: createFilters(),
      appliedFilters: createFilters(),
      members: [],
      memberVisits: [],
      hasLoadedMembers: false,
      hasSearched: false,
      isLoadingMembers: false,
      searchMessage: '',
      searchMessageType: '',
      selectedMember: null,
      isDialogOpen: false,
    }
  },

  computed: {
    filteredMembers() {
      if (!this.hasSearched) {
        return []
      }

      return this.members.filter((member) => this.matchesFilters(member))
    },

    hasAnyFilter() {
      return Boolean(
        this.filters.memberCode
        || this.filters.phone
        || this.filters.name
        || this.filters.gender
        || this.filters.passType
        || this.filters.startDate
        || this.filters.endDate
      )
    },

    memberVisitsByMemberId() {
      return this.memberVisits.reduce((map, visit) => {
        const memberId = Number(visit.member_id)
        if (!map[memberId]) {
          map[memberId] = []
        }

        map[memberId].push(visit)
        return map
      }, {})
    },

    selectedMemberDetails() {
      if (!this.selectedMember) {
        return []
      }

      const memberVisitCount = this.memberVisitsByMemberId[Number(this.selectedMember.member_id)]?.length ?? 0

      return [
        ['created_at', this.selectedMember.created_at],
        ['member_id', this.selectedMember.member_id],
        ['member_code', this.selectedMember.member_code],
        ['name', this.selectedMember.name],
        ['phone', this.selectedMember.phone],
        ['gender', this.selectedMember.gender],
        ['pass_type', this.selectedMember.pass_type],
        ['nationality', this.selectedMember.nationality],
        ['idcard', this.selectedMember.idcard],
        ['birthday', this.selectedMember.birthday],
        ['contact_address', this.selectedMember.contact_address],
        ['email', this.selectedMember.email],
        ['emergency_name', this.selectedMember.emergency_name],
        ['emergency_phone', this.selectedMember.emergency_phone],
        ['emergency_address', this.selectedMember.emergency_address],
        ['emergency_relation', this.selectedMember.emergency_relation],
        ['line_user_id', this.selectedMember.line_user_id],
        ['is_active', this.selectedMember.is_active],
        ['note', this.selectedMember.note],
        ['visit_count', memberVisitCount],
        ['updated_at', this.selectedMember.updated_at],
      ].filter(([, value]) => value !== undefined)
    },

    searchMessageClass() {
      return this.searchMessageType === 'error' ? 'is-error' : 'is-info'
    },
  },

  methods: {
    updateCurrentDateTime() {
      this.datetime = new Date().toLocaleString('zh-TW', { hour12: false })
    },

    async preloadSearchData() {
      if (this.hasLoadedMembers || this.isLoadingMembers) {
        return
      }

      this.isLoadingMembers = true
      this.searchMessage = ''
      this.searchMessageType = ''

      try {
        await Promise.all([this.fetchMembers(), this.fetchAllVisits()])
        this.hasLoadedMembers = true
      } catch (err) {
        console.error('取得會員查詢資料失敗', err)
        this.searchMessage = '取得會員查詢資料失敗'
        this.searchMessageType = 'error'
      } finally {
        this.isLoadingMembers = false
      }
    },

    async fetchMembers() {
      const res = await axios.get('/api/members')
      this.members = Array.isArray(res.data) ? res.data : []
    },

    async fetchAllVisits() {
      const res = await axios.get('/api/member_visits?scope=all')
      this.memberVisits = Array.isArray(res.data) ? res.data : []
    },

    async submitSearch() {
      this.searchMessage = ''
      this.searchMessageType = ''

      if (!this.hasAnyFilter) {
        this.hasSearched = false
        this.appliedFilters = createFilters()
        this.searchMessage = '請至少輸入或選擇一個搜尋條件。'
        this.searchMessageType = 'error'
        return
      }

      if (this.filters.startDate && this.filters.endDate && this.filters.startDate > this.filters.endDate) {
        this.hasSearched = false
        this.searchMessage = '註冊開始日期不可晚於結束日期。'
        this.searchMessageType = 'error'
        return
      }

      try {
        await this.preloadSearchData()
        this.appliedFilters = { ...this.filters }
        this.hasSearched = true
      } catch (err) {
        console.error('會員搜尋失敗', err)
        this.searchMessage = '會員搜尋失敗'
        this.searchMessageType = 'error'
      }
    },

    resetFilters() {
      this.filters = createFilters()
      this.appliedFilters = createFilters()
      this.hasSearched = false
      this.searchMessage = ''
      this.searchMessageType = ''
      this.closeMemberDialog()
    },

    matchesFilters(member) {
      if (this.appliedFilters.memberCode) {
        const keyword = normalizeText(this.appliedFilters.memberCode)
        if (!normalizeText(member.member_code).includes(keyword)) {
          return false
        }
      }

      if (this.appliedFilters.phone) {
        const keyword = normalizeDigits(this.appliedFilters.phone)
        if (!normalizeDigits(member.phone).includes(keyword)) {
          return false
        }
      }

      if (this.appliedFilters.name) {
        const keyword = normalizeText(this.appliedFilters.name)
        if (!normalizeText(member.name).includes(keyword)) {
          return false
        }
      }

      if (
        this.appliedFilters.gender
        && this.appliedFilters.gender !== this.allOption
        && String(member.gender) !== String(this.appliedFilters.gender)
      ) {
        return false
      }

      if (this.appliedFilters.passType) {
        const memberPassType = this.normalizePassType(member.pass_type)
        if (
          this.appliedFilters.passType !== this.allOption
          && memberPassType !== this.appliedFilters.passType
        ) {
          return false
        }
      }

      if (!this.matchesCreatedDateRange(member.created_at)) {
        return false
      }

      return true
    },

    matchesCreatedDateRange(value) {
      if (!this.appliedFilters.startDate && !this.appliedFilters.endDate) {
        return true
      }

      const createdDate = new Date(value)
      if (Number.isNaN(createdDate.getTime())) {
        return false
      }

      if (this.appliedFilters.startDate) {
        const startDate = new Date(`${this.appliedFilters.startDate}T00:00:00`)
        if (createdDate < startDate) {
          return false
        }
      }

      if (this.appliedFilters.endDate) {
        const endDate = new Date(`${this.appliedFilters.endDate}T23:59:59`)
        if (createdDate > endDate) {
          return false
        }
      }

      return true
    },

    normalizePassType(value) {
      const passTypeMap = {
        單次票券: '單次票券',
        月票: '月票',
        季票: '季票',
        半年票: '半年票',
        年票: '年票',
      }

      return passTypeMap[value] ?? String(value ?? '單次票券')
    },

    memberKey(member) {
      return member.member_id ?? member.id ?? member.mid ?? member.member_code ?? JSON.stringify(member)
    },

    openMemberDialog(member) {
      this.selectedMember = member
      this.isDialogOpen = true
    },

    closeMemberDialog() {
      this.isDialogOpen = false
      this.selectedMember = null
    },

    genderText(value) {
      const labels = {
        1: '男性',
        2: '女性',
        3: '其他',
      }

      return labels[Number(value)] ?? '-'
    },

    passText(passType) {
      const passLabels = {
        單次票券: '單次票券',
        月票: '月票',
        季票: '季票',
        半年票: '半年票',
        年票: '年票',
      }

      return passLabels[passType] ?? passType ?? '單次票券'
    },

    fieldLabel(key) {
      const labels = {
        created_at: '成立時間',
        member_id: '會員 ID',
        member_code: '會員編號',
        name: '姓名',
        nationality: '國籍',
        idcard: '身分證字號',
        phone: '手機號碼',
        birthday: '生日',
        gender: '性別',
        contact_address: '聯絡地址',
        email: '電子郵件',
        emergency_name: '緊急聯絡人',
        emergency_phone: '緊急聯絡人手機',
        emergency_address: '緊急聯絡人地址',
        emergency_relation: '關係',
        line_user_id: 'Line ID',
        is_active: '狀態',
        note: '備註',
        pass_type: '票券資訊',
        visit_count: '入場次數',
        updated_at: '更新時間',
      }

      return labels[key] ?? key
    },

    formatDateTime(value) {
      if (!value) {
        return '-'
      }

      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return value
      }

      return date.toLocaleString('zh-TW', { hour12: false })
    },

    formatDate(value) {
      if (!value) {
        return '-'
      }

      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return value
      }

      return date.toLocaleDateString('zh-TW')
    },

    formatValue(value, key = '') {
      if (value === null || value === undefined || value === '') {
        return '-'
      }

      if (key === 'member_id') {
        return String(value).padStart(6, '0')
      }

      if (key === 'gender') {
        return this.genderText(value)
      }

      if (key === 'pass_type') {
        return this.passText(value)
      }

      if (key === 'is_active') {
        return Number(value) === 1 ? '啟用' : '停用'
      }

      if (key === 'birthday') {
        return this.formatDate(value)
      }

      if (key === 'created_at' || key === 'updated_at') {
        return this.formatDateTime(value)
      }

      return value
    },
  },
}
</script>

<style scoped>
.member-page {
  --page-bg: linear-gradient(180deg, #f7f3ea 0%, #fcfaf5 100%);
  --panel-bg: rgba(255, 255, 255, 0.94);
  --panel-border: rgba(107, 83, 49, 0.16);
  --text-main: #302518;
  --text-soft: #7a6a57;
  --accent: #9c6b2f;
  --accent-strong: #7f531c;
  --highlight: #d9a441;
  --shadow-soft: 0 18px 42px rgba(73, 49, 21, 0.12);
  --error: #b13d34;
  margin: 0 auto;
  min-height: 100%;
  max-width: 1480px;
  padding: 32px 24px 40px;
  color: var(--text-main);
  background:
    radial-gradient(circle at top right, rgba(217, 164, 65, 0.12), transparent 22%),
    radial-gradient(circle at left center, rgba(156, 107, 47, 0.08), transparent 28%),
    var(--page-bg);
}

.member-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.member-eyebrow,
.results-tag {
  margin: 0 0 8px;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.member-hero h1,
.results-header h2,
.member-dialog-header h2 {
  margin: 0;
}

.member-description {
  max-width: 760px;
  margin: 12px 0 0;
  color: var(--text-soft);
  line-height: 1.7;
}

.member-clock-card,
.search-card,
.results-card,
.member-dialog {
  border: 1px solid var(--panel-border);
  border-radius: 24px;
  background: var(--panel-bg);
  box-shadow: var(--shadow-soft);
}

.member-clock-card {
  min-width: 220px;
  padding: 18px 20px;
}

.member-clock-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-soft);
  font-size: 13px;
}

.search-card,
.results-card {
  padding: 24px;
}

.search-card {
  margin-bottom: 24px;
}

.search-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px 20px;
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-field span {
  font-size: 15px;
  font-weight: 700;
}

.search-field input,
.search-field select {
  width: 100%;
  box-sizing: border-box;
  border: 2px solid rgba(156, 107, 47, 0.12);
  border-radius: 18px;
  background: #fff;
  color: var(--text-main);
  font: inherit;
  padding: 14px 16px;
}

.search-field input:focus,
.search-field select:focus {
  outline: 2px solid rgba(217, 164, 65, 0.18);
  border-color: var(--accent);
}

.search-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 22px;
}

.search-hint {
  color: var(--text-soft);
  line-height: 1.6;
}

.search-button-group {
  display: flex;
  gap: 12px;
}

.primary-button,
.secondary-button,
.member-link-button,
.dialog-close-button {
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.primary-button,
.secondary-button {
  min-width: 110px;
  padding: 12px 20px;
}

.primary-button {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #fff;
}

.secondary-button {
  background: rgba(156, 107, 47, 0.08);
  color: var(--accent-strong);
  box-shadow: inset 0 0 0 1px rgba(156, 107, 47, 0.18);
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.55;
  cursor: wait;
}

.search-message {
  margin: 16px 0 0;
  line-height: 1.6;
}

.search-message.is-error {
  color: var(--error);
}

.search-message.is-info {
  color: var(--text-soft);
}

.results-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.results-count {
  margin: 0;
  color: var(--text-soft);
}

.results-table-shell {
  overflow-x: auto;
}

.results-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
}

.results-table th,
.results-table td {
  padding: 16px 14px;
  border-bottom: 1px solid rgba(107, 83, 49, 0.12);
  text-align: left;
  vertical-align: middle;
}

.results-table th {
  background: linear-gradient(135deg, var(--highlight) 0%, var(--accent) 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.member-link-button {
  background: transparent;
  color: #2b6cb0;
  padding: 0;
  text-decoration: underline;
}

.results-empty-cell {
  color: var(--text-soft);
  text-align: center !important;
  line-height: 1.7;
  padding: 28px 16px !important;
}

.results-empty-highlight {
  color: var(--accent-strong);
  font-weight: 700;
}

.member-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(24, 28, 26, 0.38);
  backdrop-filter: blur(4px);
}

.member-dialog {
  position: fixed;
  top: 0;
  right: 0;
  width: min(520px, 94vw);
  height: 100vh;
  box-sizing: border-box;
  overflow-y: auto;
  background: #fdfcf8;
  padding: 24px;
  animation: slide-in-from-right 0.24s ease;
}

.member-dialog-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.dialog-close-button {
  width: 40px;
  height: 40px;
  background: rgba(156, 107, 47, 0.08);
  color: var(--accent-strong);
  font-size: 24px;
  line-height: 1;
}

.member-detail-list {
  display: grid;
  grid-template-columns: 140px 1fr;
  border-top: 1px solid rgba(107, 83, 49, 0.16);
  border-left: 1px solid rgba(107, 83, 49, 0.16);
  margin: 0;
}

.member-detail-list dt {
  background: rgba(217, 164, 65, 0.1);
  color: var(--accent-strong);
  font-weight: 700;
  margin: 0;
}

.member-detail-list dd {
  margin: 0;
  word-break: break-word;
  background: #fff;
}

.member-detail-list dt,
.member-detail-list dd {
  border-right: 1px solid rgba(107, 83, 49, 0.16);
  border-bottom: 1px solid rgba(107, 83, 49, 0.16);
  padding: 10px 12px;
}

@media (max-width: 1180px) {
  .search-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .member-hero,
  .search-actions,
  .results-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-button-group {
    justify-content: stretch;
  }

  .primary-button,
  .secondary-button {
    flex: 1;
  }
}

@media (max-width: 720px) {
  .member-page {
    padding: 24px 16px 32px;
  }

  .search-grid,
  .member-detail-list {
    grid-template-columns: 1fr;
  }

  .member-clock-card {
    width: 100%;
  }
}

@keyframes slide-in-from-right {
  from {
    transform: translateX(24px);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
