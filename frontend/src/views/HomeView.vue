<template>
  <section class="home-dashboard">
    <div class="dashboard-scroll">
      <p v-if="errorMessage" class="dashboard-message dashboard-message--error">
        {{ errorMessage }}
      </p>

      <div class="dashboard-grid">
        <section class="dashboard-card bulletin-card">
          <header class="card-header">
            <div class="bulletin-title-group">
              <h2>留言板</h2>
              <span class="bulletin-count">{{ bulletinItems.length }}</span>
            </div>
            <div class="bulletin-actions">
              <button
                type="button"
                class="bulletin-history-button"
                @click="openBulletinHistoryDialog"
              >
                過往留言
              </button>
              <button
                type="button"
                class="icon-add-button"
                aria-label="新增留言"
                @click="openBulletinDialog"
              >
                +
              </button>
            </div>
          </header>

          <div class="bulletin-frame">
            <p v-if="isLoading" class="empty-state">載入資料中...</p>
            <p v-else-if="!bulletinItems.length" class="empty-state">
              目前沒有留言，點右上角新增第一則資訊。
            </p>

            <article
              v-for="item in bulletinItems"
              :key="item.id"
              class="bulletin-item"
              :class="{ 'bulletin-item--pinned': Number(item.status) === 4 }"
              @click="openEditBulletinDialog(item)"
            >
              <div class="bulletin-item__meta">
                <span class="status-pill" :class="statusClass(item.status)">
                  {{ statusLabel(item.status) }}
                </span>
                <span class="bulletin-author">{{ bulletinAuthor(item) }}</span>
              </div>
              <p>{{ item.content }}</p>
              <time>{{ formatDateTime(item.updated_at || item.created_at) }}</time>
            </article>
          </div>
        </section>

        <section class="dashboard-card price-card">
          <header class="card-header">
            <h2>價格總覽</h2>
          </header>

          <div class="segmented-tabs">
            <button
              v-for="tab in priceTabs"
              :key="tab.key"
              type="button"
              class="segmented-tab"
              :class="{ 'segmented-tab--active': activePriceTab === tab.key }"
              @click="activePriceTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="table-scroll">
            <table v-if="activePriceTab === 'ticket'" class="price-table price-table--ticket">
              <thead>
                <tr>
                  <th rowspan="2">類型</th>
                  <th :colspan="ticketColumnCount">價格</th>
                </tr>
                <tr>
                  <th v-for="column in ticketPriceColumns" :key="column.key">{{ column.label }}</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="ticketPriceMatrixRows.length">
                  <template v-for="group in ticketPriceMatrixRows" :key="group.type">
                    <tr>
                      <td :rowspan="2" class="price-type-cell">{{ group.type }}</td>
                      <td
                        v-if="group.mergeLabelRow"
                        :colspan="ticketColumnCount"
                        class="price-ticket-name-cell"
                      >
                        {{ group.mergeLabelText }}
                      </td>
                      <td
                        v-else
                        v-for="item in group.items"
                        :key="`${group.type}-${item.key}-label`"
                        class="price-ticket-name-cell"
                      >
                        {{ item.ticketName }}
                      </td>
                    </tr>
                    <tr>
                      <td
                        v-for="item in group.items"
                        :key="`${group.type}-${item.key}-price`"
                        class="price-ticket-value-cell"
                      >
                        ${{ formatCurrency(item.price) }}
                      </td>
                    </tr>
                  </template>
                </template>
                <tr v-else>
                  <td :colspan="ticketColumnCount + 1" class="empty-row">目前沒有可顯示的價格資料</td>
                </tr>
              </tbody>
            </table>

            <table v-else class="price-table">
              <thead>
                <tr>
                  <th>{{ currentPriceConfig.primaryLabel }}</th>
                  <th>價格</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in currentPriceRows" :key="row.key">
                  <td>{{ row.primary }}</td>
                  <td>${{ formatCurrency(row.price) }}</td>
                  <td>{{ Number(row.is_active) === 1 ? '啟用中' : '停用中' }}</td>
                </tr>
                <tr v-if="!currentPriceRows.length">
                  <td colspan="3" class="empty-row">
                    目前沒有可顯示的價格資料
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="dashboard-card stats-card">
          <header class="card-header">
            <h2>當日票券</h2>
          </header>

          <div class="ticket-summary-grid">
            <article v-for="group in todayTicketGroups" :key="group.key" class="ticket-summary-card">
              <div class="ticket-summary-card__header">
                <h3>{{ group.label }}</h3>
                <strong>{{ formatInteger(group.total) }}</strong>
              </div>
              <div class="ticket-summary-lines">
                <p v-for="item in group.items" :key="item.label">
                  <span>{{ item.label }}</span>
                  <strong>{{ formatInteger(item.count) }}</strong>
                </p>
              </div>
            </article>
          </div>
        </section>

        <section class="dashboard-card people-card">
          <header class="card-header card-header--split">
            <h2>人數總覽</h2>
            <span class="updated-at">更新時間: {{ lastUpdatedLabel }}</span>
          </header>

          <div class="people-grid">
            <article class="metric-card">
              <h3>前 3 HR 內人數</h3>
              <strong>{{ formatInteger(visitMetrics.lastThreeHours) }}</strong>
              <p>前 3 HR: {{ formatInteger(visitMetrics.lastThreeHours) }}</p>
            </article>

            <article class="metric-card">
              <h3>當日人數</h3>
              <strong>{{ formatInteger(visitMetrics.today) }}</strong>
              <p>昨天: {{ formatInteger(visitMetrics.yesterday) }}</p>
            </article>

            <article class="metric-card">
              <h3>當周平日</h3>
              <span class="metric-range">{{ visitMetrics.currentWeekdayRange }}</span>
              <strong>{{ formatInteger(visitMetrics.currentWeekday) }}</strong>
              <p>上週: {{ formatInteger(visitMetrics.previousWeekday) }}</p>
              <span class="metric-subrange">{{ visitMetrics.previousWeekdayRange }}</span>
            </article>

            <article class="metric-card">
              <h3>當周假日</h3>
              <span class="metric-range">{{ visitMetrics.currentWeekendRange }}</span>
              <strong>{{ formatInteger(visitMetrics.currentWeekend) }}</strong>
              <p>上週: {{ formatInteger(visitMetrics.previousWeekend) }}</p>
              <span class="metric-subrange">{{ visitMetrics.previousWeekendRange }}</span>
            </article>
          </div>
        </section>
      </div>

      <section class="dashboard-card schedule-card">
        <header class="card-header card-header--split">
          <div class="title-row">
            <h2>預約課程</h2>
            <span class="date-range">{{ reservationWeekLabel }}</span>
          </div>

          <div class="toolbar-row">
            <div class="pill-toggle">
              <button
                type="button"
                class="pill-toggle__button"
                :class="{ 'pill-toggle__button--active pill-toggle__button--green': reservationMode === 'rope' }"
                @click="reservationMode = 'rope'"
              >
                上攀
              </button>
              <button
                type="button"
                class="pill-toggle__button"
                :class="{ 'pill-toggle__button--active pill-toggle__button--blue': reservationMode === 'bouldering' }"
                @click="reservationMode = 'bouldering'"
              >
                抱石
              </button>
            </div>

            <div class="arrow-controls">
              <button type="button" class="round-arrow" @click="reservationWeekOffset -= 1">&lt;</button>
              <button type="button" class="round-arrow" @click="reservationWeekOffset += 1">&gt;</button>
            </div>
          </div>
        </header>

        <div class="timeline-panel">
          <div class="timeline-head">
            <div class="timeline-corner"></div>
            <div v-for="day in reservationWeekDays" :key="day.key" class="timeline-day-head">
              {{ day.label }}
            </div>
          </div>

          <div class="timeline-body">
            <div class="timeline-times" :style="timelineRowsStyle(reservationTimeSlots.length, 52)">
              <div v-for="slot in reservationTimeSlots" :key="slot.value" class="timeline-time">
                {{ slot.label }}
              </div>
            </div>

            <div class="timeline-columns">
              <div
                v-for="day in reservationWeekDays"
                :key="day.key"
                class="timeline-day-column"
                :style="timelineRowsStyle(reservationTimeSlots.length, 52)"
              >
                <div v-for="slot in reservationTimeSlots" :key="`${day.key}-${slot.value}`" class="timeline-cell"></div>
                <div
                  v-if="day.businessHours"
                  class="timeline-open-window timeline-open-window--green"
                  :style="timeWindowStyle(day.businessHours.open_time, day.businessHours.close_time, reservationRange.startMinutes, 60, 52)"
                ></div>
              </div>
            </div>
          </div>

          <p class="timeline-note">
            {{ reservationMode === 'rope' ? '上攀' : '抱石' }}課程資料表尚未建立，這裡先保留前端欄位與週切換版型。
          </p>
        </div>
      </section>

      <section class="dashboard-card schedule-card">
        <header class="card-header card-header--split">
          <div class="title-row">
            <h2>當周班表</h2>
            <span class="date-range">{{ scheduleWeekLabel }}</span>
          </div>
        </header>

        <div class="timeline-panel">
          <div class="timeline-head">
            <div class="timeline-corner"></div>
            <div v-for="day in scheduleWeekDays" :key="day.key" class="timeline-day-head">
              {{ day.label }}
            </div>
          </div>

          <div class="timeline-body">
            <div class="timeline-times" :style="timelineRowsStyle(scheduleTimeSlots.length, 48)">
              <div v-for="slot in scheduleTimeSlots" :key="slot.value" class="timeline-time">
                {{ slot.label }}
              </div>
            </div>

            <div class="timeline-columns">
              <div
                v-for="day in scheduleWeekDays"
                :key="day.key"
                class="timeline-day-column timeline-day-column--schedule"
                :style="timelineRowsStyle(scheduleTimeSlots.length, 48)"
              >
                <div v-for="slot in scheduleTimeSlots" :key="`${day.key}-${slot.value}`" class="timeline-cell"></div>
                <div
                  v-if="day.businessHours"
                  class="timeline-open-window timeline-open-window--blue"
                  :style="timeWindowStyle(day.businessHours.open_time, day.businessHours.close_time, scheduleRange.startMinutes, 30, 48)"
                ></div>

                <article
                  v-for="shift in scheduleEventsByDate[day.key] || []"
                  :key="shift.schedule_id"
                  class="timeline-event"
                  :style="scheduleEventStyle(shift)"
                >
                  <strong>{{ shift.staff_alias || shift.staff_name || shift.employee_id }}</strong>
                  <span>{{ shift.start_time }} - {{ shift.end_time }}</span>
                </article>
              </div>
            </div>
          </div>

          <p v-if="!weeklySchedules.length && !isLoading" class="timeline-note">
            本週尚未排班。
          </p>
        </div>
      </section>
    </div>

    <div v-if="isBulletinDialogOpen" class="dialog-overlay" @click.self="closeBulletinDialog">
      <section class="dialog-card">
        <div class="dialog-header">
          <div>
            <p class="dialog-kicker">Bulletin Board</p>
            <h3>{{ editingBulletinId ? '編輯留言' : '新增留言' }}</h3>
          </div>
          <button type="button" class="dialog-close-button" @click="closeBulletinDialog">X</button>
        </div>

        <form class="bulletin-form" @submit.prevent="submitBulletin">
          <label class="form-field">
            <span>留言狀態</span>
            <select v-model.number="bulletinForm.status">
              <option :value="1">已發布</option>
              <option v-if="editingBulletinId" :value="2">已完成</option>
              <option v-if="editingBulletinId" :value="3">已取消</option>
              <option :value="4">置頂</option>
            </select>
          </label>

          <label class="form-field">
            <span>留言內容</span>
            <textarea
              v-model.trim="bulletinForm.content"
              rows="6"
              maxlength="500"
              placeholder="輸入完畢後，點擊空白處或按儲存送出。"
              required
            ></textarea>
          </label>

          <label
            v-if="editingBulletinId && shouldShowArchiveToggle"
            class="checkbox-field"
          >
            <input v-model="bulletinForm.moveToHistory" type="checkbox">
            <span>移至過往留言</span>
          </label>

          <p v-if="bulletinErrorMessage" class="dashboard-message dashboard-message--error">
            {{ bulletinErrorMessage }}
          </p>

          <div class="dialog-actions">
            <button type="button" class="secondary-button" @click="closeBulletinDialog">取消</button>
            <button type="submit" class="primary-button" :disabled="isSavingBulletin">
              {{ isSavingBulletin ? '儲存中...' : editingBulletinId ? '更新留言' : '儲存留言' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isBulletinHistoryDialogOpen" class="dialog-overlay" @click.self="closeBulletinHistoryDialog">
      <section class="dialog-card dialog-card--history">
        <div class="dialog-header">
          <div>
            <p class="dialog-kicker">Bulletin History</p>
            <h3>過往留言</h3>
          </div>
          <button type="button" class="dialog-close-button" @click="closeBulletinHistoryDialog">X</button>
        </div>

        <div class="history-list">
          <article
            v-for="item in bulletinHistoryItems"
            :key="`history-${item.id}`"
            class="history-item"
          >
            <div class="bulletin-item__meta">
              <span class="status-pill" :class="statusClass(item.status)">
                {{ statusLabel(item.status) }}
              </span>
              <span class="bulletin-author">{{ bulletinAuthor(item) }}</span>
            </div>
            <p>{{ item.content }}</p>
            <time>{{ formatDateTime(item.updated_at || item.created_at) }}</time>
          </article>
          <p v-if="!bulletinHistoryItems.length" class="empty-state">目前沒有過往留言。</p>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
import axios from 'axios'
import { getStoredAuth } from '../utils/auth'

const PRICE_TABS = [
  { key: 'ticket', label: '進場票券', primaryLabel: '類型', secondaryLabel: '票券' },
  { key: 'rental', label: '設備租借', primaryLabel: '品項', secondaryLabel: '' },
  { key: 'product', label: '商品販售', primaryLabel: '商品', secondaryLabel: '' },
]

const WEEKDAY_SHORT = ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.']
const TICKET_CODE_FALLBACKS = {
  longTerm: ['TK0005'],
  month: [],
  quarter: [],
  halfYear: [],
  year: [],
  earlyBird: ['TK0002'],
  weekdaySingle: ['TK0001'],
  weekendSingle: ['TK0003'],
  starlight: ['TK0004'],
  student: ['TK0006'],
  child: ['TK0007'],
  experience: ['TK0008'],
  corporate: ['TK0009'],
}
const STAFF_COLORS = ['#d9f2cc', '#bfe6fb', '#fce6bc', '#f9c7d1', '#d9d2ff', '#c9f0e8']

const createEmptyBulletinForm = () => ({
  content: '',
  status: 1,
  moveToHistory: false,
})

const parseDate = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

const pad = (value) => String(value).padStart(2, '0')

const formatDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const formatMinutes = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

const timeToMinutes = (value) => {
  const [hours = '0', minutes = '0'] = String(value ?? '').slice(0, 5).split(':')
  return Number(hours) * 60 + Number(minutes)
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date, amount) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

const startOfWeekSunday = (date) => {
  const next = startOfDay(date)
  next.setDate(next.getDate() - next.getDay())
  return next
}

const startOfWeekMonday = (date) => {
  const next = startOfDay(date)
  const offset = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - offset)
  return next
}

const buildSlots = (startMinutes, endMinutes, stepMinutes) => {
  const slots = []
  for (let value = startMinutes; value <= endMinutes; value += stepMinutes) {
    slots.push({
      value,
      label: formatMinutes(value),
    })
  }
  return slots
}

const normalizeText = (value) => String(value ?? '').trim()

const matchesTicket = (ticket, keywords, fallbackCodes = []) => {
  const name = normalizeText(ticket?.ticket_name)
  const code = normalizeText(ticket?.ticket_code).toUpperCase()

  if (keywords.some((keyword) => name.includes(keyword))) {
    return true
  }

  return fallbackCodes.includes(code)
}

export default {
  name: 'HomeView',
  data() {
    return {
      priceTabs: PRICE_TABS,
      activePriceTab: 'ticket',
      bulletinItems: [],
      tickets: [],
      rentals: [],
      products: [],
      businessHours: [],
      memberVisits: [],
      weeklySchedules: [],
      isLoading: false,
      errorMessage: '',
      lastUpdatedAt: null,
      refreshTimer: null,
      reservationMode: 'rope',
      reservationWeekOffset: 0,
      isBulletinDialogOpen: false,
      isBulletinHistoryDialogOpen: false,
      isSavingBulletin: false,
      bulletinErrorMessage: '',
      editingBulletinId: null,
      bulletinForm: createEmptyBulletinForm(),
      bulletinHistoryItems: [],
    }
  },
  computed: {
    shouldShowArchiveToggle() {
      return [2, 3].includes(Number(this.bulletinForm.status))
    },
    currentPriceConfig() {
      return this.priceTabs.find((tab) => tab.key === this.activePriceTab) || this.priceTabs[0]
    },
    currentPriceRows() {
      if (this.activePriceTab === 'rental') {
        return this.rentalPriceRows
      }

      if (this.activePriceTab === 'product') {
        return this.productPriceRows
      }

      return []
    },
    ticketPriceMatrixRows() {
      return this.ticketPriceGroups.map((group) => ({
        type: group.type,
        mergeLabelRow: Boolean(group.mergeLabelRow),
        mergeLabelText: group.mergeLabelText || '',
        items: group.matchers.map((matcher, index) => {
          const ticket = this.findTicketByMatcher(matcher)
          return {
            key: matcher,
            ticketName: ticket?.ticket_name || group.orderedLabels[index],
            price: Number(ticket?.ticket_price ?? 0),
          }
        }),
      }))
    },
    ticketPriceGroups() {
      return [
        {
          type: '單次票',
          matchers: ['earlyBird', 'weekdaySingle', 'weekendSingle', 'starlight'],
          orderedLabels: ['平日早鳥', '平日單次', '假日單次', '星光票'],
        },
        {
          type: '多元票',
          matchers: ['student', 'child', 'experience', 'corporate'],
          orderedLabels: ['學生票', '兒童票', '體驗票', '公司票'],
        },
        {
          type: '長期票',
          matchers: ['longTerm', '', '', ''],
          orderedLabels: ['長期票', '', '', ''],
          mergeLabelRow: true,
          mergeLabelText: '長期票',
        },
      ]
    },
    ticketColumnCount() {
      return Math.max(...this.ticketPriceGroups.map((group) => group.matchers.length), 0)
    },
    ticketPriceColumns() {
      return Array.from({ length: this.ticketColumnCount }, (_, index) => ({
        key: `ticket-column-${index}`,
        label: '',
      }))
    },
    rentalPriceRows() {
      return this.rentals.map((item) => ({
        key: item.rental_id,
        primary: item.rental_name,
        price: Number(item.rental_price ?? 0),
        is_active: item.is_active,
      }))
    },
    productPriceRows() {
      return this.products.map((item) => ({
        key: item.product_id,
        primary: item.product_name,
        price: Number(item.product_price ?? 0),
        is_active: item.is_active,
      }))
    },
    todayTicketGroups() {
      return [
        {
          key: 'long-term',
          label: '長期票',
          total: this.ticketVisitCountByMatcher('month') + this.ticketVisitCountByMatcher('quarter') + this.ticketVisitCountByMatcher('halfYear') + this.ticketVisitCountByMatcher('year'),
          items: [
            { label: '月', count: this.ticketVisitCountByMatcher('month') },
            { label: '季', count: this.ticketVisitCountByMatcher('quarter') },
            { label: '半年', count: this.ticketVisitCountByMatcher('halfYear') },
            { label: '年', count: this.ticketVisitCountByMatcher('year') },
          ],
        },
        {
          key: 'single',
          label: '單次票',
          total: this.ticketVisitCountByMatcher('earlyBird') + this.ticketVisitCountByMatcher('singleCombined') + this.ticketVisitCountByMatcher('starlight'),
          items: [
            { label: '早鳥', count: this.ticketVisitCountByMatcher('earlyBird') },
            { label: '單次', count: this.ticketVisitCountByMatcher('singleCombined') },
            { label: '星光', count: this.ticketVisitCountByMatcher('starlight') },
          ],
        },
        {
          key: 'multi',
          label: '多元票',
          total: this.ticketVisitCountByMatcher('student') + this.ticketVisitCountByMatcher('child') + this.ticketVisitCountByMatcher('experience') + this.ticketVisitCountByMatcher('corporate'),
          items: [
            { label: '學生', count: this.ticketVisitCountByMatcher('student') },
            { label: '兒童', count: this.ticketVisitCountByMatcher('child') },
            { label: '體驗', count: this.ticketVisitCountByMatcher('experience') },
            { label: '公司票', count: this.ticketVisitCountByMatcher('corporate') },
          ],
        },
      ]
    },
    visitMetrics() {
      const now = new Date()
      const visits = this.memberVisits
        .map((visit) => ({ ...visit, parsedCheckin: parseDate(visit.checkin_time) }))
        .filter((visit) => visit.parsedCheckin)

      const todayStart = startOfDay(now)
      const tomorrowStart = addDays(todayStart, 1)
      const yesterdayStart = addDays(todayStart, -1)
      const lastThreeHoursStart = new Date(now.getTime() - 3 * 60 * 60 * 1000)

      const statsWeekStart = startOfWeekMonday(now)
      const currentWeekdayStart = statsWeekStart
      const currentWeekdayEnd = addDays(statsWeekStart, 5)
      const currentWeekendStart = addDays(statsWeekStart, 5)
      const currentWeekendEnd = addDays(statsWeekStart, 7)
      const previousWeekStart = addDays(statsWeekStart, -7)
      const previousWeekdayEnd = addDays(previousWeekStart, 5)
      const previousWeekendStart = addDays(previousWeekStart, 5)
      const previousWeekendEnd = addDays(previousWeekStart, 7)

      return {
        lastThreeHours: visits.filter((visit) => visit.parsedCheckin >= lastThreeHoursStart && visit.parsedCheckin < tomorrowStart).length,
        today: visits.filter((visit) => visit.parsedCheckin >= todayStart && visit.parsedCheckin < tomorrowStart).length,
        yesterday: visits.filter((visit) => visit.parsedCheckin >= yesterdayStart && visit.parsedCheckin < todayStart).length,
        currentWeekday: visits.filter((visit) => visit.parsedCheckin >= currentWeekdayStart && visit.parsedCheckin < currentWeekdayEnd).length,
        currentWeekend: visits.filter((visit) => visit.parsedCheckin >= currentWeekendStart && visit.parsedCheckin < currentWeekendEnd).length,
        previousWeekday: visits.filter((visit) => visit.parsedCheckin >= previousWeekStart && visit.parsedCheckin < previousWeekdayEnd).length,
        previousWeekend: visits.filter((visit) => visit.parsedCheckin >= previousWeekendStart && visit.parsedCheckin < previousWeekendEnd).length,
        currentWeekdayRange: this.formatCompactRange(currentWeekdayStart, addDays(currentWeekdayEnd, -1)),
        currentWeekendRange: this.formatCompactRange(currentWeekendStart, addDays(currentWeekendEnd, -1)),
        previousWeekdayRange: this.formatCompactRange(previousWeekStart, addDays(previousWeekdayEnd, -1)),
        previousWeekendRange: this.formatCompactRange(previousWeekendStart, addDays(previousWeekendEnd, -1)),
      }
    },
    lastUpdatedLabel() {
      return this.lastUpdatedAt ? this.formatDateTime(this.lastUpdatedAt) : '--'
    },
    scheduleWeekDays() {
      const start = startOfWeekSunday(new Date())
      return Array.from({ length: 7 }, (_, index) => {
        const date = addDays(start, index)
        return {
          key: formatDateKey(date),
          date,
          label: WEEKDAY_SHORT[index],
          businessHours: this.businessHoursForDate(date),
        }
      })
    },
    reservationWeekDays() {
      const current = addDays(new Date(), this.reservationWeekOffset * 7)
      const start = startOfWeekSunday(current)
      return Array.from({ length: 7 }, (_, index) => {
        const date = addDays(start, index)
        return {
          key: formatDateKey(date),
          date,
          label: WEEKDAY_SHORT[index],
          businessHours: this.businessHoursForDate(date),
        }
      })
    },
    scheduleWeekLabel() {
      return this.createFullRangeLabel(this.scheduleWeekDays)
    },
    reservationWeekLabel() {
      return this.createFullRangeLabel(this.reservationWeekDays)
    },
    scheduleRange() {
      return this.buildRangeFromWeek(this.scheduleWeekDays, 30, 10 * 60, 22 * 60)
    },
    reservationRange() {
      return this.buildRangeFromWeek(this.reservationWeekDays, 60, 10 * 60, 22 * 60)
    },
    scheduleTimeSlots() {
      return buildSlots(this.scheduleRange.startMinutes, this.scheduleRange.endMinutes, 30)
    },
    reservationTimeSlots() {
      return buildSlots(this.reservationRange.startMinutes, this.reservationRange.endMinutes, 60)
    },
    scheduleEventsByDate() {
      return this.weeklySchedules.reduce((grouped, item) => {
        const key = normalizeText(item.work_date).slice(0, 10)
        if (!grouped[key]) {
          grouped[key] = []
        }
        grouped[key].push(item)
        return grouped
      }, {})
    },
  },
  mounted() {
    this.initializeDashboard()
    this.refreshTimer = window.setInterval(() => {
      this.refreshDashboard()
    }, 60000)
  },
  beforeUnmount() {
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer)
    }
  },
  methods: {
    async initializeDashboard() {
      this.isLoading = true
      this.errorMessage = ''

      try {
        await this.refreshDashboard()
      } catch (error) {
        console.error('home dashboard initialize error', error)
        this.errorMessage = '讀取儀表板資料失敗。'
      } finally {
        this.isLoading = false
      }
    },
    async refreshDashboard() {
      await Promise.all([
        this.fetchBulletins(),
        this.fetchPricing(),
        this.fetchVisits(),
        this.fetchBusinessHours(),
        this.fetchWeeklySchedules(),
      ])
      this.lastUpdatedAt = new Date()
      this.errorMessage = ''
    },
    async fetchBulletins() {
      const response = await axios.get('/api/bulletin_board')
      this.bulletinItems = Array.isArray(response.data) ? response.data : []
    },
    async fetchBulletinHistory() {
      const response = await axios.get('/api/bulletin_board', {
        params: { includeInactive: 1 },
      })
      this.bulletinHistoryItems = (Array.isArray(response.data) ? response.data : [])
        .filter((item) => Number(item.is_active) === 0)
    },
    async fetchPricing() {
      const [tickets, rentals, products] = await Promise.all([
        axios.get('/api/ticket'),
        axios.get('/api/rental_equipment'),
        axios.get('/api/product'),
      ])

      this.tickets = Array.isArray(tickets.data) ? tickets.data : []
      this.rentals = Array.isArray(rentals.data) ? rentals.data : []
      this.products = Array.isArray(products.data) ? products.data : []
    },
    async fetchVisits() {
      const response = await axios.get('/api/member_visits', {
        params: { scope: 'all' },
      })
      this.memberVisits = Array.isArray(response.data) ? response.data : []
    },
    async fetchBusinessHours() {
      const response = await axios.get('/api/business_hours')
      this.businessHours = Array.isArray(response.data) ? response.data : []
    },
    async fetchWeeklySchedules() {
      const months = [...new Set(this.scheduleWeekDays.map((day) => day.key.slice(0, 7)))]
      const responses = await Promise.all(
        months.map((month) => axios.get('/api/staff_schedule', { params: { month } }))
      )

      const keys = new Set(this.scheduleWeekDays.map((day) => day.key))
      this.weeklySchedules = responses
        .flatMap((response) => (Array.isArray(response.data) ? response.data : []))
        .filter((item) => keys.has(normalizeText(item.work_date).slice(0, 10)))
    },
    openBulletinDialog() {
      this.bulletinErrorMessage = ''
      this.editingBulletinId = null
      this.bulletinForm = createEmptyBulletinForm()
      this.isBulletinDialogOpen = true
    },
    openEditBulletinDialog(item, fromHistory = false) {
      this.bulletinErrorMessage = ''
      this.editingBulletinId = Number(item.id)
      this.bulletinForm = {
        content: String(item.content ?? ''),
        status: Number(item.status) || 1,
        moveToHistory: Number(item.is_active) === 0,
      }
      this.isBulletinDialogOpen = true
      if (fromHistory) {
        this.isBulletinHistoryDialogOpen = false
      }
    },
    async openBulletinHistoryDialog() {
      await this.fetchBulletinHistory()
      this.isBulletinHistoryDialogOpen = true
    },
    closeBulletinHistoryDialog() {
      this.isBulletinHistoryDialogOpen = false
    },
    closeBulletinDialog() {
      this.isBulletinDialogOpen = false
      this.isSavingBulletin = false
      this.bulletinErrorMessage = ''
      this.editingBulletinId = null
      this.bulletinForm = createEmptyBulletinForm()
    },
    async submitBulletin() {
      const auth = getStoredAuth()
      if (!auth?.eid) {
        this.bulletinErrorMessage = '找不到登入員工資訊，無法新增留言。'
        return
      }

      if (!this.bulletinForm.content.trim()) {
        this.bulletinErrorMessage = '請輸入留言內容。'
        return
      }

      this.isSavingBulletin = true
      this.bulletinErrorMessage = ''

      try {
        if (this.editingBulletinId) {
          await axios.patch(`/api/bulletin_board/${this.editingBulletinId}`, {
            content: this.bulletinForm.content.trim(),
            status: this.bulletinForm.status,
            updated_by: auth.eid,
            is_active: this.shouldShowArchiveToggle && this.bulletinForm.moveToHistory ? 0 : 1,
          })
        } else {
          await axios.post('/api/bulletin_board', {
            content: this.bulletinForm.content.trim(),
            status: this.bulletinForm.status,
            created_by: auth.eid,
            is_active: 1,
          })
        }

        await Promise.all([this.fetchBulletins(), this.fetchBulletinHistory()])
        this.lastUpdatedAt = new Date()
        this.closeBulletinDialog()
      } catch (error) {
        console.error('save bulletin error', error)
        this.bulletinErrorMessage = error.response?.data?.message || error.response?.data || '儲存留言失敗。'
      } finally {
        this.isSavingBulletin = false
      }
    },
    bulletinAuthor(item) {
      return item.created_by_alias || item.created_by_name || `員工 ${item.created_by}`
    },
    statusLabel(status) {
      const normalized = Number(status)
      if (normalized === 4) {
        return '置頂'
      }
      if (normalized === 2) {
        return '已完成'
      }
      if (normalized === 3) {
        return '已取消'
      }
      return '已發布'
    },
    statusClass(status) {
      const normalized = Number(status)
      if (normalized === 4) {
        return 'status-pill--pinned'
      }
      if (normalized === 2) {
        return 'status-pill--done'
      }
      if (normalized === 3) {
        return 'status-pill--cancelled'
      }
      return 'status-pill--live'
    },
    formatCurrency(value) {
      return Number(value ?? 0).toLocaleString('zh-TW')
    },
    formatInteger(value) {
      return Number(value ?? 0).toLocaleString('zh-TW')
    },
    formatDateTime(value) {
      const date = parseDate(value)
      if (!date) {
        return '--'
      }

      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    },
    formatCompactRange(start, end) {
      const startYear = String(start.getFullYear()).slice(-2)
      const endYear = String(end.getFullYear()).slice(-2)
      const startText = `${startYear}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
      const endText = `${pad(end.getMonth() + 1)}-${pad(end.getDate())}`

      if (start.getFullYear() !== end.getFullYear()) {
        return `${startText}~${endYear}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
      }

      return `${startText}~${endText}`
    },
    createFullRangeLabel(days) {
      const first = days[0]?.date
      const last = days[days.length - 1]?.date
      if (!first || !last) {
        return '--'
      }

      return `${formatDateKey(first)} ～ ${formatDateKey(last)}`
    },
    businessHoursForDate(date) {
      const weekday = date.getDay() === 0 ? 7 : date.getDay()
      return this.businessHours.find((item) => Number(item.weekday) === weekday && Number(item.is_active) === 1) || null
    },
    buildRangeFromWeek(days, stepMinutes, fallbackStart, fallbackEnd) {
      const activeDays = days.filter((day) => day.businessHours)
      if (!activeDays.length) {
        return { startMinutes: fallbackStart, endMinutes: fallbackEnd }
      }

      const startMinutes = Math.min(...activeDays.map((day) => timeToMinutes(day.businessHours.open_time)))
      const endMinutes = Math.max(...activeDays.map((day) => timeToMinutes(day.businessHours.close_time)))

      return {
        startMinutes: Math.floor(startMinutes / stepMinutes) * stepMinutes,
        endMinutes: Math.ceil(endMinutes / stepMinutes) * stepMinutes,
      }
    },
    timelineRowsStyle(slotCount, rowHeight) {
      return {
        '--slot-count': String(slotCount),
        '--slot-height': `${rowHeight}px`,
      }
    },
    timeWindowStyle(startTime, endTime, baseStartMinutes, stepMinutes, rowHeight) {
      const startMinutes = timeToMinutes(startTime)
      const endMinutes = timeToMinutes(endTime)
      const top = ((startMinutes - baseStartMinutes) / stepMinutes) * rowHeight
      const height = Math.max(((endMinutes - startMinutes) / stepMinutes) * rowHeight, rowHeight)

      return {
        top: `${top}px`,
        height: `${height}px`,
      }
    },
    scheduleEventStyle(shift) {
      const startMinutes = timeToMinutes(shift.start_time)
      const endMinutes = timeToMinutes(shift.end_time)
      const top = ((startMinutes - this.scheduleRange.startMinutes) / 30) * 48
      const height = Math.max(((endMinutes - startMinutes) / 30) * 48, 36)

      return {
        top: `${top + 4}px`,
        height: `${height - 8}px`,
        background: this.staffColor(shift.staff_id),
      }
    },
    staffColor(staffId) {
      const safeIndex = Number(staffId ?? 0)
      return STAFF_COLORS[safeIndex % STAFF_COLORS.length]
    },
    ticketMatcher(type, ticket) {
      switch (type) {
        case 'longTerm':
          return matchesTicket(ticket, ['長期票'], TICKET_CODE_FALLBACKS.longTerm)
        case 'month':
          return matchesTicket(ticket, ['月'], TICKET_CODE_FALLBACKS.month)
        case 'quarter':
          return matchesTicket(ticket, ['季'], TICKET_CODE_FALLBACKS.quarter)
        case 'halfYear':
          return matchesTicket(ticket, ['半年'], TICKET_CODE_FALLBACKS.halfYear)
        case 'year':
          return matchesTicket(ticket, ['年票'], TICKET_CODE_FALLBACKS.year)
        case 'earlyBird':
          return matchesTicket(ticket, ['平日早鳥', '早鳥'], TICKET_CODE_FALLBACKS.earlyBird)
        case 'weekdaySingle':
          return matchesTicket(ticket, ['平日單次'], TICKET_CODE_FALLBACKS.weekdaySingle)
        case 'weekendSingle':
          return matchesTicket(ticket, ['假日單次'], TICKET_CODE_FALLBACKS.weekendSingle)
        case 'singleCombined':
          return this.ticketMatcher('weekdaySingle', ticket) || this.ticketMatcher('weekendSingle', ticket)
        case 'starlight':
          return matchesTicket(ticket, ['星光票', '星光'], TICKET_CODE_FALLBACKS.starlight)
        case 'student':
          return matchesTicket(ticket, ['學生票', '學生'], TICKET_CODE_FALLBACKS.student)
        case 'child':
          return matchesTicket(ticket, ['兒童票', '兒童'], TICKET_CODE_FALLBACKS.child)
        case 'experience':
          return matchesTicket(ticket, ['體驗票', '體驗'], TICKET_CODE_FALLBACKS.experience)
        case 'corporate':
          return matchesTicket(ticket, ['公司'], TICKET_CODE_FALLBACKS.corporate)
        default:
          return false
      }
    },
    ticketVisitCountByMatcher(type) {
      const matchedCodes = this.tickets
        .filter((ticket) => this.ticketMatcher(type, ticket))
        .map((ticket) => normalizeText(ticket.ticket_code))

      if (!matchedCodes.length) {
        return 0
      }

      const todayStart = startOfDay(new Date())
      const tomorrowStart = addDays(todayStart, 1)

      return this.memberVisits.filter((visit) => {
        const visitDate = parseDate(visit.checkin_time)
        return visitDate
          && visitDate >= todayStart
          && visitDate < tomorrowStart
          && matchedCodes.includes(normalizeText(visit.visit_type))
      }).length
    },
    ticketGroupLabel(ticket) {
      if (this.ticketMatcher('longTerm', ticket) || this.ticketMatcher('month', ticket) || this.ticketMatcher('quarter', ticket) || this.ticketMatcher('halfYear', ticket) || this.ticketMatcher('year', ticket)) {
        return '長期票'
      }
      if (this.ticketMatcher('earlyBird', ticket) || this.ticketMatcher('singleCombined', ticket) || this.ticketMatcher('starlight', ticket)) {
        return '單次票'
      }
      if (this.ticketMatcher('student', ticket) || this.ticketMatcher('child', ticket) || this.ticketMatcher('experience', ticket) || this.ticketMatcher('corporate', ticket)) {
        return '多元票'
      }
      return '其他'
    },
    findTicketByMatcher(type) {
      return this.tickets.find((ticket) => this.ticketMatcher(type, ticket)) || null
    },
  },
}
</script>

