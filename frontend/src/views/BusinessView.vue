<template>
  <div class="business-view">
    <section class="hero-card">
      <div class="hero-copy">
        <p class="eyebrow">Business Hours</p>
        <h1>營業時間設定</h1>
        <p class="hero-text">
          設定星期一到星期日的營業狀態與開始、閉店時間。
        </p>
      </div>

      <div class="hero-actions">
        <button
          v-if="hasUnsavedChanges"
          type="button"
          class="cancel-button"
          :disabled="isLoading || isSaving"
          @click="resetBusinessHours"
        >
          取消變更
        </button>

        <button
          type="button"
          class="save-button"
          :class="{ 'save-button--dirty': hasUnsavedChanges }"
          :disabled="isLoading || isSaving || !hasUnsavedChanges || hasLoadError"
          @click="saveBusinessHours"
        >
          {{ isSaving ? '儲存中...' : '儲存設定' }}
        </button>
      </div>
    </section>

    <p v-if="errorMessage" class="message error-message">
      {{ errorMessage }}
    </p>
    <p v-if="successMessage" class="message success-message">
      {{ successMessage }}
    </p>

    <section class="hours-card" :class="{ 'hours-card--disabled': hasLoadError }">
      <div class="hours-header">
        <span>星期</span>
        <span>營業狀態</span>
        <span>開始時間</span>
        <span>閉店時間</span>
      </div>

      <div v-if="isLoading" class="loading-state">
        讀取營業時間中...
      </div>

      <div v-else class="hours-list">
        <article
          v-for="day in businessHours"
          :key="day.weekday"
          class="day-row"
          :class="{ inactive: !day.is_active }"
        >
          <div class="day-name">
            <strong>{{ day.weekday_name }}</strong>
          </div>

          <button
            type="button"
            class="switch-button"
            :class="{ 'switch-button--active': day.is_active }"
            :aria-pressed="day.is_active ? 'true' : 'false'"
            :disabled="hasLoadError"
            @click="toggleDay(day.weekday)"
          >
            <span class="switch-track-text">
              {{ day.is_active ? '營業' : '公休' }}
            </span>
            <span class="switch-thumb" />
          </button>

          <label class="time-field">
            <span class="mobile-label">開始時間</span>
            <div class="time-select-row">
              <select
                :value="day.open_hour"
                :disabled="!day.is_active || hasLoadError"
                @change="updateTime(day.weekday, 'open_time', 'hour', $event.target.value)"
              >
                <option value="">時</option>
                <option
                  v-for="hour in hourOptions"
                  :key="`open-hour-${day.weekday}-${hour}`"
                  :value="hour"
                >
                  {{ hour }}
                </option>
              </select>
              <span class="time-separator">:</span>
              <select
                :value="day.open_minute"
                :disabled="!day.is_active || hasLoadError"
                @change="updateTime(day.weekday, 'open_time', 'minute', $event.target.value)"
              >
                <option value="">分</option>
                <option
                  v-for="minute in minuteOptions"
                  :key="`open-minute-${day.weekday}-${minute}`"
                  :value="minute"
                >
                  {{ minute }}
                </option>
              </select>
            </div>
          </label>

          <label class="time-field">
            <span class="mobile-label">閉店時間</span>
            <div class="time-select-row">
              <select
                :value="day.close_hour"
                :disabled="!day.is_active || hasLoadError"
                @change="updateTime(day.weekday, 'close_time', 'hour', $event.target.value)"
              >
                <option value="">時</option>
                <option
                  v-for="hour in hourOptions"
                  :key="`close-hour-${day.weekday}-${hour}`"
                  :value="hour"
                >
                  {{ hour }}
                </option>
              </select>
              <span class="time-separator">:</span>
              <select
                :value="day.close_minute"
                :disabled="!day.is_active || hasLoadError"
                @change="updateTime(day.weekday, 'close_time', 'minute', $event.target.value)"
              >
                <option value="">分</option>
                <option
                  v-for="minute in minuteOptions"
                  :key="`close-minute-${day.weekday}-${minute}`"
                  :value="minute"
                >
                  {{ minute }}
                </option>
              </select>
            </div>
          </label>
        </article>

        <div v-if="!businessHours.length" class="empty-state">
          查無營業時間資料
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import axios from 'axios'

const toTimeValue = (value, fallback) => {
  const normalized = String(value ?? '').trim()
  if (!normalized) {
    return fallback
  }

  return normalized.slice(0, 5)
}

const splitTimeValue = (value) => {
  const normalized = toTimeValue(value, '')
  const [hour = '', minute = ''] = normalized.split(':')
  return { hour, minute }
}

const composeTimeValue = (hour, minute) => {
  if (!hour || !minute) {
    return ''
  }

  return `${hour}:${minute}`
}

