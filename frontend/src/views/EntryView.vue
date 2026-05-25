<template>
  <div class="entry-page">
    <section class="entry-hero">
      <div>
        <p class="entry-eyebrow">Check In</p>
        <h1>現場入場作業</h1>
        <p class="entry-description">
          搜尋會員後直接選票種與租借裝備，建立本次入場紀錄。
        </p>
      </div>
      <div class="entry-clock-card">
        <span class="entry-clock-label">目前時間</span>
        <strong>{{ datetime }}</strong>
      </div>
    </section>

    <section class="entry-layout">
      <article class="entry-main-card">
        <form class="member-search" @submit.prevent="searchMember">
          <div class="member-search-field">
            <label for="entry-phone">手機 / 會員編號 / 姓名</label>
            <input
              id="entry-phone"
              name="phone"
              type="text"
              v-model.trim="phone"
              placeholder="輸入電話、會員編號或姓名"
            />

            <div v-if="memberSuggestions.length" class="member-suggestions">
              <button
                v-for="member in memberSuggestions"
                :key="memberKey(member)"
                type="button"
                class="member-suggestion"
                @click="selectSuggestedMember(member)"
              >
                {{ suggestionText(member) }}
              </button>
            </div>
          </div>

          <button type="submit" class="primary-button">
            {{ isSearching ? '搜尋中...' : '搜尋會員' }}
          </button>
        </form>

        <p v-if="searchMessage" class="entry-message is-error">{{ searchMessage }}</p>

        <section v-if="selectedMember" class="member-summary-card">
          <p class="summary-label">已選會員</p>
          <div class="member-summary">
            <span
              v-for="item in memberSummaryItems"
              :key="item"
              class="member-summary-chip"
            >
              {{ item }}
            </span>
          </div>
        </section>

        <section class="entry-picker-section">
          <div class="section-heading">
            <h2>選擇票種</h2>
            <span>{{ ticketOptions.length }} 種可用</span>
          </div>

          <div class="entry-button-list">
            <button
              v-for="ticket in ticketOptions"
              :key="ticket.ticket_code"
              type="button"
              class="entry-select-button"
              :class="{ selected: ticket.ticket_code === ticket_type }"
              @click="selectTicket(ticket.ticket_code)"
            >
              <span v-if="ticket.ticket_code === ticket_type" class="entry-select-check">✓</span>
              <div class="entry-select-top">
                <span class="entry-select-name">{{ ticket.ticket_name }}</span>
              </div>
              <span class="entry-select-price">${{ ticket.ticket_price }}</span>
            </button>
          </div>
        </section>

        <section class="entry-picker-section">
          <div class="section-heading">
            <h2>租借裝備</h2>
            <span>{{ equipment.length }} 項已選</span>
          </div>

          <div class="entry-button-list">
            <button
              v-for="item in equipmentOptions"
              :key="item.rental_code"
              type="button"
              class="entry-select-button compact"
              :class="{ selected: equipment.includes(item.rental_code) }"
              @click="toggleEquipment(item.rental_code)"
            >
              <span v-if="equipment.includes(item.rental_code)" class="entry-select-check">✓</span>
              <div class="entry-select-top">
                <span class="entry-select-name">{{ item.rental_name }}</span>
              </div>
              <span class="entry-select-price">${{ item.rental_price }}</span>
            </button>
          </div>
        </section>
      </article>

      <aside class="entry-side-card">
        <div class="side-card-header">
          <div>
            <p class="summary-label">本次摘要</p>
            <h2>入場確認</h2>
          </div>
          <button type="button" class="ghost-button" @click="Setlogout()">登出</button>
        </div>

        <div class="summary-list">
          <div class="summary-row">
            <span>會員</span>
            <strong>{{ selectedMember?.name || '尚未選擇' }}</strong>
          </div>
          <div class="summary-row">
            <span>會員編號</span>
            <strong>{{ member_code || '-' }}</strong>
          </div>
          <div class="summary-row">
            <span>電話</span>
            <strong>{{ phone || '-' }}</strong>
          </div>
          <div class="summary-row">
            <span>票種</span>
            <strong>{{ selectedTicket?.ticket_name || '尚未選擇' }}</strong>
          </div>
          <div class="summary-row">
            <span>裝備</span>
            <strong>{{ selectedEquipmentText }}</strong>
          </div>
        </div>

        <div class="entry-total-card">
          <span>總金額</span>
          <strong>${{ price_total }}</strong>
        </div>

        <button
          type="button"
          class="submit-button"
          :disabled="isSubmittingVisit"
          @click="submitVisit"
        >
          {{ isSubmittingVisit ? '建立入場中...' : '確認入場' }}
        </button>

        <p v-if="visitMessage" class="entry-message" :class="visitMessageClass">
          {{ visitMessage }}
        </p>
      </aside>
    </section>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  beforeCreate() {
    if (!localStorage.getItem('islogin')) {
      this.$router.push('/staff')
    }
  },

  mounted() {
    this.updateCurrentDateTime()
    this.clockTimer = window.setInterval(this.updateCurrentDateTime, 1000)
    this.fetchMembers()
    this.fetchTickets()
    this.fetchRentalEquipment()
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
      member_code: '',
      phone: '',
      selectedMember: null,
      members: [],
      isSearching: false,
      searchMessage: '',
      equipment: [],
      ticket_type: null,
      equipmentOptions: [],
      ticketOptions: [],
      isSubmittingVisit: false,
      visitMessage: '',
      visitMessageType: '',
    }
  },

  methods: {
    updateCurrentDateTime() {
      this.datetime = new Date().toLocaleString('zh-TW', { hour12: false })
    },

    async fetchMembers() {
      if (this.members.length) {
        return
      }

      const res = await axios.get('/api/members')
      this.members = res.data
    },

    async fetchTickets() {
      try {
        const res = await axios.get('/api/ticket?activeOnly=1')
        this.ticketOptions = Array.isArray(res.data)
          ? res.data.filter((ticket) => Number(ticket.is_active) !== 0)
          : []
      } catch (err) {
        console.error('載入票種失敗', err)
      }
    },

    async fetchRentalEquipment() {
      try {
        const res = await axios.get('/api/rental_equipment?activeOnly=1')
        this.equipmentOptions = Array.isArray(res.data)
          ? res.data.filter((item) => Number(item.is_active) !== 0)
          : []
      } catch (err) {
        console.error('載入租借裝備失敗', err)
      }
    },

    selectTicket(ticketCode) {
      this.ticket_type = this.ticket_type === ticketCode ? null : ticketCode
    },

    toggleEquipment(rentalCode) {
      if (this.equipment.includes(rentalCode)) {
        this.equipment = this.equipment.filter((code) => code !== rentalCode)
        return
      }

      this.equipment = [...this.equipment, rentalCode]
    },

    async searchMember() {
      if (!this.phone) {
        this.clearMember()
        this.searchMessage = '請先輸入電話、會員編號或姓名再搜尋'
        return
      }

      this.isSearching = true
      this.searchMessage = ''

      try {
        await this.fetchMembers()

        const matches = this.findMatchingMembers(this.phone)
        const exactMember = matches.find((match) => match.score === 0)?.member ?? null
        const member = exactMember ?? (matches.length === 1 ? matches[0].member : null)

        if (!member) {
          this.clearMember()
          this.searchMessage = matches.length > 1
            ? `找到 ${matches.length} 位符合會員，請直接點選清單中的正確會員`
            : '找不到符合的會員資料'
          return
        }

        this.setSelectedMember(member)
      } catch (err) {
        console.error('搜尋會員失敗', err)
        this.clearMember()
        this.searchMessage = '搜尋會員失敗'
      } finally {
        this.isSearching = false
      }
    },

    findMatchingMembers(keyword) {
      const query = String(keyword ?? '').trim().toLowerCase()
      const normalizedPhone = this.normalizePhone(query)

      if (!query) {
        return []
      }

      return this.members
        .map((member) => ({
          member,
          score: this.memberSearchScore(member, query, normalizedPhone),
        }))
        .filter((result) => result.score >= 0)
        .sort((a, b) => a.score - b.score)
    },

    memberSearchScore(member, query, normalizedPhone) {
      const memberPhone = this.normalizePhone(member.phone)
      const memberPhoneWithoutLeadingZero = memberPhone.replace(/^0+/, '')
      const queryWithoutLeadingZero = normalizedPhone.replace(/^0+/, '')
      const memberCode = String(member.member_code ?? '').toLowerCase()
      const memberName = String(member.name ?? '').toLowerCase()
      const canUsePartialMatch = query.length >= 2 || normalizedPhone.length >= 2

      if (
        String(member.phone ?? '').trim() === query
        || memberPhone === normalizedPhone
        || memberPhone === queryWithoutLeadingZero
        || memberPhoneWithoutLeadingZero === normalizedPhone
        || memberPhoneWithoutLeadingZero === queryWithoutLeadingZero
        || memberCode === query
        || memberName === query
      ) {
        return 0
      }

      if (!canUsePartialMatch) {
        return -1
      }

      if (
        (normalizedPhone && memberPhone.startsWith(normalizedPhone))
        || (queryWithoutLeadingZero && memberPhoneWithoutLeadingZero.startsWith(queryWithoutLeadingZero))
        || memberCode.startsWith(query)
        || memberName.startsWith(query)
      ) {
        return 1
      }

      if (
        (normalizedPhone && memberPhone.includes(normalizedPhone))
        || (queryWithoutLeadingZero && memberPhoneWithoutLeadingZero.includes(queryWithoutLeadingZero))
        || memberCode.includes(query)
        || memberName.includes(query)
      ) {
        return 2
      }

      return -1
    },

    selectSuggestedMember(member) {
      this.setSelectedMember(member)
      this.searchMessage = ''
    },

    setSelectedMember(member) {
      this.selectedMember = member
      this.member_code = member.member_code ?? ''
      this.phone = member.phone ?? this.phone
      this.visitMessage = ''
      this.visitMessageType = ''
    },

    normalizePhone(value) {
      return String(value ?? '').replace(/\D/g, '')
    },

    memberKey(member) {
      return member.id ?? member.mid ?? member.member_id ?? member.member_code ?? JSON.stringify(member)
    },

    suggestionText(member) {
      return `${member.phone ?? ''} | ${member.name ?? ''} | ${member.member_code ?? ''}`
    },

    Setlogout() {
      localStorage.removeItem('islogin')
      this.$router.push('/staff')
    },

    clearMember() {
      this.selectedMember = null
      this.member_code = ''
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

    formatDate(value) {
      if (!value) {
        return ''
      }

      const date = new Date(value)

      if (Number.isNaN(date.getTime())) {
        return value
      }

      return date.toLocaleDateString('zh-TW')
    },

    async submitVisit() {
      if (!this.selectedMember?.member_id) {
        this.visitMessage = '請先選擇會員'
        this.visitMessageType = 'error'
        return
      }

      if (!this.ticket_type) {
        this.visitMessage = '請先選擇票種'
        this.visitMessageType = 'error'
        return
      }

      this.isSubmittingVisit = true
      this.visitMessage = ''
      this.visitMessageType = ''

      try {
        await axios.post('/api/member_visits', {
          member_id: this.selectedMember.member_id,
          ticket_code: this.ticket_type,
          rental_codes: this.equipment,
        })

        this.visitMessage = '入場紀錄建立成功'
        this.visitMessageType = 'success'
        this.ticket_type = null
        this.equipment = []
      } catch (err) {
        console.error('建立入場紀錄失敗', err)
        this.visitMessage = err.response?.data?.message ?? '建立入場紀錄失敗'
        this.visitMessageType = 'error'
      } finally {
        this.isSubmittingVisit = false
      }
    },
  },

  computed: {
    memberSuggestions() {
      if (this.selectedMember && this.phone === this.selectedMember.phone) {
        return []
      }

      return this.findMatchingMembers(this.phone)
        .slice(0, 5)
        .map((result) => result.member)
    },

    memberSummaryItems() {
      if (!this.selectedMember) {
        return []
      }

      const passItems = this.hasLongTermPass
        ? [
            this.passText(this.selectedMember.pass_type),
            this.selectedMember.active_pass_expires_at
              ? this.formatDate(this.selectedMember.active_pass_expires_at)
              : '',
          ]
        : ['一般單次']

      return [
        this.member_code,
        this.selectedMember.name,
        this.selectedMember.phone,
        ...passItems,
      ].filter((value) => value !== null && value !== undefined && value !== '')
    },

    selectedTicket() {
      return this.ticketOptions.find((ticket) => ticket.ticket_code === this.ticket_type)
    },

    hasLongTermPass() {
      const passType = this.selectedMember?.pass_type
      return Boolean(passType && passType !== 'single' && Number(passType) !== 0)
    },

    selectedEquipmentText() {
      if (!this.equipment.length) {
        return '未租借'
      }

      return this.equipment
        .map((code) => this.equipmentOptions.find((option) => option.rental_code === code)?.rental_name || code)
        .join('、')
    },

    visitMessageClass() {
      return this.visitMessageType === 'error' ? 'is-error' : 'is-success'
    },

    price_total() {
      const ticketTotal = Number(this.selectedTicket?.ticket_price ?? 0)
      const equipmentTotal = this.equipment.reduce((total, code) => {
        const item = this.equipmentOptions.find((option) => option.rental_code === code)
        return total + Number(item?.rental_price ?? 0)
      }, 0)

      return ticketTotal + equipmentTotal
    },
  },

  watch: {
    phone(newPhone) {
      if (this.selectedMember && newPhone !== this.selectedMember.phone) {
        this.clearMember()
      }

      this.searchMessage = ''
    },
  },
}
</script>

