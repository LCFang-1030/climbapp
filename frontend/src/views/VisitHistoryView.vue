<template>
  <div class="visit-history-page">
    <section class="history-hero">
      <div>
        <p class="history-eyebrow">Visit Search</p>
        <h1>交易紀錄查詢</h1>
        <p class="history-description">
          透過會員手機、商品資訊與入場時間區間快速篩選交易紀錄。訂單編號與發票相關欄位已先預留前端位置，待資料表完成後可直接串接。
        </p>
      </div>
      <div class="history-clock-card">
        <span class="history-clock-label">目前時間</span>
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
            placeholder="輸入會員手機號碼"
            @keyup.enter="submitSearch"
          />
        </label>

        <label class="search-field">
          <span>訂單編號</span>
          <input
            v-model.trim="filters.orderNumber"
            type="text"
            placeholder="輸入訂單編號"
            @keyup.enter="submitSearch"
          />
        </label>

        <label class="search-field">
          <span>發票狀態</span>
          <select v-model="filters.invoiceStatus">
            <option value="">全部</option>
            <option value="issued">已開立</option>
            <option value="pending">未開立</option>
            <option value="voided">已作廢</option>
          </select>
        </label>

        <label class="search-field">
          <span>發票號碼</span>
          <input
            v-model.trim="filters.invoiceNumber"
            type="text"
            placeholder="輸入發票號碼"
            @keyup.enter="submitSearch"
          />
        </label>

        <label class="search-field">
          <span>商品編號</span>
          <input
            v-model.trim="filters.productCode"
            type="text"
            placeholder="輸入商品編號"
            @keyup.enter="submitSearch"
          />
        </label>

        <label class="search-field">
          <span>商品名稱</span>
          <input
            v-model.trim="filters.productName"
            type="text"
            placeholder="輸入商品名稱"
            @keyup.enter="submitSearch"
          />
        </label>

        <label class="search-field">
          <span>入場時間</span>
          <input v-model="filters.startDate" type="date" />
        </label>

        <label class="search-field">
          <span>至</span>
          <input v-model="filters.endDate" type="date" />
        </label>
      </div>

      <div class="search-actions">
        <div class="search-hint">
          `訂單編號`、`發票狀態`、`發票號碼` 目前僅建立前端欄位，尚未串接資料庫。
        </div>
        <div class="search-button-group">
          <button
            type="button"
            class="primary-button"
            :disabled="isLoadingVisits"
            @click="submitSearch"
          >
            {{ isLoadingVisits ? '搜尋中...' : '搜尋' }}
          </button>
          <button
            type="button"
            class="secondary-button"
            :disabled="isLoadingVisits"
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
          <h2>查詢結果</h2>
        </div>
        <p class="results-count">共 {{ filteredVisitRecords.length }} 筆</p>
      </div>

      <div class="results-table-shell">
        <table class="results-table">
          <thead>
            <tr>
              <th>成立時間</th>
              <th>訂單資訊</th>
              <th>發票號碼</th>
              <th>會員編號</th>
              <th>手機號碼</th>
              <th>訂單金額</th>
            </tr>
          </thead>
          <tbody v-if="filteredVisitRecords.length">
            <tr v-for="visit in filteredVisitRecords" :key="visit.visit_id">
              <td>{{ formatDateTime(visit.created_at || visit.checkin_time) }}</td>
              <td>
                <button
                  type="button"
                  class="order-link-button"
                  @click="openOrderDialog(visit)"
                >
                  {{ visit.displayOrderNumber }}
                </button>
              </td>
              <td>{{ visit.displayInvoiceNumber }}</td>
              <td>{{ visit.member_code }}</td>
              <td>{{ visit.phone || '-' }}</td>
              <td>${{ formatCurrency(visit.orderAmount) }}</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td colspan="6" class="results-empty-cell">
                <span v-if="!hasSearched && !isLoadingVisits">請先輸入條件後搜尋交易紀錄。</span>
                <span v-else-if="isLoadingVisits">正在整理交易紀錄資料...</span>
                <span v-else>查無符合條件的交易紀錄。</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div
      v-if="isOrderDialogOpen"
      class="member-dialog-overlay"
      @click.self="closeOrderDialog"
    >
      <aside class="member-dialog" aria-label="訂單資訊">
        <div class="member-dialog-header">
          <div>
            <p class="results-tag">Order Detail</p>
            <h2>訂單資訊</h2>
          </div>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉訂單資訊"
            @click="closeOrderDialog"
          >
            ×
          </button>
        </div>

        <div v-if="selectedOrderVisit" class="order-detail">
          <div class="order-summary-grid">
            <div class="summary-item">
              <span>成立時間</span>
              <strong>{{ formatDateTime(selectedOrderVisit.created_at || selectedOrderVisit.checkin_time) }}</strong>
            </div>
            <div class="summary-item">
              <span>會員編號</span>
              <strong>{{ selectedOrderVisit.member_code }}</strong>
            </div>
            <div class="summary-item">
              <span>手機號碼</span>
              <strong>{{ selectedOrderVisit.phone || '-' }}</strong>
            </div>
            <div class="summary-item">
              <span>訂單金額</span>
              <strong>${{ formatCurrency(selectedOrderVisit.orderAmount) }}</strong>
            </div>
            <div class="summary-item">
              <span>訂單編號</span>
              <strong>{{ selectedOrderVisit.displayOrderNumber }}</strong>
            </div>
            <div class="summary-item">
              <span>發票號碼</span>
              <strong>{{ selectedOrderVisit.displayInvoiceNumber }}</strong>
            </div>
          </div>

          <section class="detail-section">
            <div class="detail-section-header">
              <h3>票種</h3>
              <span class="detail-price">${{ formatCurrency(selectedOrderVisit.ticketPrice) }}</span>
            </div>
            <div class="detail-pill-list">
              <span class="detail-pill">
                {{ selectedOrderVisit.ticketCode || '-' }} ｜ {{ selectedOrderVisit.ticketName || selectedOrderVisit.visit_type || '未指定票種' }}
              </span>
            </div>
          </section>

          <section class="detail-section">
            <div class="detail-section-header">
              <h3>租借</h3>
              <span class="detail-price">
                ${{ formatCurrency(selectedOrderVisit.rentalAmount) }}
              </span>
            </div>
            <p v-if="selectedOrderVisit.rentalsLoading" class="detail-empty">正在載入租借內容...</p>
            <p v-else-if="selectedOrderVisit.rentalsError" class="detail-empty is-error">
              {{ selectedOrderVisit.rentalsError }}
            </p>
            <p v-else-if="!selectedOrderVisit.rentals.length" class="detail-empty">本筆訂單沒有租借項目。</p>

            <div v-else class="rental-list">
              <article
                v-for="rental in selectedOrderVisit.rentals"
                :key="rental.id"
                class="rental-card"
              >
                <div>
                  <p class="rental-name">{{ rental.rental_name }}</p>
                  <p class="rental-code">{{ rental.rental_code }}</p>
                </div>
                <strong class="rental-price">${{ formatCurrency(rental.rental_price) }}</strong>
              </article>
            </div>
          </section>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const createFilters = () => ({
  phone: '',
  orderNumber: '',
  invoiceStatus: '',
  invoiceNumber: '',
  productCode: '',
  productName: '',
  startDate: '',
  endDate: '',
})