export default {
  data() {
    return {
      isLoading: false,
      isSaving: false,
      hasLoadError: false,
      errorMessage: '',
      successMessage: '',
      initialBusinessHoursSnapshot: '',
      businessHours: [],
    }
  },

  computed: {
    hourOptions() {
      return Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
    },

    minuteOptions() {
      return Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))
    },

    hasUnsavedChanges() {
      if (this.hasLoadError || !this.initialBusinessHoursSnapshot) {
        return false
      }

      return this.createSnapshot(this.businessHours) !== this.initialBusinessHoursSnapshot
    },
  },

  mounted() {
    this.fetchBusinessHours()
  },

  methods: {
    createSnapshot(list) {
      return JSON.stringify(
        list.map((day) => ({
          weekday: Number(day.weekday),
          is_active: Boolean(day.is_active),
          open_hour: String(day.open_hour ?? ''),
          open_minute: String(day.open_minute ?? ''),
          close_hour: String(day.close_hour ?? ''),
          close_minute: String(day.close_minute ?? ''),
        }))
      )
    },

    normalizeBusinessHours(list) {
      if (!Array.isArray(list)) {
        return []
      }

      return [...list]
        .sort((a, b) => Number(a.weekday) - Number(b.weekday))
        .map((item) => {
          const openTime = splitTimeValue(item.open_time)
          const closeTime = splitTimeValue(item.close_time)

          return {
            ...item,
            is_active: Number(item.is_active) === 1,
            open_hour: openTime.hour,
            open_minute: openTime.minute,
            close_hour: closeTime.hour,
            close_minute: closeTime.minute,
          }
        })
    },

    updateTime(weekday, field, part, value) {
      if (this.hasLoadError) {
        return
      }

      this.errorMessage = ''
      this.successMessage = ''

      this.businessHours = this.businessHours.map((day) => {
        if (day.weekday !== weekday) {
          return day
        }

        const hourField = field === 'open_time' ? 'open_hour' : 'close_hour'
        const minuteField = field === 'open_time' ? 'open_minute' : 'close_minute'

        return {
          ...day,
          [part === 'hour' ? hourField : minuteField]: value,
        }
      })
    },

    async fetchBusinessHours() {
      this.isLoading = true
      this.hasLoadError = false
      this.errorMessage = ''

      try {
        const res = await axios.get('/api/business_hours')
        this.businessHours = this.normalizeBusinessHours(res.data)
        this.initialBusinessHoursSnapshot = this.createSnapshot(this.businessHours)
      } catch (err) {
        console.error('Failed to fetch business hours', err)
        this.errorMessage = '讀取營業時間失敗'
        this.hasLoadError = true
        this.businessHours = []
        this.initialBusinessHoursSnapshot = ''
      } finally {
        this.isLoading = false
      }
    },

    toggleDay(weekday) {
      if (this.hasLoadError) {
        return
      }

      this.errorMessage = ''
      this.successMessage = ''
      this.businessHours = this.businessHours.map((day) =>
        day.weekday === weekday
          ? { ...day, is_active: !day.is_active }
          : day
      )
    },

    resetBusinessHours() {
      if (!this.initialBusinessHoursSnapshot) {
        return
      }

      this.errorMessage = ''
      this.successMessage = ''
      this.businessHours = this.normalizeBusinessHours(JSON.parse(this.initialBusinessHoursSnapshot))
    },

    validateBusinessHours() {
      for (const day of this.businessHours) {
        if (!day.is_active) {
          continue
        }

        const openTime = composeTimeValue(day.open_hour, day.open_minute)
        const closeTime = composeTimeValue(day.close_hour, day.close_minute)

        if (!openTime || !closeTime) {
          return `${day.weekday_name} 請設定開始與閉店時間`
        }

        if (openTime >= closeTime) {
          return `${day.weekday_name} 的開始時間必須早於閉店時間`
        }
      }

      return ''
    },

    async saveBusinessHours() {
      if (this.hasLoadError) {
        return
      }

      const validationMessage = this.validateBusinessHours()
      if (validationMessage) {
        this.errorMessage = validationMessage
        this.successMessage = ''
        return
      }

      this.isSaving = true
      this.errorMessage = ''
      this.successMessage = ''

      try {
        await axios.post('/api/business_hours', {
          business_hours: this.businessHours.map((day) => ({
            weekday: day.weekday,
            weekday_name: day.weekday_name,
            is_active: day.is_active ? 1 : 0,
            open_time: day.is_active
              ? `${composeTimeValue(day.open_hour, day.open_minute)}:00`
              : null,
            close_time: day.is_active
              ? `${composeTimeValue(day.close_hour, day.close_minute)}:00`
              : null,
          })),
        })

        this.successMessage = '營業時間已更新'
        await this.fetchBusinessHours()
      } catch (err) {
        console.error('Failed to save business hours', err)
        this.errorMessage = err.response?.data?.message || err.response?.data || '儲存營業時間失敗'
      } finally {
        this.isSaving = false
      }
    },
  },
}
</script>

<style scoped>
.business-view {
  margin: 0 auto;
  max-width: 1120px;
  padding: 28px;
}