<style scoped>
.entry-page {
  --entry-bg: linear-gradient(180deg, #f3f8f4 0%, #e7f1ea 100%);
  --panel-bg: rgba(255, 255, 255, 0.92);
  --panel-border: rgba(41, 88, 61, 0.14);
  --text-main: #193225;
  --text-soft: #607568;
  --accent: #2f7a53;
  --accent-strong: #205d3d;
  --danger: #b23a31;
  --success: #176a3c;
  --shadow-soft: 0 18px 40px rgba(25, 50, 37, 0.12);
  margin: 0 auto;
  max-width: 1320px;
  min-height: 100%;
  padding: 32px 24px 40px;
  color: var(--text-main);
  background: var(--entry-bg);
}

.entry-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.entry-eyebrow,
.summary-label {
  margin: 0 0 8px;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.entry-hero h1,
.entry-main-card h2,
.entry-side-card h2 {
  margin: 0;
}

.entry-description {
  max-width: 640px;
  margin: 12px 0 0;
  color: var(--text-soft);
  line-height: 1.7;
}

.entry-clock-card,
.entry-main-card,
.entry-side-card {
  border: 1px solid var(--panel-border);
  border-radius: 24px;
  background: var(--panel-bg);
  box-shadow: var(--shadow-soft);
}

.entry-clock-card {
  min-width: 220px;
  padding: 18px 20px;
}

.entry-clock-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-soft);
  font-size: 13px;
}