const normalizeText = (value) => String(value ?? '').trim().toLowerCase()

const normalizeDigits = (value) => String(value ?? '').replace(/\D/g, '')

const createDisplayOrderNumber = (visit) =>
  `OD${String(visit.visit_id ?? '').padStart(8, '0')}`

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
      filters: createFilters(),
      visits: [],
      ticketOptions: [],
      hasLoadedVisits: false,
      hasSearched: false,
      isLoadingVisits: false,
      searchMessage: '',
      searchMessageType: '',
      isOrderDialogOpen: false,
      selectedOrderVisit: null,
    }
  },

  computed: {
    filteredVisitRecords() {
      if (!this.hasAnyFilter) {
        return []
      }

      return this.visits.filter((visit) => this.matchesFilters(visit))
    },

    hasAnyFilter() {
      return Boolean(
        this.filters.phone
        || this.filters.orderNumber
        || this.filters.invoiceStatus
        || this.filters.invoiceNumber
        || this.filters.productCode
        || this.filters.productName
        || this.filters.startDate
        || this.filters.endDate
      )
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
      if (this.hasLoadedVisits || this.isLoadingVisits) {
        return
      }

      this.isLoadingVisits = true

      try {
        await Promise.all([this.fetchTickets(), this.fetchAllVisits()])
        this.hasLoadedVisits = true
      } catch (err) {
        console.error('預載交易紀錄失敗', err)
        this.searchMessage = '載入交易紀錄失敗'
        this.searchMessageType = 'error'
      } finally {
        this.isLoadingVisits = false
      }
    },

    async submitSearch() {
      this.hasSearched = this.hasAnyFilter
      this.searchMessage = ''
      this.searchMessageType = ''

      if (!this.hasAnyFilter) {
        this.searchMessage = '請至少輸入一個查詢條件。'
        this.searchMessageType = 'error'
        return
      }

      if (this.filters.startDate && this.filters.endDate && this.filters.startDate > this.filters.endDate) {
        this.searchMessage = '入場時間的開始日期不能晚於結束日期。'
        this.searchMessageType = 'error'
        return
      }

      try {
        await this.preloadSearchData()

        if (
          this.filters.orderNumber
          || this.filters.invoiceStatus
          || this.filters.invoiceNumber
        ) {
          this.searchMessage = '訂單編號、發票狀態、發票號碼目前僅建立前端欄位，尚未納入實際搜尋。'
          this.searchMessageType = 'info'
        }
      } catch (err) {
        console.error('查詢交易紀錄失敗', err)
        this.searchMessage = '查詢交易紀錄失敗'
        this.searchMessageType = 'error'
      }
    },

    resetFilters() {
      this.filters = createFilters()
      this.hasSearched = false
      this.searchMessage = ''
      this.searchMessageType = ''
      this.selectedOrderVisit = null
      this.isOrderDialogOpen = false
    },

    async fetchTickets() {
      if (this.ticketOptions.length) {
        return
      }

      const res = await axios.get('/api/ticket')
      this.ticketOptions = Array.isArray(res.data) ? res.data : []
    },

    async fetchAllVisits() {
      const res = await axios.get('/api/member_visits?scope=all')
      const rawVisits = Array.isArray(res.data) ? res.data : []
      const enrichedVisits = await Promise.all(rawVisits.map((visit) => this.enrichVisit(visit)))
      this.visits = enrichedVisits.sort((a, b) => {
        const timeA = new Date(a.created_at || a.checkin_time).getTime()
        const timeB = new Date(b.created_at || b.checkin_time).getTime()
        return timeB - timeA
      })
    },

    async enrichVisit(visit) {
      const rentals = await this.fetchVisitRentals(visit.visit_id)
      const ticket = this.findTicketByCode(visit.visit_type)
      const ticketPrice = Number(ticket?.ticket_price ?? 0)
      const rentalAmount = rentals.reduce(
        (total, rental) => total + Number(rental.rental_price ?? 0),
        0
      )

      return {
        ...visit,
        rentals,
        rentalsLoading: false,
        rentalsError: '',
        ticketCode: ticket?.ticket_code ?? visit.visit_type ?? '',
        ticketName: ticket?.ticket_name ?? visit.visit_type ?? '',
        ticketPrice,
        rentalAmount,
        orderAmount: ticketPrice + rentalAmount,
        displayOrderNumber: createDisplayOrderNumber(visit),
        displayInvoiceNumber: '-',
        displayInvoiceStatus: 'pending',
      }
    },

    findTicketByCode(ticketCode) {
      return this.ticketOptions.find((ticket) => ticket.ticket_code === ticketCode) ?? null
    },

    async fetchVisitRentals(visitId) {
      const res = await axios.get(`/api/member_visits/${visitId}/rentals`)
      return Array.isArray(res.data) ? res.data : []
    },

    matchesFilters(visit) {
      if (this.filters.phone) {
        const keyword = normalizeDigits(this.filters.phone)
        const target = normalizeDigits(visit.phone)
        if (!target.includes(keyword)) {
          return false
        }
      }

      if (this.filters.orderNumber) {
        const keyword = normalizeText(this.filters.orderNumber)
        if (!normalizeText(visit.displayOrderNumber).includes(keyword)) {
          return false
        }
      }

      if (this.filters.invoiceStatus) {
        if (normalizeText(visit.displayInvoiceStatus) !== normalizeText(this.filters.invoiceStatus)) {
          return false
        }
      }

      if (this.filters.invoiceNumber) {
        const keyword = normalizeText(this.filters.invoiceNumber)
        if (!normalizeText(visit.displayInvoiceNumber).includes(keyword)) {
          return false
        }
      }

      if (this.filters.productCode) {
        const keyword = normalizeText(this.filters.productCode)
        const ticketCode = normalizeText(visit.ticketCode)
        const rentalCodes = visit.rentals.map((rental) => normalizeText(rental.rental_code))
        if (!ticketCode.includes(keyword) && !rentalCodes.some((code) => code.includes(keyword))) {
          return false
        }
      }

      if (this.filters.productName) {
        const keyword = normalizeText(this.filters.productName)
        const ticketName = normalizeText(visit.ticketName)
        const rentalNames = visit.rentals.map((rental) => normalizeText(rental.rental_name))
        if (!ticketName.includes(keyword) && !rentalNames.some((name) => name.includes(keyword))) {
          return false
        }
      }

      if (!this.matchesDateRange(visit.checkin_time)) {
        return false
      }

      return true
    },

    matchesDateRange(value) {
      if (!this.filters.startDate && !this.filters.endDate) {
        return true
      }

      const visitDate = new Date(value)
      if (Number.isNaN(visitDate.getTime())) {
        return false
      }

      if (this.filters.startDate) {
        const startDate = new Date(`${this.filters.startDate}T00:00:00`)
        if (visitDate < startDate) {
          return false
        }
      }

      if (this.filters.endDate) {
        const endDate = new Date(`${this.filters.endDate}T23:59:59`)
        if (visitDate > endDate) {
          return false
        }
      }

      return true
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

    formatCurrency(value) {
      const amount = Number(value ?? 0)
      return amount.toLocaleString('zh-TW')
    },

    openOrderDialog(visit) {
      this.selectedOrderVisit = visit
      this.isOrderDialogOpen = true
    },

    closeOrderDialog() {
      this.isOrderDialogOpen = false
      this.selectedOrderVisit = null
    },
  },

  watch: {
    filters: {
      async handler() {
        this.hasSearched = this.hasAnyFilter
        this.searchMessage = ''
        this.searchMessageType = ''

        if (!this.hasAnyFilter) {
          return
        }

        if (this.filters.startDate && this.filters.endDate && this.filters.startDate > this.filters.endDate) {
          this.searchMessage = '入場時間的開始日期不能晚於結束日期。'
          this.searchMessageType = 'error'
          return
        }

        if (
          this.filters.orderNumber
          || this.filters.invoiceStatus
          || this.filters.invoiceNumber
        ) {
          this.searchMessage = '訂單編號、發票狀態、發票號碼目前先用前端占位資料做快速搜尋。'
          this.searchMessageType = 'info'
        }

        if (!this.hasLoadedVisits) {
          await this.preloadSearchData()
        }
      },
      deep: true,
    },
  },
}
</script>