.hero-card,
.hours-card {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(242, 248, 255, 0.96));
  border: 1px solid #d6e4f0;
  border-radius: 24px;
  box-shadow: 0 18px 50px rgba(33, 66, 99, 0.08);
}

.hero-card {
  align-items: end;
  display: flex;
  gap: 24px;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 28px;
}

.hero-actions {
  align-items: center;
  display: flex;
  gap: 12px;
}

.eyebrow {
  color: #0f766e;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.12em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.hero-copy h1 {
  color: #16324f;
  font-size: 34px;
  margin: 0;
}

.hero-text {
  color: #4f6479;
  margin: 10px 0 0;
}

.save-button {
  background: linear-gradient(135deg, #0f766e, #1d4ed8);
  border: 0;
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  min-width: 140px;
  padding: 14px 22px;
}

.save-button--dirty {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
}

.save-button:disabled,
.cancel-button:disabled,
.switch-button:disabled,
.time-field select:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.cancel-button {
  background: #fff;
  border: 1px solid #ef4444;
  border-radius: 999px;
  color: #b91c1c;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  min-width: 120px;
  padding: 14px 20px;
}

.message {
  border-radius: 14px;
  font-weight: 600;
  margin: 0 0 16px;
  padding: 14px 16px;
}

.error-message {
  background: #fff1f2;
  color: #be123c;
}

.success-message {
  background: #ecfdf5;
  color: #047857;
}

.hours-card {
  overflow: hidden;
  padding: 10px;
}

.hours-card--disabled {
  background: linear-gradient(135deg, rgba(244, 244, 245, 0.96), rgba(228, 228, 231, 0.96));
  border-color: #d4d4d8;
}

.hours-header,
.day-row {
  align-items: center;
  display: grid;
  gap: 16px;
  grid-template-columns: 1.2fr 180px 1fr 1fr;
}

.hours-header {
  color: #5a6d80;
  font-size: 14px;
  font-weight: 700;
  padding: 16px 18px 12px;
}

.hours-list {
  display: grid;
  gap: 10px;
}

.day-row {
  background: #fff;
  border: 1px solid #dbe7f1;
  border-radius: 18px;
  padding: 18px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.hours-card--disabled .hours-header,
.hours-card--disabled .day-name strong,
.hours-card--disabled .day-name span,
.hours-card--disabled .loading-state,
.hours-card--disabled .empty-state {
  color: #71717a;
}

.hours-card--disabled .day-row {
  background: #f4f4f5;
  border-color: #d4d4d8;
}

.day-row:hover {
  box-shadow: 0 12px 30px rgba(29, 78, 216, 0.08);
  transform: translateY(-1px);
}

.hours-card--disabled .day-row:hover {
  box-shadow: none;
  transform: none;
}

.day-row.inactive {
  opacity: 0.78;
}

.day-name {
  display: grid;
  gap: 4px;
  text-align: left;
}

.day-name strong {
  color: #16324f;
  font-size: 18px;
}

.day-name span {
  color: #6b7f92;
  font-size: 13px;
}

.switch-button {
  align-items: center;
  background: #d7dee7;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  justify-content: flex-start;
  padding: 6px 12px;
  position: relative;
  transition: background 0.2s ease;
  width: 132px;
}

.switch-button--active {
  background: linear-gradient(135deg, #34d399, #0f766e);
}

.hours-card--disabled .switch-button {
  background: #d4d4d8;
}

.switch-track-text {
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  padding-left: 34px;
  transition: padding 0.2s ease;
}

.switch-button:not(.switch-button--active) .switch-track-text {
  color: #37506a;
}

.switch-thumb {
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
  display: block;
  height: 28px;
  left: 8px;
  position: absolute;
  top: 6px;
  transform: translateX(0);
  transition: transform 0.2s ease;
  width: 28px;
}

.switch-button--active .switch-thumb {
  transform: translateX(88px);
}

.switch-button--active .switch-track-text {
  padding-left: 0;
  padding-right: 34px;
}

.time-field {
  display: grid;
  gap: 6px;
}

.time-select-row {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.time-field select {
  background: #f8fbff;
  border: 1px solid #c8d6e5;
  border-radius: 12px;
  color: #16324f;
  font: inherit;
  min-height: 44px;
  padding: 0 14px;
}

.time-field select:disabled {
  background: #edf2f7;
  color: #94a3b8;
}

.time-separator {
  color: #64748b;
  font-weight: 700;
}

.mobile-label {
  display: none;
}

.loading-state {
  color: #516579;
  padding: 24px 18px;
}

.empty-state {
  color: #516579;
  padding: 24px 18px;
  text-align: center;
}

@media (max-width: 900px) {
  .business-view {
    padding: 16px;
  }

  .hero-card {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-end;
    width: 100%;
  }

  .hours-header {
    display: none;
  }

  .day-row {
    grid-template-columns: 1fr;
  }

  .mobile-label {
    color: #64748b;
    display: inline;
    font-size: 13px;
    font-weight: 700;
  }
}
</style>
