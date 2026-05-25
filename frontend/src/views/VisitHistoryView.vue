<template>
  <div class="visit-history-page">
    <section class="history-hero">
      <div>
        <p class="history-eyebrow">Visit History</p>
        <h1>交易紀錄總覽</h1>
        <p class="history-description">
          左側顯示今天的入場狀況，右側保留全部歷史紀錄，方便櫃台快速查詢。
        </p>
      </div>
      <div class="history-clock-card">
        <span class="history-clock-label">目前時間</span>
        <strong>{{ datetime }}</strong>
      </div>
    </section>

    <section class="history-layout">
      <article class="history-panel accent-today">
        <div class="panel-header">
          <div>
            <p class="panel-tag">Today</p>
            <h2>當日入場</h2>
          </div>
          <button
            type="button"
            class="panel-action"
            :disabled="isLoadingTodayVisits"
            @click="fetchTodayVisits"
          >
            {{ isLoadingTodayVisits ? '更新中...' : '重新整理' }}
          </button>
        </div>

        <p class="panel-meta">共 {{ todayVisitRecords.length }} 筆</p>
        <p v-if="todayVisitError" class="panel-message is-error">{{ todayVisitError }}</p>
        <p v-else-if="isLoadingTodayVisits" class="panel-message">正在載入今日入場紀錄...</p>
        <p v-else-if="!todayVisitRecords.length" class="panel-message">今天還沒有入場紀錄。</p>

        <div v-else class="visit-list">
          <article
            v-for="visit in todayVisitRecords"
            :key="visit.visit_id"
            class="visit-card"
          >
            <div class="visit-card-main">
              <div>
                <p class="visit-member">{{ visit.member_name }}</p>
                <p class="visit-code">{{ visit.member_code }}</p>
              </div>
              <span class="visit-type">{{ visit.visit_type || '未指定票種' }}</span>
            </div>

            <div class="visit-card-info">
              <span>{{ formatDateTime(visit.checkin_time) }}</span>
              <button
                type="button"
                class="record-link-button"
                :disabled="visit.rentalsLoading"
                @click="openRentalDialog(visit)"
              >
                {{ visit.rentalsLoading ? '讀取中...' : '查看租借' }}
              </button>
            </div>
          </article>
        </div>
      </article>

      <article class="history-panel accent-all">
        <div class="panel-header">
          <div>
            <p class="panel-tag">Archive</p>
            <h2>歷史所有入場</h2>
          </div>
          <button
            type="button"
            class="panel-action"
            :disabled="isLoadingAllVisits"
            @click="fetchAllVisits"
          >
            {{ isLoadingAllVisits ? '更新中...' : '重新整理' }}
          </button>
        </div>

        <p class="panel-meta">共 {{ allVisitRecords.length }} 筆</p>
        <p v-if="allVisitError" class="panel-message is-error">{{ allVisitError }}</p>
        <p v-else-if="isLoadingAllVisits" class="panel-message">正在載入全部歷史紀錄...</p>
        <p v-else-if="!allVisitRecords.length" class="panel-message">目前還沒有任何入場紀錄。</p>

        <div v-else class="visit-table-shell">
          <table class="visit-table">
            <thead>
              <tr>
                <th>會員編號</th>
                <th>姓名</th>
                <th>票種</th>
                <th>入場時間</th>
                <th>租借</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="visit in allVisitRecords" :key="visit.visit_id">
                <td>{{ visit.member_code }}</td>
                <td>{{ visit.member_name }}</td>
                <td>{{ visit.visit_type || '未指定票種' }}</td>
                <td>{{ formatDateTime(visit.checkin_time) }}</td>
                <td>
                  <button
                    type="button"
                    class="record-link-button"
                    :disabled="visit.rentalsLoading"
                    @click="openRentalDialog(visit)"
                  >
                    {{ visit.rentalsLoading ? '讀取中...' : '查看租借' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <div
      v-if="isRentalDialogOpen"
      class="member-dialog-overlay"
      @click.self="closeRentalDialog"
    >
      <aside class="member-dialog" aria-label="租借明細">
        <div class="member-dialog-header">
          <div>
            <p class="panel-tag">Rental Detail</p>
            <h2>租借明細</h2>
          </div>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉租借明細"
            @click="closeRentalDialog"
          >
            ×
          </button>
        </div>

        <div v-if="selectedRentalVisit">
          <p class="dialog-summary">
            {{ selectedRentalVisit.member_code }} ｜ {{ selectedRentalVisit.member_name }} ｜ {{ formatDateTime(selectedRentalVisit.checkin_time) }}
          </p>

          <p v-if="selectedRentalVisit.rentalsLoading" class="panel-message">正在載入租借明細...</p>
          <p v-else-if="selectedRentalVisit.rentalsError" class="panel-message is-error">
            {{ selectedRentalVisit.rentalsError }}
          </p>
          <p v-else-if="!selectedRentalVisit.rentals.length" class="panel-message">這筆入場沒有租借裝備。</p>

          <div v-else class="rental-list">
            <article
              v-for="rental in selectedRentalVisit.rentals"
              :key="rental.id"
              class="rental-card"
            >
              <div>
                <p class="rental-name">{{ rental.rental_name }}</p>
                <p class="rental-code">{{ rental.rental_code }}</p>
              </div>
              <strong class="rental-price">${{ rental.rental_price }}</strong>
            </article>
          </div>
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
      datetime: '',
      clockTimer: null,
      todayVisitRecords: [],
      allVisitRecords: [],
      isLoadingTodayVisits: false,
      isLoadingAllVisits: false,
      todayVisitError: '',
      allVisitError: '',
      isRentalDialogOpen: false,
      selectedRentalVisit: null,
    }
  },

  methods: {
    updateCurrentDateTime() {
      this.datetime = new Date().toLocaleString('zh-TW', { hour12: false })
    },

    async fetchTodayVisits() {
      this.isLoadingTodayVisits = true
      this.todayVisitError = ''

      try {
        const res = await axios.get('/api/member_visits?scope=today')
        this.todayVisitRecords = decorateVisits(Array.isArray(res.data) ? res.data : [])
        await this.populateVisitRentals(this.todayVisitRecords)
      } catch (err) {
        console.error('載入當日入場紀錄失敗', err)
        this.todayVisitError = '載入當日入場紀錄失敗'
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
        console.error('載入歷史入場紀錄失敗', err)
        this.allVisitError = '載入歷史入場紀錄失敗'
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
        console.error(`載入 visit ${visit.visit_id} 租借明細失敗`, err)
        visit.rentalsError = '載入租借明細失敗'
      } finally {
        visit.rentalsLoading = false
      }
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

    openRentalDialog(visit) {
      this.selectedRentalVisit = visit
      this.isRentalDialogOpen = true
    },

    closeRentalDialog() {
      this.isRentalDialogOpen = false
      this.selectedRentalVisit = null
    },
  },
}
</script>