<style scoped>
.home-dashboard {
  height: calc(100vh - 64px);
  max-height: calc(100vh - 64px);
  overflow: hidden;
}

.dashboard-scroll {
  height: 100%;
  overflow-y: auto;
  padding-right: 6px;
}

.dashboard-scroll::-webkit-scrollbar {
  width: 10px;
}

.dashboard-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(107, 127, 146, 0.32);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 500px minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 22px;
}

.dashboard-card {
  border: 1px solid #d9e3ea;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 251, 255, 0.92));
  box-shadow: 0 20px 40px rgba(27, 51, 75, 0.1);
  padding: 22px;
}

.bulletin-card {
  display: flex;
  flex-direction: column;
  height: 470px;
  padding: 30px;
  box-sizing: border-box;
}

.stats-card {
  min-height: 300px;
  padding: 28px 30px 20px;
}

.card-header,
.card-header--split {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.card-header h2,
.dialog-header h3,
.ticket-summary-card h3,
.metric-card h3 {
  margin: 0;
}

.card-header h2 {
  font-size: 24px;
  color: #12263a;
}

.bulletin-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bulletin-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  background: #edf5ff;
  color: #1c5ea2;
  font-size: 14px;
  font-weight: 800;
}

.icon-add-button {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: #d8d8d8;
  color: #ffffff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.bulletin-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bulletin-history-button {
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid #d6dde7;
  border-radius: 999px;
  background: #ffffff;
  color: #365067;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.bulletin-frame {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
  border: 2px solid #d9dee4;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
}

