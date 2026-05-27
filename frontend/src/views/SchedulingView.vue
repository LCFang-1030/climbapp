<template>
  <section class="scheduling-view">
    <header class="calendar-hero">
      <div>
        <p class="calendar-eyebrow">Staff Scheduling</p>
        <h1>排班行事曆</h1>
        <p class="calendar-subtitle">
          以月曆檢視員工班表，可直接新增班表並查看每筆排班詳細資訊。
        </p>
      </div>

      <div class="calendar-actions">
        <div class="calendar-controls">
          <button type="button" class="calendar-nav-button" @click="goToPreviousMonth">
            上個月
          </button>
          <button type="button" class="calendar-today-button" @click="goToCurrentMonth">
            今天
          </button>
          <button type="button" class="calendar-nav-button" @click="goToNextMonth">
            下個月
          </button>
        </div>

        <div class="calendar-toolbar">
          <div class="staff-legend" aria-label="員工顏色列表">
            <div v-for="staff in staffList" :key="staff.eid" class="staff-legend-item">
              <span
                class="staff-legend-dot"
                :style="{ backgroundColor: staffColor(staff.eid) }"
              ></span>
              <span class="staff-legend-name">
                {{ staff.alias || staff.name || staff.employee_id }}
              </span>
            </div>
          </div>

          <button type="button" class="calendar-add-button" @click="openCreateDialog()">
            新增班表
          </button>
        </div>
      </div>
    </header>

    <section class="calendar-shell" aria-label="排班月曆">
      <div class="calendar-header">
        <div>
          <p class="calendar-caption">Monthly Schedule</p>
          <h2>{{ currentMonthLabel }}</h2>
        </div>
        <p class="calendar-range">{{ visibleRangeLabel }}</p>
      </div>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <p v-else-if="isLoading" class="info-message">讀取班表中...</p>

      <template v-else>
        <div class="calendar-weekdays" role="row">
          <div
            v-for="weekday in weekdays"
            :key="weekday"
            class="calendar-weekday"
            role="columnheader"
          >
            {{ weekday }}
          </div>
        </div>

        <div class="calendar-grid" role="grid">
          <article
            v-for="day in calendarDays"
            :key="day.key"
            :class="[
              'calendar-cell',
              { 'calendar-cell--muted': !day.isCurrentMonth, 'calendar-cell--today': day.isToday }
            ]"
            role="gridcell"
          >
            <div class="calendar-cell-top">
              <span class="calendar-day-number">{{ day.date.getDate() }}</span>
              <button
                v-if="day.isCurrentMonth"
                type="button"
                class="calendar-cell-add"
                @click="openCreateDialog(day.date)"
              >
                +
              </button>
            </div>

            <div class="calendar-shifts">
              <button
                v-for="shift in schedulesByDate[day.key] || []"
                :key="shift.schedule_id"
                type="button"
                class="calendar-shift"
                :class="{ 'calendar-shift--inactive': Number(shift.is_active) !== 1 }"
                :style="shiftStyle(shift)"
                @click="openDetailDialog(shift)"
              >
                <span class="calendar-shift-content">
                  <span class="calendar-shift-time">
                    {{ shift.start_time }} - {{ shift.end_time }}
                  </span>
                  <span class="calendar-shift-title">
                    {{ shift.staff_alias || shift.staff_name || shift.employee_id }}
                  </span>
                </span>
              </button>
            </div>
          </article>
        </div>
      </template>
    </section>

    <div
      v-if="isCreateDialogOpen"
      class="dialog-overlay"
      @click.self="closeCreateDialog"
    >
      <section class="dialog-card" aria-label="新增班表">
        <div class="dialog-header">
          <div>
            <p class="dialog-kicker">Create Schedule</p>
            <h3>新增班表</h3>
          </div>
          <button type="button" class="dialog-close-button" @click="closeCreateDialog">
            X
          </button>
        </div>

        <form class="schedule-form" @submit.prevent="submitSchedule">
          <label class="form-field">
            <span>員工</span>
            <select v-model="scheduleForm.staff_id" required>
              <option value="">請選擇員工</option>
              <option v-for="staff in staffList" :key="staff.eid" :value="String(staff.eid)">
                {{ staff.alias || staff.name }} ({{ staff.employee_id }})
              </option>
            </select>
          </label>

          <label class="form-field">
            <span>上班日期</span>
            <input v-model="scheduleForm.work_date" type="date" required>
          </label>

          <div class="form-row">
            <label class="form-field">
              <span>上班時間</span>
              <input v-model="scheduleForm.start_time" type="time" required>
            </label>

            <label class="form-field">
              <span>下班時間</span>
              <input v-model="scheduleForm.end_time" type="time" required>
            </label>
          </div>

          <label class="form-field">
            <span>啟用狀態</span>
            <select v-model="scheduleForm.is_active" required>
              <option value="1">啟用</option>
              <option value="0">停用</option>
            </select>
          </label>

          <label class="form-field">
            <span>備註</span>
            <textarea
              v-model.trim="scheduleForm.note"
              rows="3"
              placeholder="可選填備註內容"
            ></textarea>
          </label>

          <p v-if="formErrorMessage" class="error-message">{{ formErrorMessage }}</p>

          <div class="dialog-actions">
            <button type="button" class="secondary-button" @click="closeCreateDialog">
              取消
            </button>
            <button type="submit" class="primary-button" :disabled="isSaving">
              {{ isSaving ? '儲存中...' : '儲存班表' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div
      v-if="isDetailDialogOpen"
      class="dialog-overlay"
      @click.self="closeDetailDialog"
    >
      <section class="detail-dialog-card" aria-label="班表詳細資訊">
        <div class="dialog-header">
          <div>
            <p class="dialog-kicker">Schedule Detail</p>
            <h3>班表詳細資訊</h3>
          </div>
          <button type="button" class="dialog-close-button" @click="closeDetailDialog">
            X
          </button>
        </div>

        <p v-if="isLoadingDetail" class="info-message">讀取詳細資訊中...</p>
        <p v-else-if="detailErrorMessage" class="error-message">{{ detailErrorMessage }}</p>

        <dl v-else-if="selectedSchedule" class="detail-list">
          <dt>員工</dt>
          <dd>{{ selectedSchedule.staff_alias || selectedSchedule.staff_name || selectedSchedule.employee_id }}</dd>

          <dt>上班日期</dt>
          <dd>{{ formatDateDisplay(selectedSchedule.work_date) }}</dd>

          <dt>上班時間</dt>
          <dd>{{ selectedSchedule.start_time }}</dd>

          <dt>下班時間</dt>
          <dd>{{ selectedSchedule.end_time }}</dd>

          <dt>啟用狀態</dt>
          <dd>{{ activeStatusText(selectedSchedule.is_active) }}</dd>

          <dt>建立人員</dt>
          <dd>{{ createdByText(selectedSchedule) }}</dd>

          <dt>備註</dt>
          <dd>{{ selectedSchedule.note || '無' }}</dd>

          <dt>最後更新時間</dt>
          <dd>{{ formatDateTimeDisplay(selectedSchedule.updated_at) }}</dd>
        </dl>
      </section>
    </div>
  </section>
</template>

<script>
import axios from 'axios'
import { getStoredAuth } from '../utils/auth'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const STAFF_COLORS = [
  '#1f7ae0',
  '#f2994a',
  '#27ae60',
  '#eb5757',
  '#9b51e0',
  '#14b8a6',
  '#d97706',
  '#2563eb',
  '#e11d48',
  '#0f766e',
]

export default {
  name: 'SchedulingView',
  data() {
    return {
      weekdays: WEEKDAYS,
      currentDate: this.startOfMonth(new Date()),
      staffList: [],
      schedules: [],
      isLoading: false,
      errorMessage: '',
      isCreateDialogOpen: false,
      isSaving: false,
      formErrorMessage: '',
      isDetailDialogOpen: false,
      isLoadingDetail: false,
      detailErrorMessage: '',
      selectedSchedule: null,
      scheduleForm: this.createEmptyForm(),
    }
  },
  computed: {
    currentMonthLabel() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth() + 1

      return `${year}年${month}月`
    },
    currentMonthKey() {
      const year = this.currentDate.getFullYear()
      const month = String(this.currentDate.getMonth() + 1).padStart(2, '0')

      return `${year}-${month}`
    },
    calendarDays() {
      const firstDay = this.startOfMonth(this.currentDate)
      const gridStart = new Date(firstDay)
      gridStart.setDate(firstDay.getDate() - firstDay.getDay())

      return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(gridStart)
        date.setDate(gridStart.getDate() + index)

        return {
          key: this.formatDateKey(date),
          date,
          isCurrentMonth: date.getMonth() === this.currentDate.getMonth(),
          isToday: this.isSameDate(date, new Date()),
        }
      })
    },
    visibleRangeLabel() {
      const firstVisibleDay = this.calendarDays[0]?.date
      const lastVisibleDay = this.calendarDays[this.calendarDays.length - 1]?.date

      if (!firstVisibleDay || !lastVisibleDay) {
        return ''
      }

      return `${this.formatShortDate(firstVisibleDay)} - ${this.formatShortDate(lastVisibleDay)}`
    },
    schedulesByDate() {
      return this.schedules.reduce((grouped, item) => {
        const key = this.normalizeDateKey(item.work_date)

        if (!grouped[key]) {
          grouped[key] = []
        }

        grouped[key].push(item)
        return grouped
      }, {})
    },
  },
  watch: {
    currentMonthKey() {
      this.fetchSchedules()
    },
  },
  mounted() {
    this.initializePage()
  },
  methods: {
    createEmptyForm(date = '') {
      return {
        staff_id: '',
        work_date: date,
        start_time: '09:00',
        end_time: '18:00',
        is_active: '1',
        note: '',
      }
    },
    async initializePage() {
      this.isLoading = true
      this.errorMessage = ''

      try {
        await Promise.all([this.fetchStaffList(), this.fetchSchedules()])
      } catch (error) {
        console.error('scheduling initialize error', error)
        this.errorMessage = '讀取排班資料失敗，請稍後再試。'
      } finally {
        this.isLoading = false
      }
    },
    async fetchStaffList() {
      const response = await axios.get('/api/staff')
      this.staffList = Array.isArray(response.data) ? response.data : []
    },
    async fetchSchedules() {
      try {
        const response = await axios.get('/api/staff_schedule', {
          params: { month: this.currentMonthKey },
        })
        this.schedules = Array.isArray(response.data) ? response.data : []
        this.errorMessage = ''
      } catch (error) {
        console.error('fetch schedules error', error)
        this.schedules = []
        this.errorMessage = error.response?.data?.message || error.response?.data || '讀取班表失敗。'
      }
    },
    startOfMonth(date) {
      return new Date(date.getFullYear(), date.getMonth(), 1)
    },
    goToPreviousMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1)
    },
    goToNextMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1)
    },
    goToCurrentMonth() {
      this.currentDate = this.startOfMonth(new Date())
    },
    openCreateDialog(date = null) {
      this.formErrorMessage = ''
      this.scheduleForm = this.createEmptyForm(date ? this.formatDateKey(date) : '')
      this.isCreateDialogOpen = true
    },
    closeCreateDialog() {
      this.isCreateDialogOpen = false
      this.formErrorMessage = ''
      this.scheduleForm = this.createEmptyForm()
    },
    async submitSchedule() {
      if (!this.scheduleForm.staff_id || !this.scheduleForm.work_date) {
        this.formErrorMessage = '請完整填寫員工與上班日期。'
        return
      }

      if (this.scheduleForm.start_time >= this.scheduleForm.end_time) {
        this.formErrorMessage = '上班時間必須早於下班時間。'
        return
      }

      this.isSaving = true
      this.formErrorMessage = ''

      const auth = getStoredAuth()

      try {
        const targetWorkDate = this.scheduleForm.work_date

        await axios.post('/api/staff_schedule', {
          staff_id: Number(this.scheduleForm.staff_id),
          work_date: targetWorkDate,
          start_time: this.scheduleForm.start_time,
          end_time: this.scheduleForm.end_time,
          is_active: Number(this.scheduleForm.is_active),
          note: this.scheduleForm.note || null,
          created_by: auth?.eid ?? null,
        })

        this.closeCreateDialog()

        const [year, month] = targetWorkDate.split('-')
        const targetMonth = `${year}-${month}`

        if (targetMonth !== this.currentMonthKey) {
          this.currentDate = new Date(Number(year), Number(month) - 1, 1)
        } else {
          await this.fetchSchedules()
        }
      } catch (error) {
        console.error('create schedule error', error)
        this.formErrorMessage = error.response?.data?.message || error.response?.data || '新增班表失敗。'
      } finally {
        this.isSaving = false
      }
    },
    async openDetailDialog(shift) {
      this.selectedSchedule = null
      this.detailErrorMessage = ''
      this.isLoadingDetail = true
      this.isDetailDialogOpen = true

      try {
        const response = await axios.get(`/api/staff_schedule/${shift.schedule_id}`)
        this.selectedSchedule = response.data
      } catch (error) {
        console.error('schedule detail error', error)
        this.detailErrorMessage = error.response?.data || '讀取班表詳細資訊失敗。'
      } finally {
        this.isLoadingDetail = false
      }
    },
    closeDetailDialog() {
      this.isDetailDialogOpen = false
      this.isLoadingDetail = false
      this.detailErrorMessage = ''
      this.selectedSchedule = null
    },
    isSameDate(left, right) {
      return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate()
    },
    formatDateKey(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')

      return `${year}-${month}-${day}`
    },
    normalizeDateKey(value) {
      if (!value) {
        return ''
      }

      if (value instanceof Date) {
        return this.formatDateKey(value)
      }

      return String(value).slice(0, 10)
    },
    formatShortDate(date) {
      return `${date.getMonth() + 1}/${date.getDate()}`
    },
    formatDateDisplay(value) {
      const dateText = this.normalizeDateKey(value)

      if (!dateText) {
        return ''
      }

      const [year, month, day] = dateText.split('-')
      return `${year}年${Number(month)}月${Number(day)}日`
    },
    formatDateTimeDisplay(value) {
      if (!value) {
        return ''
      }

      const date = new Date(value)

      if (Number.isNaN(date.getTime())) {
        return String(value)
      }

      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')

      return `${year}-${month}-${day} ${hours}:${minutes}`
    },
    activeStatusText(value) {
      return Number(value) === 1 ? '啟用' : '停用'
    },
    createdByText(schedule) {
      if (!schedule?.created_by) {
        return '系統'
      }

      return schedule.created_by_alias || schedule.created_by_name || String(schedule.created_by)
    },
    staffColor(staffId) {
      const index = this.staffList.findIndex((staff) => Number(staff.eid) === Number(staffId))
      const safeIndex = index >= 0 ? index : Number(staffId) || 0

      return STAFF_COLORS[safeIndex % STAFF_COLORS.length]
    },
    shiftStyle(shift) {
      const color = this.staffColor(shift.staff_id)

      return {
        borderLeftColor: color,
        backgroundColor: `${color}18`,
        color,
      }
    },
  },
}
</script>

