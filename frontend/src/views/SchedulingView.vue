<template>
  <section class="scheduling-view">
    <header class="calendar-hero">
      <div>
        <p class="calendar-eyebrow">Staff Scheduling</p>
        <h1>排班行事曆</h1>
        <p class="calendar-subtitle">
          先以純前端月曆顯示為主，之後再接排班資料與資料庫。
        </p>
      </div>

      <div class="calendar-controls">
        <button type="button" class="calendar-nav-button" @click="goToPreviousMonth">
          ← 上個月
        </button>
        <button type="button" class="calendar-today-button" @click="goToCurrentMonth">
          今天
        </button>
        <button type="button" class="calendar-nav-button" @click="goToNextMonth">
          下個月 →
        </button>
      </div>
    </header>

    <section class="calendar-shell" aria-label="排班月曆">
      <div class="calendar-header">
        <div>
          <p class="calendar-caption">Monthly Schedule</p>
          <h2>{{ currentMonthLabel }}</h2>
        </div>
        <p class="calendar-range">
          {{ visibleRangeLabel }}
        </p>
      </div>

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
            <span v-if="day.isToday" class="calendar-day-badge">Today</span>
          </div>

          <div class="calendar-shifts">
            <div
              v-for="shift in demoShifts(day)"
              :key="shift.id"
              :class="['calendar-shift', `calendar-shift--${shift.tone}`]"
            >
              <span class="calendar-shift-time">{{ shift.time }}</span>
              <span class="calendar-shift-title">{{ shift.title }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<script>
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default {
  name: 'SchedulingView',
  data() {
    return {
      weekdays: WEEKDAYS,
      currentDate: this.startOfMonth(new Date()),
    }
  },
  computed: {
    currentMonthLabel() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth() + 1

      return `${year}年${month}月`
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
  },
  methods: {
    startOfMonth(date) {
      return new Date(date.getFullYear(), date.getMonth(), 1)
    },
    goToPreviousMonth() {
      this.currentDate = new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth() - 1,
        1
      )
    },
    goToNextMonth() {
      this.currentDate = new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth() + 1,
        1
      )
    },
    goToCurrentMonth() {
      this.currentDate = this.startOfMonth(new Date())
    },
    isSameDate(left, right) {
      return (
        left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate()
      )
    },
    formatDateKey(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')

      return `${year}-${month}-${day}`
    },
    formatShortDate(date) {
      return `${date.getMonth() + 1}/${date.getDate()}`
    },
    demoShifts(day) {
      if (!day.isCurrentMonth) {
        return []
      }

      const dayOfMonth = day.date.getDate()
      const shifts = []

      if (dayOfMonth % 3 === 0) {
        shifts.push({
          id: `${day.key}-open`,
          time: '09:00',
          title: '早班',
          tone: 'blue',
        })
      }

      if (dayOfMonth % 5 === 0) {
        shifts.push({
          id: `${day.key}-mid`,
          time: '13:00',
          title: '櫃台',
          tone: 'gold',
        })
      }

      if (dayOfMonth % 2 === 0) {
        shifts.push({
          id: `${day.key}-night`,
          time: '18:00',
          title: '晚班',
          tone: 'coral',
        })
      }

      return shifts.slice(0, 3)
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
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 20px 50px rgba(31, 65, 102, 0.08);
  backdrop-filter: blur(18px);
}

.calendar-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px;
  background:
    radial-gradient(circle at top right, rgba(77, 182, 255, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(244, 249, 255, 0.92));
}

.calendar-eyebrow,
.calendar-caption,
.calendar-range {
  margin: 0;
  color: #65809c;
  letter-spacing: 0.08em;
}

.calendar-eyebrow,
.calendar-caption {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.calendar-hero h1,
.calendar-header h2 {
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

.calendar-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}

.calendar-nav-button,
.calendar-today-button {
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(32, 52, 74, 0.12);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.calendar-nav-button {
  background: #ffffff;
  color: #20344a;
}

.calendar-today-button {
  background: linear-gradient(135deg, #1f7ae0, #4db6ff);
  color: #ffffff;
  box-shadow: 0 16px 32px rgba(31, 122, 224, 0.2);
}

.calendar-nav-button:hover,
.calendar-today-button:hover {
  transform: translateY(-1px);
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
  font-weight: 600;
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
  min-height: 150px;
  padding: 14px;
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbfd 100%);
  border: 1px solid rgba(111, 138, 166, 0.14);
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  font-size: 17px;
  font-weight: 800;
  color: inherit;
}

.calendar-day-badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(31, 122, 224, 0.12);
  color: #0f5ea8;
  font-size: 12px;
  font-weight: 700;
}

.calendar-shifts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calendar-shift {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 10px;
  border-radius: 14px;
  font-size: 12px;
  line-height: 1.4;
}

.calendar-shift--blue {
  background: #e8f4ff;
  color: #0f5ea8;
}

.calendar-shift--gold {
  background: #fff4d6;
  color: #9a6400;
}

.calendar-shift--coral {
  background: #ffe4de;
  color: #bb4d2f;
}

.calendar-shift-time {
  font-weight: 700;
}

.calendar-shift-title {
  opacity: 0.9;
}

@media (max-width: 1100px) {
  .calendar-hero,
  .calendar-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .calendar-controls {
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
}
</style>