<style scoped>
.visit-history-page {
  --history-bg: linear-gradient(180deg, #fffaf3 0%, #f6efe3 100%);
  --panel-bg: rgba(255, 255, 255, 0.92);
  --panel-border: rgba(151, 104, 49, 0.14);
  --text-main: #33251a;
  --text-soft: #7d6653;
  --accent-today: #c8742f;
  --accent-all: #296d68;
  --shadow-soft: 0 18px 40px rgba(93, 62, 31, 0.12);
  margin: 0 auto;
  min-height: 100%;
  max-width: 1380px;
  padding: 32px 24px 40px;
  color: var(--text-main);
  background: var(--history-bg);
}

.history-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.history-eyebrow,
.panel-tag {
  margin: 0 0 8px;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.history-hero h1,
.panel-header h2,
.member-dialog-header h2 {
  margin: 0;
}

.history-description {
  max-width: 680px;
  margin: 12px 0 0;
  color: var(--text-soft);
  line-height: 1.7;
}

.history-clock-card {
  min-width: 220px;
  border: 1px solid var(--panel-border);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.75);
  box-shadow: var(--shadow-soft);
  padding: 18px 20px;
}

.history-clock-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-soft);
  font-size: 13px;
}

.history-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.25fr);
  gap: 24px;
  align-items: start;
}