<style scoped>
.visit-history-page {
  --page-bg: linear-gradient(180deg, #eef5ef 0%, #f8fbf8 100%);
  --panel-bg: rgba(255, 255, 255, 0.94);
  --panel-border: rgba(44, 83, 67, 0.16);
  --text-main: #1f3128;
  --text-soft: #697f73;
  --accent: #35506e;
  --accent-strong: #294562;
  --mint: #4ab985;
  --shadow-soft: 0 18px 42px rgba(36, 66, 52, 0.12);
  --error: #b13d34;
  margin: 0 auto;
  min-height: 100%;
  max-width: 1480px;
  padding: 32px 24px 40px;
  color: var(--text-main);
  background: var(--page-bg);
}

.history-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.history-eyebrow,
.results-tag {
  margin: 0 0 8px;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.history-hero h1,
.results-header h2,
.member-dialog-header h2,
.detail-section h3 {
  margin: 0;
}

.history-description {
  max-width: 760px;
  margin: 12px 0 0;
  color: var(--text-soft);
  line-height: 1.7;
}

.history-clock-card,
.search-card,
.results-card,
.member-dialog {
  border: 1px solid var(--panel-border);
  border-radius: 24px;
  background: var(--panel-bg);
  box-shadow: var(--shadow-soft);
}

.history-clock-card {
  min-width: 220px;
  padding: 18px 20px;
}

.history-clock-label {
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
  border: 2px solid rgba(53, 80, 110, 0.12);
  border-radius: 18px;
  background: #fff;
  color: var(--text-main);
  font: inherit;
  padding: 14px 16px;
}

.search-field input:focus,
.search-field select:focus {
  outline: 2px solid rgba(74, 185, 133, 0.18);
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
.order-link-button,
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
  background: rgba(53, 80, 110, 0.08);
  color: var(--accent-strong);
  box-shadow: inset 0 0 0 1px rgba(53, 80, 110, 0.18);
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

.results-empty {
  color: var(--text-soft);
  line-height: 1.7;
  padding: 18px 0 6px;
}

.results-empty-cell {
  color: var(--text-soft);
  text-align: center !important;
  line-height: 1.7;
  padding: 28px 16px !important;
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
  border-bottom: 1px solid rgba(44, 83, 67, 0.12);
  text-align: left;
  vertical-align: middle;
}

.results-table th {
  background: #4ab985;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.order-link-button {
  background: transparent;
  color: #2b6cb0;
  padding: 0;
  text-decoration: underline;
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
  background: #fdfefd;
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
  background: rgba(53, 80, 110, 0.08);
  color: var(--accent-strong);
  font-size: 24px;
  line-height: 1;
}

.order-detail {
  display: grid;
  gap: 18px;
}

.order-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-item,
.detail-section,
.rental-card {
  border: 1px solid rgba(44, 83, 67, 0.12);
  border-radius: 18px;
  background: #fff;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
}

.summary-item span,
.detail-empty {
  color: var(--text-soft);
}

.detail-section {
  padding: 16px;
}

.detail-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-price {
  color: var(--accent-strong);
  font-weight: 700;
}

.detail-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(74, 185, 133, 0.12);
  color: #266247;
  font-weight: 700;
  padding: 8px 12px;
}

.detail-empty {
  margin: 0;
  line-height: 1.6;
}

.detail-empty.is-error {
  color: var(--error);
}

.rental-list {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.rental-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
}

.rental-name {
  margin: 0;
  font-weight: 700;
}

.rental-code {
  margin: 4px 0 0;
  color: var(--text-soft);
  font-size: 13px;
}

.rental-price {
  white-space: nowrap;
}

@media (max-width: 1180px) {
  .search-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .history-hero,
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
  .visit-history-page {
    padding: 24px 16px 32px;
  }

  .search-grid,
  .order-summary-grid {
    grid-template-columns: 1fr;
  }

  .history-clock-card {
    width: 100%;
  }

  .rental-card,
  .detail-section-header {
    flex-direction: column;
    align-items: stretch;
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
