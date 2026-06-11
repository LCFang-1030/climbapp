<template>
  <section class="scheduling-view">
    <header class="calendar-hero">
      <div class="hero-copy">
        <p class="calendar-eyebrow">Staff Scheduling</p>
        <h1>排班行事曆</h1>
        <p class="calendar-subtitle">
          以月曆檢視員工班表，可直接新增班表、修改班表並查看每筆排班詳細資訊。
        </p>
      </div>

      <div class="calendar-actions">
        <div class="calendar-controls">
          <button type="button" class="calendar-nav-button" @click="goToPreviousMonth">上個月</button>
          <button type="button" class="calendar-today-button" @click="goToCurrentMonth">今天</button>
          <button type="button" class="calendar-nav-button" @click="goToNextMonth">下個月</button>
        </div>

        <section class="current-time-card" aria-label="目前時間">
          <p class="current-time-label">目前時間</p>
          <p class="current-time-value">{{ currentTimeText }}</p>
        </section>
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

      <div class="calendar-toolbar">
        <div class="staff-legend" aria-label="員工顯示控制">
          <button
            v-for="staff in staffList"
            :key="staff.eid"
            type="button"
            :class="['staff-legend-item', { 'staff-legend-item--inactive': !isStaffVisible(staff.eid) }]"
            @click="toggleStaffVisibility(staff.eid)"
          >
            <span class="staff-legend-dot" :style="{ backgroundColor: staffColor(staff.eid) }"></span>
            <span class="staff-legend-name">{{ staff.alias || staff.name || staff.employee_id }}</span>
          </button>
        </div>

        <div class="toolbar-actions">
          <button type="button" class="secondary-button" @click="openEditPickerDialog">修改班表</button>
          <button type="button" class="calendar-add-button" @click="openCreateDialog()">新增班表</button>
        </div>
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
                  <span class="calendar-shift-time">{{ shift.start_time }} - {{ shift.end_time }}</span>
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

    <div v-if="isScheduleDialogOpen" class="dialog-overlay" @click.self="closeScheduleDialog">
      <section class="dialog-card" :aria-label="isEditingSchedule ? '修改班表' : '新增班表'">
        <div class="dialog-header">
          <div>
            <p class="dialog-kicker">{{ isEditingSchedule ? 'Edit Schedule' : 'Create Schedule' }}</p>
            <h3>{{ isEditingSchedule ? '修改班表' : '新增班表' }}</h3>
          </div>
          <button type="button" class="dialog-close-button" @click="closeScheduleDialog">X</button>
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
            <div class="form-field">
              <span>上班時間</span>
              <div class="time-select-group">
                <div class="time-dropdown">
                  <button type="button" class="time-dropdown-trigger" @click="toggleTimeDropdown('start_hour')">
                    {{ scheduleForm.start_hour }}
                  </button>
                  <div v-if="openTimeDropdown === 'start_hour'" class="time-dropdown-menu">
                    <button
                      v-for="hour in hourOptions"
                      :key="`start-hour-${hour}`"
                      type="button"
                      class="time-dropdown-option"
                      :class="{ 'time-dropdown-option--active': scheduleForm.start_hour === hour }"
                      @click="selectTimeValue('start_hour', hour)"
                    >
                      {{ hour }}
                    </button>
                  </div>
                </div>

                <div class="time-dropdown">
                  <button type="button" class="time-dropdown-trigger" @click="toggleTimeDropdown('start_minute')">
                    {{ scheduleForm.start_minute }}
                  </button>
                  <div v-if="openTimeDropdown === 'start_minute'" class="time-dropdown-menu">
                    <button
                      v-for="minute in minuteOptions"
                      :key="`start-minute-${minute}`"
                      type="button"
                      class="time-dropdown-option"
                      :class="{ 'time-dropdown-option--active': scheduleForm.start_minute === minute }"
                      @click="selectTimeValue('start_minute', minute)"
                    >
                      {{ minute }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-field">
              <span>下班時間</span>
              <div class="time-select-group">
                <div class="time-dropdown">
                  <button type="button" class="time-dropdown-trigger" @click="toggleTimeDropdown('end_hour')">
                    {{ scheduleForm.end_hour }}
                  </button>
                  <div v-if="openTimeDropdown === 'end_hour'" class="time-dropdown-menu">
                    <button
                      v-for="hour in hourOptions"
                      :key="`end-hour-${hour}`"
                      type="button"
                      class="time-dropdown-option"
                      :class="{ 'time-dropdown-option--active': scheduleForm.end_hour === hour }"
                      @click="selectTimeValue('end_hour', hour)"
                    >
                      {{ hour }}
                    </button>
                  </div>
                </div>

                <div class="time-dropdown">
                  <button type="button" class="time-dropdown-trigger" @click="toggleTimeDropdown('end_minute')">
                    {{ scheduleForm.end_minute }}
                  </button>
                  <div v-if="openTimeDropdown === 'end_minute'" class="time-dropdown-menu">
                    <button
                      v-for="minute in minuteOptions"
                      :key="`end-minute-${minute}`"
                      type="button"
                      class="time-dropdown-option"
                      :class="{ 'time-dropdown-option--active': scheduleForm.end_minute === minute }"
                      @click="selectTimeValue('end_minute', minute)"
                    >
                      {{ minute }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
            <textarea v-model.trim="scheduleForm.note" rows="3" placeholder="可選填備註內容"></textarea>
          </label>

          <p v-if="formErrorMessage" class="error-message">{{ formErrorMessage }}</p>

          <div class="dialog-actions">
            <button type="button" class="secondary-button" @click="closeScheduleDialog">取消</button>
            <button type="submit" class="primary-button" :disabled="isSaving">
              {{ isSaving ? '儲存中...' : (isEditingSchedule ? '修改班表' : '儲存班表') }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isEditPickerDialogOpen" class="dialog-overlay" @click.self="closeEditPickerDialog">
      <section class="dialog-card dialog-card--compact" aria-label="選擇要修改的班表">
        <div class="dialog-header">
          <div>
            <p class="dialog-kicker">Edit Schedule</p>
            <h3>修改班表</h3>
          </div>
          <button type="button" class="dialog-close-button" @click="closeEditPickerDialog">X</button>
        </div>

        <form class="schedule-form schedule-form--compact" @submit.prevent="submitEditPicker">
          <label class="form-field">
            <span>員工</span>
            <select v-model="editPickerForm.staff_id" required @change="handleEditPickerStaffChange">
              <option value="">請選擇員工</option>
              <option v-for="staff in staffList" :key="staff.eid" :value="String(staff.eid)">
                {{ staff.alias || staff.name }} ({{ staff.employee_id }})
              </option>
            </select>
          </label>

          <label class="form-field">
            <span>班表</span>
            <select v-model="editPickerForm.schedule_id" :disabled="!editPickerForm.staff_id || isLoadingEditOptions" required>
              <option value="">{{ editScheduleSelectPlaceholder }}</option>
              <option
                v-for="schedule in editScheduleOptions"
                :key="schedule.schedule_id"
                :value="String(schedule.schedule_id)"
              >
                {{ formatEditScheduleOption(schedule) }}
              </option>
            </select>
          </label>

          <p v-if="editPickerErrorMessage" class="error-message">{{ editPickerErrorMessage }}</p>
          <p v-else-if="isLoadingEditOptions" class="info-message">載入班表選項中...</p>

          <div class="dialog-actions">
            <button type="button" class="secondary-button" @click="closeEditPickerDialog">取消</button>
            <button
              type="submit"
              class="primary-button"
              :disabled="!editPickerForm.schedule_id || isLoadingEditOptions || isLoadingEditSchedule"
            >
              {{ isLoadingEditSchedule ? '載入中...' : '開始修改' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="isDetailDialogOpen" class="dialog-overlay" @click.self="closeDetailDialog">
      <section class="detail-dialog-card" aria-label="班表詳細資訊">
        <div class="dialog-header">
          <div>
            <p class="dialog-kicker">Schedule Detail</p>
            <h3>班表詳細資訊</h3>
          </div>
          <div class="detail-dialog-actions">
            <button
              v-if="selectedSchedule"
              type="button"
              class="secondary-button"
              @click="openEditDialogFromDetail"
            >
              修改
            </button>
            <button type="button" class="dialog-close-button" @click="closeDetailDialog">X</button>
          </div>
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
      currentTimeText: '',
      currentTimeTimerId: null,
      staffList: [],
      schedules: [],
      visibleStaffIds: [],
      isLoading: false,
      errorMessage: '',
      isScheduleDialogOpen: false,
      editingScheduleId: null,
      openTimeDropdown: '',
      isSaving: false,
      formErrorMessage: '',
      isDetailDialogOpen: false,
      isLoadingDetail: false,
      detailErrorMessage: '',
      selectedSchedule: null,
      isEditPickerDialogOpen: false,
      isLoadingEditOptions: false,
      isLoadingEditSchedule: false,
      editPickerErrorMessage: '',
      editPickerForm: {
        staff_id: '',
        schedule_id: '',
      },
      editScheduleOptions: [],
      scheduleForm: this.createEmptyForm(),
    }
  },
  computed: {
    currentMonthLabel() {
      return `${this.currentDate.getFullYear()}年${this.currentDate.getMonth() + 1}月`
    },
    currentMonthKey() {
      const year = this.currentDate.getFullYear()
      const month = String(this.currentDate.getMonth() + 1).padStart(2, '0')
      return `${year}-${month}`
    },
    hourOptions() {
      return Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
    },
    minuteOptions() {
      return Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0'))
    },
    isEditingSchedule() {
      return Boolean(this.editingScheduleId)
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

      return firstVisibleDay && lastVisibleDay
        ? `${this.formatShortDate(firstVisibleDay)} - ${this.formatShortDate(lastVisibleDay)}`
        : ''
    },
    schedulesByDate() {
      return this.schedules.reduce((grouped, schedule) => {
        if (!this.isStaffVisible(schedule.staff_id)) {
          return grouped
        }

        const key = this.normalizeDateKey(schedule.work_date)
        if (!grouped[key]) {
          grouped[key] = []
        }

        grouped[key].push(schedule)
        return grouped
      }, {})
    },
    editScheduleSelectPlaceholder() {
      if (!this.editPickerForm.staff_id) {
        return '請先選擇員工'
      }

      if (this.isLoadingEditOptions) {
        return '載入中...'
      }

      if (!this.editScheduleOptions.length) {
        return '此員工今天之後沒有班表'
      }

      return '請選擇班表'
    },
  },
  watch: {
    currentMonthKey() {
      this.fetchSchedules()
    },
  },
  mounted() {
    this.initializePage()
    this.startCurrentTimeClock()
    document.addEventListener('click', this.handleDocumentClick)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleDocumentClick)
    this.stopCurrentTimeClock()
  },
  methods: {
    createEmptyForm(date = '') {
      return {
        staff_id: '',
        work_date: date,
        start_hour: '09',
        start_minute: '00',
        end_hour: '18',
        end_minute: '00',
        is_active: '1',
        note: '',
      }
    },
    startCurrentTimeClock() {
      this.updateCurrentTimeText()
      this.currentTimeTimerId = window.setInterval(this.updateCurrentTimeText, 1000)
    },
    stopCurrentTimeClock() {
      if (this.currentTimeTimerId) {
        window.clearInterval(this.currentTimeTimerId)
        this.currentTimeTimerId = null
      }
    },
    updateCurrentTimeText() {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const day = now.getDate()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      this.currentTimeText = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
    },
    handleDocumentClick(event) {
      if (!event.target.closest('.time-dropdown')) {
        this.openTimeDropdown = ''
      }
    },
    toggleTimeDropdown(key) {
      this.openTimeDropdown = this.openTimeDropdown === key ? '' : key
    },
    selectTimeValue(field, value) {
      this.scheduleForm[field] = value
      this.openTimeDropdown = ''
    },
    syncVisibleStaffIds() {
      const nextIds = this.staffList.map((staff) => Number(staff.eid))

      if (!this.visibleStaffIds.length) {
        this.visibleStaffIds = [...nextIds]
        return
      }

      const currentVisible = new Set(this.visibleStaffIds.map((id) => Number(id)))
      this.visibleStaffIds = nextIds.filter((id) => currentVisible.has(id))

      if (!this.visibleStaffIds.length) {
        this.visibleStaffIds = [...nextIds]
      }
    },
    isStaffVisible(staffId) {
      return this.visibleStaffIds.includes(Number(staffId))
    },
    toggleStaffVisibility(staffId) {
      const normalizedId = Number(staffId)

      if (this.isStaffVisible(normalizedId)) {
        this.visibleStaffIds = this.visibleStaffIds.filter((id) => Number(id) !== normalizedId)
        return
      }

      this.visibleStaffIds = [...this.visibleStaffIds, normalizedId]
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
      this.syncVisibleStaffIds()
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
      this.editingScheduleId = null
      this.formErrorMessage = ''
      this.openTimeDropdown = ''
      this.scheduleForm = this.createEmptyForm(date ? this.formatDateKey(date) : '')
      this.applyTimeParts('start', '09:00')
      this.applyTimeParts('end', '18:00')
      this.isScheduleDialogOpen = true
    },
    openEditPickerDialog() {
      this.editPickerForm = {
        staff_id: '',
        schedule_id: '',
      }
      this.editScheduleOptions = []
      this.editPickerErrorMessage = ''
      this.isLoadingEditOptions = false
      this.isLoadingEditSchedule = false
      this.isEditPickerDialogOpen = true
    },
    closeEditPickerDialog() {
      this.isEditPickerDialogOpen = false
      this.editPickerForm = {
        staff_id: '',
        schedule_id: '',
      }
      this.editScheduleOptions = []
      this.editPickerErrorMessage = ''
      this.isLoadingEditOptions = false
      this.isLoadingEditSchedule = false
    },
    async handleEditPickerStaffChange() {
      this.editPickerForm.schedule_id = ''
      this.editScheduleOptions = []
      this.editPickerErrorMessage = ''

      if (!this.editPickerForm.staff_id) {
        return
      }

      this.isLoadingEditOptions = true

      try {
        const response = await axios.get('/api/staff_schedule_options', {
          params: {
            staff_id: Number(this.editPickerForm.staff_id),
            from_date: this.formatDateKey(new Date()),
          },
        })
        this.editScheduleOptions = Array.isArray(response.data) ? response.data : []
      } catch (error) {
        console.error('fetch edit schedule options error', error)
        this.editScheduleOptions = []
        this.editPickerErrorMessage = error.response?.data?.message || error.response?.data || '載入班表選項失敗。'
      } finally {
        this.isLoadingEditOptions = false
      }
    },
    async submitEditPicker() {
      if (!this.editPickerForm.schedule_id) {
        this.editPickerErrorMessage = '請先選擇班表。'
        return
      }

      this.isLoadingEditSchedule = true
      this.editPickerErrorMessage = ''

      try {
        const response = await axios.get(`/api/staff_schedule/${this.editPickerForm.schedule_id}`)
        const schedule = response.data
        this.closeEditPickerDialog()
        this.openEditDialog(schedule)
      } catch (error) {
        console.error('fetch edit schedule detail error', error)
        this.editPickerErrorMessage = error.response?.data?.message || error.response?.data || '載入班表詳細資料失敗。'
      } finally {
        this.isLoadingEditSchedule = false
      }
    },
    openEditDialogFromDetail() {
      if (!this.selectedSchedule) {
        return
      }

      const schedule = { ...this.selectedSchedule }
      this.closeDetailDialog()
      this.openEditDialog(schedule)
    },
    openEditDialog(schedule) {
      this.editingScheduleId = Number(schedule.schedule_id)
      this.formErrorMessage = ''
      this.openTimeDropdown = ''
      this.scheduleForm = this.createEmptyForm()
      this.scheduleForm.staff_id = String(schedule.staff_id)
      this.scheduleForm.work_date = this.normalizeDateKey(schedule.work_date)
      this.scheduleForm.is_active = String(Number(schedule.is_active) === 0 ? 0 : 1)
      this.scheduleForm.note = schedule.note || ''
      this.applyTimeParts('start', schedule.start_time)
      this.applyTimeParts('end', schedule.end_time)
      this.isScheduleDialogOpen = true
    },
    closeScheduleDialog() {
      this.isScheduleDialogOpen = false
      this.editingScheduleId = null
      this.openTimeDropdown = ''
      this.formErrorMessage = ''
      this.scheduleForm = this.createEmptyForm()
    },
    async submitSchedule() {
      if (!this.scheduleForm.staff_id || !this.scheduleForm.work_date) {
        this.formErrorMessage = '請完整填寫員工與上班日期。'
        return
      }

      const startTime = this.buildTimeValue('start')
      const endTime = this.buildTimeValue('end')

      if (startTime >= endTime) {
        this.formErrorMessage = '上班時間必須早於下班時間。'
        return
      }

      this.isSaving = true
      this.formErrorMessage = ''

      try {
        const auth = getStoredAuth()
        const targetWorkDate = this.scheduleForm.work_date
        const payload = {
          staff_id: Number(this.scheduleForm.staff_id),
          work_date: targetWorkDate,
          start_time: startTime,
          end_time: endTime,
          is_active: Number(this.scheduleForm.is_active),
          note: this.scheduleForm.note || null,
          created_by: auth?.eid ?? null,
        }

        if (this.isEditingSchedule) {
          await axios.put(`/api/staff_schedule/${this.editingScheduleId}`, payload)
        } else {
          await axios.post('/api/staff_schedule', payload)
        }

        this.closeScheduleDialog()

        const [year, month] = targetWorkDate.split('-')
        const targetMonth = `${year}-${month}`

        if (targetMonth !== this.currentMonthKey) {
          this.currentDate = new Date(Number(year), Number(month) - 1, 1)
        } else {
          await this.fetchSchedules()
        }
      } catch (error) {
        console.error('save schedule error', error)
        this.formErrorMessage = error.response?.data?.message || error.response?.data || '儲存班表失敗。'
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
        this.detailErrorMessage = error.response?.data?.message || error.response?.data || '載入班表詳細資訊失敗。'
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
    buildTimeValue(prefix) {
      return `${this.scheduleForm[`${prefix}_hour`]}:${this.scheduleForm[`${prefix}_minute`]}`
    },
    applyTimeParts(prefix, timeValue) {
      const [hourText = '00', minuteText = '00'] = String(timeValue).split(':')
      this.scheduleForm[`${prefix}_hour`] = String(Number(hourText)).padStart(2, '0')
      this.scheduleForm[`${prefix}_minute`] = String(Number(minuteText)).padStart(2, '0')
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

      const rawValue = String(value).trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
        return rawValue
      }

      const matchedDate = rawValue.match(/\d{4}-\d{2}-\d{2}/)
      if (matchedDate) {
        return matchedDate[0]
      }

      const parsedDate = new Date(rawValue)
      return Number.isNaN(parsedDate.getTime()) ? '' : this.formatDateKey(parsedDate)
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
    formatEditScheduleOption(schedule) {
      const statusText = Number(schedule.is_active) === 1 ? '啟用' : '停用'
      return `${this.formatDateDisplay(schedule.work_date)} ${schedule.start_time} - ${schedule.end_time} (${statusText})`
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
  gap: 12px;
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
  padding: 24px 28px;
  background:
    radial-gradient(circle at top right, rgba(77, 182, 255, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(244, 249, 255, 0.92));
}

.hero-copy {
  min-width: 0;
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
  max-width: 560px;
  color: #4f6479;
  line-height: 1.6;
}

.calendar-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  min-width: min(360px, 100%);
}

.calendar-controls,
.calendar-toolbar,
.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.calendar-controls {
  justify-content: flex-end;
}

.current-time-card {
  min-width: 220px;
  padding: 14px 18px;
  border: 1px solid rgba(32, 52, 74, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 42px rgba(31, 65, 102, 0.12);
}

.current-time-label {
  display: block;
  margin: 0 0 8px;
  color: #6f8194;
  font-size: 13px;
  font-weight: 500;
}

.current-time-value {
  margin: 0;
  color: #20344a;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
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
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, opacity 0.18s ease;
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

.calendar-shell {
  padding: 18px 20px 20px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 6px;
  padding: 8px 8px 8px;
}

.calendar-range {
  font-size: 13px;
}

.calendar-toolbar {
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 4px;
  padding: 0 8px 0;
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
  cursor: pointer;
}

.staff-legend-item:hover {
  transform: translateY(-1px);
}

.staff-legend-item--inactive {
  opacity: 0.4;
  background: rgba(244, 248, 252, 0.48);
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

.toolbar-actions {
  justify-content: flex-end;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-weekdays {
  margin-bottom: 4px;
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
  overflow: visible;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 24px 48px rgba(32, 52, 74, 0.18);
  padding: 22px;
}

.dialog-card--compact {
  width: min(520px, 100%);
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

.detail-dialog-actions {
  display: flex;
  align-items: center;
  gap: 10px;
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
  gap: 18px;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  padding-right: 4px;
}

.schedule-form--compact {
  max-height: none;
  overflow: visible;
  padding-right: 0;
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

.time-select-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.time-dropdown {
  position: relative;
}

.time-dropdown-trigger {
  width: 100%;
  min-height: 48px;
  border: 1px solid #d6dde7;
  border-radius: 14px;
  background: #f8fbfe;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
}

.time-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 5;
  max-height: 288px;
  overflow-y: auto;
  border: 1px solid #d6dde7;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 16px 32px rgba(32, 52, 74, 0.14);
  padding: 6px;
}

.time-dropdown-option {
  width: 100%;
  min-height: 36px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.time-dropdown-option:hover,
.time-dropdown-option--active {
  background: #eef5ff;
  color: #1f7ae0;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-bottom: 18px;
}

.detail-list {
  display: grid;
  grid-template-columns: 130px 1fr;
  margin: 0;
  border: 1px solid #e7edf3;
  border-bottom: 0;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
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

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

@media (max-width: 1100px) {
  .calendar-hero,
  .calendar-header,
  .calendar-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .calendar-actions {
    width: 100%;
    min-width: 100%;
    align-items: stretch;
  }

  .calendar-controls,
  .toolbar-actions {
    justify-content: flex-start;
  }

  .current-time-card {
    min-width: 0;
    width: 100%;
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

  .current-time-value {
    font-size: 16px;
  }

  .form-row,
  .time-select-group {
    grid-template-columns: 1fr;
  }

  .dialog-overlay {
    padding: 12px;
  }

  .detail-list {
    grid-template-columns: 1fr;
  }

  .detail-dialog-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
