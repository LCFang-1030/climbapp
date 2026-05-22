<template>
  <div class="entry">
    <h1>This is an entry page</h1>

    <h4>datetime: {{ datetime }}</h4>

    <form class="member-search" @submit.prevent="searchMember">
      <div class="member-search-field">
        <label for="entry-phone">phone:</label>
        <input id="entry-phone" name="phone" type="text" v-model.trim="phone" />

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
      <button type="submit">搜尋會員</button>
    </form>

    <p v-if="isSearching">搜尋會員中...</p>
    <p v-else-if="searchMessage" class="entry-message">{{ searchMessage }}</p>

    <section v-if="selectedMember" class="member-summary">
      {{ memberSummaryItems.join(' | ') }}
    </section>

    <section class="entry-picker-section">
      <h2>票種</h2>
      <div class="entry-button-list">
        <button
          v-for="ticket in ticketOptions"
          :key="ticket.ticket_code"
          type="button"
          class="entry-select-button"
          :class="{ selected: ticket.ticket_code === ticket_type }"
          @click="selectTicket(ticket.ticket_code)"
        >
          <span class="entry-select-check" v-if="ticket.ticket_code === ticket_type">✓</span>
          <div class="entry-select-top">
            <span class="entry-select-name">{{ ticket.ticket_name }}</span>
          </div>
          <span class="entry-select-price">${{ ticket.ticket_price }}</span>
        </button>
      </div>
    </section>

    <section class="entry-picker-section">
      <h2>裝備租借</h2>
      <div class="entry-button-list">
        <button
          v-for="item in equipmentOptions"
          :key="item.rental_code"
          type="button"
          class="entry-select-button compact"
          :class="{ selected: equipment.includes(item.rental_code) }"
          @click="toggleEquipment(item.rental_code)"
        >
          <span class="entry-select-check" v-if="equipment.includes(item.rental_code)">✓</span>
          <div class="entry-select-top">
            <span class="entry-select-name">{{ item.rental_name }}</span>
          </div>
          <span class="entry-select-price">${{ item.rental_price }}</span>
        </button>
      </div>
    </section>

    <div class="entry-actions">
      <div>price: {{ price_total }}</div>
      <button type="button" :disabled="isSubmittingVisit" @click="submitVisit">
        {{ isSubmittingVisit ? '新增入場中...' : '會員入場' }}
      </button>
    </div>

    <p v-if="visitMessage" class="visit-message">{{ visitMessage }}</p>

    <hr />
    entry_record: {{ entry_record }}
    {{ islogout }}
    <button @click="Setlogout()"> logout </button>

    <section class="visit-section">
      <h2>當日入場紀錄</h2>
      <p v-if="isLoadingTodayVisits">載入當日入場紀錄中...</p>
      <p v-else-if="todayVisitError" class="entry-message">{{ todayVisitError }}</p>
      <p v-else-if="!todayVisitRecords.length">今日尚無入場紀錄</p>

      <table v-else-if="todayVisitRecords.length" border="1" class="visit-board">
        <thead>
          <tr>
            <th>會員編號</th>
            <th>姓名</th>
            <th>票種</th>
            <th>時間</th>
            <th>租借紀錄</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="visit in todayVisitRecords" :key="visit.visit_id">
            <td>{{ visit.member_code }}</td>
            <td>{{ visit.member_name }}</td>
            <td>{{ visit.visit_type || '未設定' }}</td>
            <td>{{ formatDateTime(visit.checkin_time) }}</td>
            <td>
              <button
                type="button"
                class="record-link-button"
                :disabled="visit.rentalsLoading"
                @click="openRentalDialog(visit)"
              >
                {{ visit.rentalsLoading ? '載入中...' : '查看租借紀錄' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="visit-section">
      <h2>歷史所有入場紀錄</h2>
      <p v-if="isLoadingAllVisits">載入歷史入場紀錄中...</p>
      <p v-else-if="allVisitError" class="entry-message">{{ allVisitError }}</p>
      <p v-else-if="!allVisitRecords.length">尚無歷史入場紀錄</p>

      <table v-else-if="allVisitRecords.length" border="1" class="visit-board">
        <thead>
          <tr>
            <th>會員編號</th>
            <th>姓名</th>
            <th>票種</th>
            <th>時間</th>
            <th>租借紀錄</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="visit in allVisitRecords" :key="visit.visit_id">
            <td>{{ visit.member_code }}</td>
            <td>{{ visit.member_name }}</td>
            <td>{{ visit.visit_type || '未設定' }}</td>
            <td>{{ formatDateTime(visit.checkin_time) }}</td>
            <td>
              <button
                type="button"
                class="record-link-button"
                :disabled="visit.rentalsLoading"
                @click="openRentalDialog(visit)"
              >
                {{ visit.rentalsLoading ? '載入中...' : '查看租借紀錄' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <div
      v-if="isRentalDialogOpen"
      class="member-dialog-overlay"
      @click.self="closeRentalDialog"
    >
      <aside class="member-dialog" aria-label="租借紀錄">
        <div class="member-dialog-header">
          <h2>租借紀錄</h2>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉租借紀錄"
            @click="closeRentalDialog"
          >
            X
          </button>
        </div>

        <div v-if="selectedRentalVisit">
          <p class="dialog-summary">
            {{ selectedRentalVisit.member_code }} | {{ selectedRentalVisit.member_name }} | {{ formatDateTime(selectedRentalVisit.checkin_time) }}
          </p>

          <p v-if="selectedRentalVisit.rentalsLoading">載入租借紀錄中...</p>
          <p v-else-if="selectedRentalVisit.rentalsError" class="entry-message">
            {{ selectedRentalVisit.rentalsError }}
          </p>
          <p v-else-if="!selectedRentalVisit.rentals.length">無租借紀錄</p>

          <table v-else border="1" class="visit-board rental-board">
            <thead>
              <tr>
                <th>裝備代碼</th>
                <th>裝備名稱</th>
                <th>價格</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rental in selectedRentalVisit.rentals" :key="rental.id">
                <td>{{ rental.rental_code }}</td>
                <td>{{ rental.rental_name }}</td>
                <td>${{ rental.rental_price }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const decorateVisits = (visits) =>
  visits.map((visit) => ({
    ...visit,
    rentals: [],
    rentalsLoading: false,
    rentalsError: '',
  }))

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
    this.fetchTodayVisits()
    this.fetchAllVisits()
  },

  beforeUnmount() {
    if (this.clockTimer) {
      window.clearInterval(this.clockTimer)
    }
  },

  data() {
    return {
      x: this.$route.query.x,
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
      todayVisitRecords: [],
      allVisitRecords: [],
      isLoadingTodayVisits: false,
      isLoadingAllVisits: false,
      todayVisitError: '',
      allVisitError: '',
      isRentalDialogOpen: false,
      selectedRentalVisit: null,

      labels: {
        name: '姓名',
        nationality: '國籍',
        idcard: '身份證',
        phone: '電話',
        birthday: '生日',
        gender: '性別',
        contact_address: '聯絡地址',
        email: '電子郵件',
        emergency_name: '緊急聯絡人',
        emergency_phone: '緊急聯絡電話',
        emergency_address: '緊急聯絡地址',
        emergency_relation: '關係',
        line_user_id: 'Line_id',
        note: '備註',
      },

      form: {
        name: '',
        nationality: '',
        idcard: '',
        phone: '',
        birthday: '',
        gender: '',
        contact_address: '',
        email: '',
        emergency_name: '',
        emergency_phone: '',
        emergency_address: '',
        emergency_relation: '',
        line_user_id: '',
        is_active: '1',
        note: '',
      },

      entry_record: {
        datetime: '',
        member_code: '',
        member_name: '',
        phone: '',
        ticket_type: null,
        equipment: [],
        price_total: 0,
      },
      islogout: false,
    }
  },

  methods: {
    updateCurrentDateTime() {
      this.datetime = new Date().toLocaleString('zh-TW', { hour12: false })
      this.updateEntryRecord()
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
        console.error('取得 ticket 失敗', err)
      }
    },

    async fetchRentalEquipment() {
      try {
        const res = await axios.get('/api/rental_equipment?activeOnly=1')
        this.equipmentOptions = Array.isArray(res.data)
          ? res.data.filter((item) => Number(item.is_active) !== 0)
          : []
      } catch (err) {
        console.error('取得 rental_equipment 失敗', err)
      }
    },

    async fetchTodayVisits() {
      this.isLoadingTodayVisits = true
      this.todayVisitError = ''

      try {
        const res = await axios.get('/api/member_visits?scope=today')
        this.todayVisitRecords = decorateVisits(Array.isArray(res.data) ? res.data : [])
        await this.populateVisitRentals(this.todayVisitRecords)
      } catch (err) {
        console.error('取得當日入場紀錄失敗', err)
        this.todayVisitError = '取得當日入場紀錄失敗'
      } finally {
        this.isLoadingTodayVisits = false
      }
    },

    async fetchAllVisits() {
      this.isLoadingAllVisits = true
      this.allVisitError = ''

      try {
        const res = await axios.get('/api/member_visits?scope=all')
        this.allVisitRecords = decorateVisits(Array.isArray(res.data) ? res.data : [])
        await this.populateVisitRentals(this.allVisitRecords)
      } catch (err) {
        console.error('取得歷史入場紀錄失敗', err)
        this.allVisitError = '取得歷史入場紀錄失敗'
      } finally {
        this.isLoadingAllVisits = false
      }
    },

    async populateVisitRentals(visits) {
      await Promise.all(visits.map((visit) => this.fetchVisitRentals(visit)))
    },

    async fetchVisitRentals(visit) {
      visit.rentalsLoading = true
      visit.rentalsError = ''

      try {
        const res = await axios.get(`/api/member_visits/${visit.visit_id}/rentals`)
        visit.rentals = Array.isArray(res.data) ? res.data : []
      } catch (err) {
        console.error(`取得 visit ${visit.visit_id} 租借紀錄失敗`, err)
        visit.rentalsError = '取得租借紀錄失敗'
      } finally {
        visit.rentalsLoading = false
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
        this.searchMessage = '請輸入電話、會員編號或姓名搜尋會員'
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
            ? `找到 ${matches.length} 筆符合資料，請繼續輸入縮小範圍`
            : '找不到符合的會員'
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
      this.updateEntryRecord()
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
      this.updateEntryRecord()
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

    formatDateTime(value) {
      if (!value) {
        return ''
      }

      const date = new Date(value)

      if (Number.isNaN(date.getTime())) {
        return value
      }

      return date.toLocaleString('zh-TW', { hour12: false })
    },

    async submitVisit() {
      if (!this.selectedMember?.member_id) {
        this.visitMessage = '請先選擇會員'
        return
      }

      if (!this.ticket_type) {
        this.visitMessage = '請先選擇票券'
        return
      }

      this.isSubmittingVisit = true
      this.visitMessage = ''

      try {
        await axios.post('/api/member_visits', {
          member_id: this.selectedMember.member_id,
          ticket_code: this.ticket_type,
          rental_codes: this.equipment,
        })

        this.visitMessage = '會員入場紀錄新增成功'
        this.ticket_type = null
        this.equipment = []
        this.updateEntryRecord()
        await Promise.all([this.fetchTodayVisits(), this.fetchAllVisits()])
      } catch (err) {
        console.error('新增 member_visits 失敗', err)
        this.visitMessage = err.response?.data?.message ?? '新增入場紀錄失敗'
      } finally {
        this.isSubmittingVisit = false
      }
    },

    openRentalDialog(visit) {
      this.selectedRentalVisit = visit
      this.isRentalDialogOpen = true
    },

    closeRentalDialog() {
      this.isRentalDialogOpen = false
      this.selectedRentalVisit = null
    },

    updateEntryRecord() {
      this.entry_record = {
        datetime: this.datetime,
        member_code: this.member_code,
        member_name: this.selectedMember?.name ?? '',
        phone: this.phone,
        ticket_type: this.ticket_type,
        equipment: [...this.equipment],
        price_total: this.price_total,
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
        : ['單次票']

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

    ticket_type() {
      this.updateEntryRecord()
    },

    equipment: {
      handler() {
        this.updateEntryRecord()
      },
      deep: true,
    },
  },
}
</script>

<style scoped>
.entry {
  margin: 0 auto;
  max-width: 1080px;
  padding: 24px;
}

.member-search,
.member-summary,
.entry-message,
.visit-message {
  margin-bottom: 16px;
}

.member-search {
  align-items: flex-start;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.member-search-field {
  display: flex;
  position: relative;
}

.member-search input {
  margin: 0 8px;
}

.entry-picker-section {
  margin-bottom: 24px;
}

.entry-picker-section h2 {
  margin-bottom: 10px;
}

.entry-button-list {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}

.entry-select-button {
  position: relative;
  border: 1px solid #d7d7d7;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 92px;
  padding: 14px 14px 12px;
  text-align: left;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.entry-select-button:hover,
.entry-select-button:focus {
  border-color: #90caf9;
  box-shadow: 0 10px 22px rgba(21, 101, 192, 0.12);
  transform: translateY(-1px);
}

.entry-select-button.selected {
  border-color: #1565c0;
  box-shadow: 0 12px 24px rgba(21, 101, 192, 0.18);
}

.entry-select-button.compact {
  min-height: 84px;
}

.entry-select-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.entry-select-name {
  font-weight: 700;
}

.entry-select-price {
  color: #455a64;
  font-size: 14px;
}

.entry-select-check {
  position: absolute;
  top: 8px;
  left: 10px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #1565c0;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.entry-actions {
  align-items: center;
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.member-summary {
  font-weight: 600;
}

.member-suggestions {
  background: #fff;
  border: 1px solid #d7d7d7;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  left: 106px;
  min-width: 240px;
  overflow: hidden;
  position: absolute;
  top: calc(100% + 6px);
  width: max-content;
  z-index: 10;
}

.member-suggestion {
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 10px 12px;
  text-align: left;
  white-space: nowrap;
}

.member-suggestion:hover,
.member-suggestion:focus {
  background: #f2f4f7;
}

.entry-message {
  color: #b00020;
}

.visit-message {
  color: #0a7a36;
}

.visit-section {
  margin-top: 32px;
}

.visit-board {
  border-collapse: collapse;
  min-width: 720px;
}

.visit-board th,
.visit-board td {
  padding: 8px 12px;
  text-align: left;
}

.visit-board th {
  background: #f2f2f2;
}

.record-link-button {
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #1565c0;
  cursor: pointer;
  font: inherit;
  padding: 4px 6px;
  text-decoration: underline;
}

.record-link-button:hover,
.record-link-button:focus {
  background: #e3f2fd;
  outline: 2px solid #1565c0;
  outline-offset: 2px;
}

.record-link-button:disabled {
  color: #90a4ae;
  cursor: wait;
  text-decoration: none;
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

.dialog-summary {
  margin-bottom: 16px;
}

.rental-board {
  min-width: 100%;
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