<style scoped>
.scheduling-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.calendar-hero,
.calendar-shell {
  border: 1px solid rgba(32, 52, 74, 0.08);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 20px 50px rgba(31, 65, 102, 0.08);
  backdrop-filter: blur(18px);
}

.calendar-hero {
  display: flex;
  justify-content: space-between;
  gap: 28px;
  padding: 28px 32px;
  background:
    radial-gradient(circle at top right, rgba(77, 182, 255, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(244, 249, 255, 0.92));
}

.calendar-eyebrow,
.calendar-caption,
.calendar-range,
.dialog-kicker {
  margin: 0;
  color: #65809c;
  letter-spacing: 0.08em;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.calendar-hero h1,
.calendar-header h2,
.dialog-header h3 {
  margin: 8px 0 0;
  color: #20344a;
}

.calendar-hero h1 {
  font-size: 34px;
}

.calendar-subtitle {
  margin: 12px 0 0;
  max-width: 520px;
  color: #4f6479;
  line-height: 1.6;
}

.calendar-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
  min-width: min(520px, 100%);
}

.calendar-controls,
.calendar-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

.calendar-nav-button,
.calendar-today-button,
.calendar-add-button,
.primary-button,
.secondary-button {
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(32, 52, 74, 0.12);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
  font-weight: 700;
}

.calendar-nav-button,
.secondary-button {
  background: #ffffff;
  color: #20344a;
}

.calendar-today-button,
.calendar-add-button,
.primary-button {
  background: linear-gradient(135deg, #1f7ae0, #4db6ff);
  color: #ffffff;
  box-shadow: 0 16px 32px rgba(31, 122, 224, 0.2);
  border: 0;
}

.calendar-nav-button:hover,
.calendar-today-button:hover,
.calendar-add-button:hover,
.primary-button:hover,
.secondary-button:hover {
  transform: translateY(-1px);
}

.staff-legend {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
}

.staff-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(244, 248, 252, 0.92);
  border: 1px solid rgba(32, 52, 74, 0.08);
}

.staff-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.staff-legend-name {
  color: #30465c;
  font-size: 13px;
  font-weight: 600;
}

.calendar-shell {
  padding: 20px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  padding: 8px 8px 18px;
}

.calendar-range {
  font-size: 13px;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-weekdays {
  margin-bottom: 8px;
}

.calendar-weekday {
  padding: 14px 10px;
  color: #5f7388;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

.calendar-grid {
  gap: 10px;
}

.calendar-cell {
  min-height: 118px;
  padding: 10px;
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbfd 100%);
  border: 1px solid rgba(111, 138, 166, 0.14);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calendar-cell--muted {
  background: rgba(244, 247, 251, 0.78);
  color: #9aabba;
}

.calendar-cell--today {
  border-color: rgba(31, 122, 224, 0.35);
  box-shadow: 0 16px 30px rgba(31, 122, 224, 0.12);
}

.calendar-cell-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.calendar-day-number {
  font-size: 15px;
  font-weight: 800;
  color: inherit;
}

.calendar-cell-add {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: rgba(31, 122, 224, 0.1);
  color: #0f5ea8;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.calendar-shifts {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.calendar-shift {
  display: block;
  padding: 7px 8px;
  border-radius: 12px;
  border: 0;
  border-left: 4px solid currentColor;
  text-align: left;
  cursor: pointer;
}

.calendar-shift--inactive {
  opacity: 0.55;
}

.calendar-shift-content {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.calendar-shift-time {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 700;
}

.calendar-shift-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(10, 28, 44, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.dialog-card,
.detail-dialog-card {
  width: min(560px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 24px 48px rgba(32, 52, 74, 0.18);
  padding: 22px;
}

.detail-dialog-card {
  width: min(520px, 100%);
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.dialog-close-button {
  width: 34px;
  height: 34px;
  border: 1px solid #cfd8e3;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}

.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field span {
  color: #20344a;
  font-weight: 700;
}

.form-field input,
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

.detail-list {
  display: grid;
  grid-template-columns: 130px 1fr;
  margin: 0;
  border: 1px solid #e7edf3;
  border-bottom: 0;
}

.detail-list dt,
.detail-list dd {
  margin: 0;
  padding: 12px;
  border-bottom: 1px solid #e7edf3;
}

.detail-list dt {
  background: #f7fbff;
  color: #405569;
  font-weight: 700;
}

.detail-list dd {
  word-break: break-word;
}

.error-message {
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fff1f1;
  color: #c24343;
  border: 1px solid #f0c2c2;
}

.info-message {
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #eef7ff;
  color: #215d96;
  border: 1px solid #cae3fb;
}

.primary-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

@media (max-width: 1100px) {
  .calendar-hero,
  .calendar-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .calendar-actions {
    align-items: stretch;
    min-width: 100%;
  }

  .calendar-controls,
  .calendar-toolbar {
    justify-content: flex-start;
  }
}

@media (max-width: 900px) {
  .calendar-shell {
    overflow-x: auto;
  }

  .calendar-weekdays,
  .calendar-grid {
    min-width: 760px;
  }
}

@media (max-width: 640px) {
  .calendar-hero {
    padding: 22px;
  }

  .calendar-shell {
    padding: 14px;
  }

  .calendar-hero h1 {
    font-size: 28px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .dialog-overlay {
    padding: 12px;
  }

  .detail-list {
    grid-template-columns: 1fr;
  }
}
</style>