.bulletin-item {
  box-sizing: border-box;
  height: 136px;
  padding: 14px 16px;
  border: 1px solid #dbe4ec;
  border-radius: 18px;
  background: #ffffff;
  cursor: pointer;
  overflow: hidden;
}

.bulletin-item + .bulletin-item {
  margin-top: 12px;
}

.bulletin-item--pinned {
  border-color: #f0c36d;
  box-shadow: inset 0 0 0 1px rgba(240, 195, 109, 0.45);
}

.bulletin-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.bulletin-item p {
  margin: 0 0 10px;
  color: #30465c;
  line-height: 1.55;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
  min-height: calc(1.55em * 2);
  max-height: calc(1.55em * 2);
}

.bulletin-item time,
.bulletin-author,
.updated-at,
.date-range,
.metric-range,
.metric-subrange,
.timeline-note {
  color: #70859a;
  font-size: 13px;
}

.bulletin-author {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-pill--live {
  background: #e5f4ff;
  color: #175a9f;
}

.status-pill--done {
  background: #e7f9ef;
  color: #0f7f4f;
}

.status-pill--cancelled {
  background: #fff0f0;
  color: #ba3f3f;
}

.status-pill--pinned {
  background: #fff5dd;
  color: #9f6a00;
}

.segmented-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.price-card {
  align-self: start;
  min-height: 470px;
  padding: 20px;
  box-sizing: border-box;
  width: calc(100% - 18px);
  justify-self: end;
}

.price-card .card-header {
  margin-bottom: 12px;
}

.price-card .segmented-tabs {
  gap: 8px;
  margin-bottom: 12px;
}

.people-card {
  padding: 20px;
  box-sizing: border-box;
  width: calc(100% - 18px);
  justify-self: end;
}

.segmented-tab {
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  padding: 8px 2px 10px;
  color: #2d4157;
  font-size: 18px;
  cursor: pointer;
}

.segmented-tab--active {
  border-bottom-color: #456284;
  color: #234669;
  font-weight: 700;
}

.table-scroll {
  overflow: auto;
}

.price-card .table-scroll {
  max-width: 100%;
}

.price-table {
  width: 100%;
  min-width: 500px;
  border-collapse: collapse;
  table-layout: fixed;
}

.price-table th,
.price-table td {
  padding: 10px 8px;
  border: 1px solid #d9dee4;
  text-align: left;
  font-size: 16px;
}

.price-table th {
  background: #cfd6dd;
  color: #22384f;
  font-size: 15px;
}

.price-table--ticket th {
  text-align: center;
}

.price-type-cell {
  width: 76px;
  font-weight: 700;
  vertical-align: middle;
  background: rgba(243, 247, 251, 0.88);
  text-align: center;
  white-space: nowrap;
}

.price-ticket-name-cell,
.price-ticket-value-cell {
  text-align: center;
}

.price-ticket-name-cell {
  white-space: nowrap;
}

.price-card .segmented-tab {
  font-size: 17px;
  padding: 6px 2px 8px;
}

.empty-row,
.empty-state {
  color: #70859a;
  text-align: center;
}

.ticket-summary-grid,
.people-grid {
  display: grid;
  gap: 12px;
}

.ticket-summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
}