.history-panel {
  border: 1px solid var(--panel-border);
  border-radius: 26px;
  background: var(--panel-bg);
  box-shadow: var(--shadow-soft);
  padding: 22px;
  backdrop-filter: blur(6px);
}

.history-panel.accent-today {
  position: sticky;
  top: 24px;
}

.history-panel.accent-today .panel-action,
.history-panel.accent-today .visit-type {
  color: var(--accent-today);
}

.history-panel.accent-all .panel-action,
.history-panel.accent-all .visit-type {
  color: var(--accent-all);
}

.panel-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.panel-action {
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 0 0 1px rgba(51, 37, 26, 0.1);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 10px 16px;
}

.panel-action:disabled {
  opacity: 0.55;
  cursor: wait;
}

.panel-meta,
.panel-message,
.dialog-summary {
  color: var(--text-soft);
}

.panel-meta {
  margin: 0 0 18px;
}

.panel-message {
  margin: 0;
  line-height: 1.6;
}

.panel-message.is-error {
  color: #b33b2f;
}

.visit-list {
  display: grid;
  gap: 14px;
}

.visit-card {
  border: 1px solid rgba(151, 104, 49, 0.14);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 243, 235, 0.92) 100%);
  padding: 18px;
}

.visit-card-main,
.visit-card-info,
.rental-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.visit-card-info {
  margin-top: 16px;
  color: var(--text-soft);
  font-size: 14px;
}

.visit-member,
.rental-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.visit-code,
.rental-code {
  margin: 4px 0 0;
  color: var(--text-soft);
  font-size: 13px;
}

.visit-type {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 0 0 1px rgba(51, 37, 26, 0.08);
  font-size: 13px;
  font-weight: 700;
  padding: 8px 12px;
  white-space: nowrap;
}

.visit-table-shell {
  overflow-x: auto;
}

.visit-table {
  width: 100%;
  border-collapse: collapse;
}

.visit-table th,
.visit-table td {
  padding: 14px 12px;
  border-bottom: 1px solid rgba(151, 104, 49, 0.12);
  text-align: left;
  white-space: nowrap;
}

.visit-table th {
  color: var(--text-soft);
  font-size: 13px;
  font-weight: 700;
}

.record-link-button {
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 0 0 1px rgba(51, 37, 26, 0.1);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 8px 12px;
}

.record-link-button:disabled {
  opacity: 0.55;
  cursor: wait;
}

.member-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(32, 20, 10, 0.35);
  backdrop-filter: blur(4px);
}

.member-dialog {
  position: fixed;
  top: 0;
  right: 0;
  width: min(430px, 92vw);
  height: 100vh;
  box-sizing: border-box;
  overflow-y: auto;
  background: #fffaf6;
  box-shadow: -16px 0 40px rgba(44, 30, 17, 0.18);
  padding: 24px;
  animation: slide-in-from-right 0.25s ease;
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
  border: 0;
  border-radius: 999px;
  background: rgba(51, 37, 26, 0.08);
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}

.rental-list {
  display: grid;
  gap: 12px;
}

.rental-card {
  border: 1px solid rgba(151, 104, 49, 0.12);
  border-radius: 18px;
  background: #fff;
  padding: 14px 16px;
}

.rental-price {
  white-space: nowrap;
}

@media (max-width: 960px) {
  .history-layout {
    grid-template-columns: 1fr;
  }

  .history-panel.accent-today {
    position: static;
  }
}

@media (max-width: 720px) {
  .visit-history-page {
    padding: 24px 16px 32px;
  }

  .history-hero,
  .panel-header,
  .visit-card-main,
  .visit-card-info,
  .rental-card,
  .member-dialog-header {
    flex-direction: column;
    align-items: stretch;
  }

  .history-clock-card {
    width: 100%;
  }

  .visit-type,
  .panel-action,
  .record-link-button {
    justify-content: center;
    text-align: center;
  }

  .visit-table th,
  .visit-table td {
    padding: 12px 10px;
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