.entry-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.8fr);
  gap: 24px;
  align-items: start;
}

.entry-main-card,
.entry-side-card {
  padding: 24px;
  backdrop-filter: blur(6px);
}

.entry-side-card {
  position: sticky;
  top: 24px;
}

.member-search {
  display: flex;
  align-items: end;
  gap: 12px;
  margin-bottom: 14px;
}

.member-search-field {
  position: relative;
  flex: 1;
}

.member-search-field label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
}

.member-search-field input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(41, 88, 61, 0.18);
  border-radius: 16px;
  background: #fff;
  color: var(--text-main);
  font: inherit;
  padding: 14px 16px;
}

.member-search-field input:focus {
  outline: 2px solid rgba(47, 122, 83, 0.18);
  border-color: var(--accent);
}

.primary-button,
.submit-button,
.ghost-button {
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.primary-button,
.submit-button {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #fff;
  box-shadow: 0 14px 28px rgba(32, 93, 61, 0.2);
  padding: 14px 20px;
}

.ghost-button {
  background: rgba(47, 122, 83, 0.08);
  color: var(--accent-strong);
  padding: 10px 16px;
}

.primary-button:hover,
.submit-button:hover,
.ghost-button:hover {
  transform: translateY(-1px);
}

.primary-button:disabled,
.submit-button:disabled,
.ghost-button:disabled {
  opacity: 0.55;
  cursor: wait;
  transform: none;
}

.member-suggestions {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 10;
  overflow: hidden;
  border: 1px solid rgba(41, 88, 61, 0.12);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 36px rgba(25, 50, 37, 0.14);
}

.member-suggestion {
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
  padding: 12px 14px;
  text-align: left;
}

.member-suggestion:hover,
.member-suggestion:focus {
  background: #edf6f0;
}

.entry-message {
  margin: 16px 0 0;
  line-height: 1.6;
}

.entry-message.is-error {
  color: var(--danger);
}

.entry-message.is-success {
  color: var(--success);
}

.member-summary-card {
  margin: 18px 0 26px;
  border: 1px solid rgba(41, 88, 61, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.76);
  padding: 18px;
}

.member-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.member-summary-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(47, 122, 83, 0.1);
  color: var(--accent-strong);
  font-size: 14px;
  font-weight: 700;
  padding: 8px 12px;
}