.ticket-summary-card,
.metric-card {
  padding: 14px;
  border-radius: 20px;
  border: 1px solid #dce5ec;
  background: rgba(255, 255, 255, 0.92);
}

.ticket-summary-card__header,
.title-row,
.toolbar-row,
.metric-card strong,
.metric-card p,
.ticket-summary-lines p {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ticket-summary-card__header {
  margin-bottom: 10px;
  align-items: flex-start;
  gap: 10px;
}

.ticket-summary-card__header strong,
.metric-card strong {
  font-size: 22px;
  color: #13273b;
}

.ticket-summary-lines {
  display: grid;
  gap: 8px;
}

.ticket-summary-lines p,
.metric-card p {
  margin: 0;
  color: #5b7187;
}

.ticket-summary-card h3,
.ticket-summary-lines span {
  white-space: nowrap;
  word-break: keep-all;
}

.ticket-summary-card h3 {
  font-size: 18px;
}

.ticket-summary-card__header {
  white-space: nowrap;
}

.people-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.metric-card {
  display: grid;
  gap: 8px;
}

.metric-range,
.metric-subrange {
  display: block;
}

.schedule-card {
  margin-bottom: 22px;
}

.pill-toggle {
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  background: #eef3f6;
}

.pill-toggle__button,
.primary-button,
.secondary-button,
.round-arrow {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.pill-toggle__button {
  min-width: 78px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  background: transparent;
  color: #52657a;
}

.pill-toggle__button--active {
  color: #294257;
}

.pill-toggle__button--green {
  background: #d7f0c9;
}

.pill-toggle__button--blue {
  background: #caebfb;
}

.arrow-controls {
  display: flex;
  gap: 10px;
}

.round-arrow {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: #d9dde2;
  color: #ffffff;
  font-weight: 700;
}

.timeline-panel {
  overflow-x: auto;
}

.timeline-head {
  display: grid;
  grid-template-columns: 110px repeat(7, minmax(108px, 1fr));
  gap: 0;
}

.timeline-corner,
.timeline-day-head {
  min-height: 44px;
  border: 1px solid #e7edf1;
  background: #ffffff;
}

.timeline-day-head {
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 0;
  font-size: 17px;
  color: #5a6270;
}

.timeline-body {
  display: grid;
  grid-template-columns: 110px minmax(756px, 1fr);
}

.timeline-times {
  display: grid;
  grid-template-rows: repeat(var(--slot-count), var(--slot-height));
}

.timeline-time {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e7edf1;
  border-top: 0;
  background: #ffffff;
  color: #515c6b;
  font-size: 16px;
}

.timeline-columns {
  display: grid;
  grid-template-columns: repeat(7, minmax(108px, 1fr));
}

.timeline-day-column {
  position: relative;
  display: grid;
  grid-template-rows: repeat(var(--slot-count), var(--slot-height));
  border-left: 1px solid #e7edf1;
}

.timeline-day-column:last-child {
  border-right: 1px solid #e7edf1;
}

.timeline-cell {
  border-bottom: 1px solid #e7edf1;
  background: #ffffff;
}

.timeline-open-window {
  position: absolute;
  left: 4px;
  right: 4px;
  border-radius: 16px;
  opacity: 0.88;
  pointer-events: none;
}

.timeline-open-window--green {
  background: rgba(213, 242, 201, 0.88);
}

.timeline-open-window--blue {
  background: rgba(205, 234, 249, 0.88);
}

.timeline-event {
  position: absolute;
  left: 8px;
  right: 8px;
  z-index: 1;
  padding: 10px 10px 8px;
  border-radius: 16px;
  color: #385066;
  box-shadow: 0 10px 18px rgba(27, 51, 75, 0.08);
  overflow: hidden;
}

.timeline-event strong,
.timeline-event span {
  display: block;
}

.timeline-event strong {
  margin-bottom: 4px;
}

.timeline-note {
  margin: 16px 0 0;
}

.dashboard-message {
  margin: 0 0 18px;
  padding: 14px 16px;
  border-radius: 16px;
}

.dashboard-message--error {
  border: 1px solid #f0c2c2;
  background: #fff2f2;
  color: #bc4747;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 29, 43, 0.4);
  padding: 20px;
}

.dialog-card {
  width: min(560px, 100%);
  border-radius: 24px;
  background: #ffffff;
  padding: 24px;
  box-shadow: 0 24px 48px rgba(27, 51, 75, 0.18);
}

.dialog-card--history {
  width: min(760px, 100%);
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.dialog-kicker {
  margin: 0 0 8px;
  color: #70859a;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dialog-close-button {
  width: 34px;
  height: 34px;
  border: 1px solid #d3dbe3;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
}

.bulletin-form {
  display: grid;
  gap: 16px;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #20344a;
  font-weight: 700;
}

.checkbox-field input {
  width: 18px;
  height: 18px;
}

.history-list {
  max-height: min(70vh, 620px);
  overflow-y: auto;
  display: grid;
  gap: 12px;
  padding-right: 4px;
}

.history-item {
  padding: 14px 16px;
  border: 1px solid #dbe4ec;
  border-radius: 18px;
  background: #ffffff;
}

.history-item p {
  margin: 0 0 10px;
  color: #30465c;
  white-space: pre-wrap;
  line-height: 1.55;
}

.form-field {
  display: grid;
  gap: 8px;
}

.form-field span {
  color: #20344a;
  font-weight: 700;
}

.form-field select,
.form-field textarea {
  border: 1px solid #d6dde7;
  border-radius: 14px;
  background: #f8fbfe;
  padding: 12px 14px;
  font: inherit;
}

.form-field textarea {
  resize: vertical;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.primary-button,
.secondary-button {
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  font-weight: 700;
}

.primary-button {
  background: linear-gradient(135deg, #1f7ae0, #4db6ff);
  color: #ffffff;
}

.secondary-button {
  background: #ffffff;
  border: 1px solid rgba(32, 52, 74, 0.14);
  color: #20344a;
}

@media (max-width: 1200px) {
  .dashboard-grid,
  .ticket-summary-grid,
  .people-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .home-dashboard {
    height: auto;
    max-height: none;
    overflow: visible;
  }

  .dashboard-scroll {
    overflow: visible;
    padding-right: 0;
  }

  .card-header--split,
  .toolbar-row,
  .title-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