.entry-picker-section + .entry-picker-section {
  margin-top: 28px;
}

.section-heading,
.side-card-header,
.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-heading {
  margin-bottom: 14px;
}

.section-heading span {
  color: var(--text-soft);
  font-size: 14px;
}

.entry-button-list {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.entry-select-button {
  position: relative;
  min-height: 96px;
  border: 1px solid rgba(41, 88, 61, 0.14);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 247, 242, 0.96) 100%);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 16px 14px;
  text-align: left;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.entry-select-button:hover,
.entry-select-button:focus {
  border-color: rgba(47, 122, 83, 0.34);
  box-shadow: 0 14px 30px rgba(25, 50, 37, 0.1);
  transform: translateY(-1px);
}

.entry-select-button.selected {
  border-color: var(--accent);
  box-shadow: 0 16px 34px rgba(32, 93, 61, 0.16);
}

.entry-select-button.compact {
  min-height: 88px;
}

.entry-select-top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 8px;
}

.entry-select-name {
  font-weight: 700;
}

.entry-select-price {
  color: var(--text-soft);
  font-size: 14px;
}

.entry-select-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.summary-list {
  display: grid;
  gap: 14px;
  margin: 20px 0 22px;
}

.summary-row {
  border-bottom: 1px solid rgba(41, 88, 61, 0.1);
  padding-bottom: 10px;
}

.summary-row span {
  color: var(--text-soft);
}

.summary-row strong {
  text-align: right;
}

.entry-total-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(47, 122, 83, 0.1) 0%, rgba(32, 93, 61, 0.18) 100%);
  margin-bottom: 18px;
  padding: 18px;
}

.entry-total-card span {
  color: var(--text-soft);
}

.entry-total-card strong {
  font-size: 30px;
}

.submit-button {
  width: 100%;
}

@media (max-width: 980px) {
  .entry-layout {
    grid-template-columns: 1fr;
  }

  .entry-side-card {
    position: static;
  }
}

@media (max-width: 720px) {
  .entry-page {
    padding: 24px 16px 32px;
  }

  .entry-hero,
  .member-search,
  .section-heading,
  .side-card-header,
  .summary-row {
    flex-direction: column;
    align-items: stretch;
  }

  .entry-clock-card {
    width: 100%;
  }

  .primary-button,
  .ghost-button {
    width: 100%;
  }

  .summary-row strong {
    text-align: left;
  }
}
</style>
