<template>
  <div class="ticket-rental-view">
    <section class="management-section">
      <div class="section-header">
        <div>
          <h1>票券</h1>
          <p class="section-subtitle">管理票券價格、建立票種與切換啟用狀態。</p>
        </div>

        <div class="section-actions">
          <button type="button" class="secondary-button" @click="openTicketSettingsDialog">
            票券設定
          </button>
          <button type="button" class="primary-button" @click="openTicketCreateDialog">
            新增票券
          </button>
        </div>
      </div>

      <p v-if="ticketState.isLoading" class="section-message">載入票券資料中...</p>
      <p v-else-if="ticketState.errorMessage" class="section-message error">
        {{ ticketState.errorMessage }}
      </p>

      <div v-else class="card-list">
        <button
          v-for="ticket in ticketState.list"
          :key="ticket.ticket_id"
          type="button"
          class="item-card"
          @click="openTicketPriceDialog(ticket)"
        >
          <div class="item-card-top">
            <span class="item-name">{{ ticket.ticket_name }}</span>
            <span
              class="status-badge"
              :class="Number(ticket.is_active) === 0 ? 'inactive' : 'active'"
            >
              {{ Number(ticket.is_active) === 0 ? '停用中' : '啟用中' }}
            </span>
          </div>
          <span class="item-price">${{ formatPrice(ticket.ticket_price) }}</span>
        </button>
      </div>
    </section>

    <section class="management-section">
      <div class="section-header">
        <div>
          <h2>租借裝備</h2>
          <p class="section-subtitle">管理租借裝備價格、建立品項與切換啟用狀態。</p>
        </div>

        <div class="section-actions">
          <button type="button" class="secondary-button" @click="openRentalSettingsDialog">
            裝備設定
          </button>
          <button type="button" class="primary-button" @click="openRentalCreateDialog">
            新增裝備
          </button>
        </div>
      </div>

      <p v-if="rentalState.isLoading" class="section-message">載入租借裝備資料中...</p>
      <p v-else-if="rentalState.errorMessage" class="section-message error">
        {{ rentalState.errorMessage }}
      </p>

      <div v-else class="card-list">
        <button
          v-for="rental in rentalState.list"
          :key="rental.rental_id"
          type="button"
          class="item-card"
          @click="openRentalPriceDialog(rental)"
        >
          <div class="item-card-top">
            <span class="item-name">{{ rental.rental_name }}</span>
            <span
              class="status-badge"
              :class="Number(rental.is_active) === 0 ? 'inactive' : 'active'"
            >
              {{ Number(rental.is_active) === 0 ? '停用中' : '啟用中' }}
            </span>
          </div>
          <span class="item-price">${{ formatPrice(rental.rental_price) }}</span>
        </button>
      </div>
    </section>

    <div
      v-if="ticketState.isPriceDialogOpen"
      class="dialog-overlay"
      @click.self="closeTicketDialogs"
    >
      <aside class="side-dialog" aria-label="調整票券價格">
        <div class="dialog-header">
          <h3>調整票券價格</h3>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉調整票券價格視窗"
            @click="closeTicketDialogs"
          >
            X
          </button>
        </div>

        <form class="form-grid" @submit.prevent="submitTicketPriceUpdate">
          <label>
            票券代碼
            <input :value="ticketState.priceForm.ticket_code" type="text" disabled />
          </label>

          <label>
            票券名稱
            <input :value="ticketState.priceForm.ticket_name" type="text" disabled />
          </label>

          <label>
            票價
            <input
              v-model.number="ticketState.priceForm.ticket_price"
              type="number"
              min="0"
              required
            />
          </label>

          <div class="form-actions">
            <button type="submit" class="primary-button" :disabled="ticketState.isSubmitting">
              {{ ticketState.isSubmitting ? '儲存中...' : '儲存價格' }}
            </button>
            <button type="button" class="secondary-button" @click="closeTicketDialogs">
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>

    <div
      v-if="ticketState.isCreateDialogOpen"
      class="dialog-overlay"
      @click.self="closeTicketDialogs"
    >
      <aside class="side-dialog" aria-label="新增票券">
        <div class="dialog-header">
          <h3>新增票券</h3>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉新增票券視窗"
            @click="closeTicketDialogs"
          >
            X
          </button>
        </div>

        <form class="form-grid" @submit.prevent="submitNewTicket">
          <label>
            票券名稱
            <input v-model.trim="ticketState.createForm.ticket_name" type="text" required />
          </label>

          <label>
            票價
            <input
              v-model.number="ticketState.createForm.ticket_price"
              type="number"
              min="0"
              required
            />
          </label>

          <label>
            啟用狀態
            <select v-model.number="ticketState.createForm.is_active">
              <option :value="1">啟用</option>
              <option :value="0">停用</option>
            </select>
          </label>

          <label>
            備註
            <textarea v-model.trim="ticketState.createForm.note" rows="3" />
          </label>

          <div class="form-actions">
            <button type="submit" class="primary-button" :disabled="ticketState.isSubmitting">
              {{ ticketState.isSubmitting ? '建立中...' : '建立票券' }}
            </button>
            <button type="button" class="secondary-button" @click="closeTicketDialogs">
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>

    <div
      v-if="ticketState.isSettingsDialogOpen"
      class="dialog-overlay"
      @click.self="closeTicketDialogs"
    >
      <aside class="side-dialog" aria-label="票券設定">
        <div class="dialog-header">
          <h3>票券設定</h3>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉票券設定視窗"
            @click="closeTicketDialogs"
          >
            X
          </button>
        </div>

        <div class="settings-list">
          <div
            v-for="ticket in ticketState.list"
            :key="ticket.ticket_id"
            class="settings-item"
          >
            <div class="settings-copy">
              <strong>{{ ticket.ticket_name }}</strong>
              <span>{{ ticket.ticket_code }} | ${{ formatPrice(ticket.ticket_price) }}</span>
            </div>

            <button
              type="button"
              class="status-toggle-button"
              :class="Number(ticket.is_active) === 0 ? 'inactive' : 'active'"
              :disabled="ticketState.isSubmitting"
              @click="toggleTicketStatus(ticket)"
            >
              {{ Number(ticket.is_active) === 0 ? '設為啟用' : '設為停用' }}
            </button>
          </div>
        </div>
      </aside>
    </div>

    <div
      v-if="rentalState.isPriceDialogOpen"
      class="dialog-overlay"
      @click.self="closeRentalDialogs"
    >
      <aside class="side-dialog" aria-label="調整裝備價格">
        <div class="dialog-header">
          <h3>調整裝備價格</h3>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉調整裝備價格視窗"
            @click="closeRentalDialogs"
          >
            X
          </button>
        </div>

        <form class="form-grid" @submit.prevent="submitRentalPriceUpdate">
          <label>
            裝備代碼
            <input :value="rentalState.priceForm.rental_code" type="text" disabled />
          </label>

          <label>
            裝備名稱
            <input :value="rentalState.priceForm.rental_name" type="text" disabled />
          </label>

          <label>
            租借價格
            <input
              v-model.number="rentalState.priceForm.rental_price"
              type="number"
              min="0"
              required
            />
          </label>

          <div class="form-actions">
            <button type="submit" class="primary-button" :disabled="rentalState.isSubmitting">
              {{ rentalState.isSubmitting ? '儲存中...' : '儲存價格' }}
            </button>
            <button type="button" class="secondary-button" @click="closeRentalDialogs">
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>

    <div
      v-if="rentalState.isCreateDialogOpen"
      class="dialog-overlay"
      @click.self="closeRentalDialogs"
    >
      <aside class="side-dialog" aria-label="新增裝備">
        <div class="dialog-header">
          <h3>新增裝備</h3>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉新增裝備視窗"
            @click="closeRentalDialogs"
          >
            X
          </button>
        </div>

        <form class="form-grid" @submit.prevent="submitNewRental">
          <label>
            裝備名稱
            <input v-model.trim="rentalState.createForm.rental_name" type="text" required />
          </label>

          <label>
            租借價格
            <input
              v-model.number="rentalState.createForm.rental_price"
              type="number"
              min="0"
              required
            />
          </label>

          <label>
            啟用狀態
            <select v-model.number="rentalState.createForm.is_active">
              <option :value="1">啟用</option>
              <option :value="0">停用</option>
            </select>
          </label>

          <label>
            備註
            <textarea v-model.trim="rentalState.createForm.note" rows="3" />
          </label>

          <div class="form-actions">
            <button type="submit" class="primary-button" :disabled="rentalState.isSubmitting">
              {{ rentalState.isSubmitting ? '建立中...' : '建立裝備' }}
            </button>
            <button type="button" class="secondary-button" @click="closeRentalDialogs">
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>

    <div
      v-if="rentalState.isSettingsDialogOpen"
      class="dialog-overlay"
      @click.self="closeRentalDialogs"
    >
      <aside class="side-dialog" aria-label="裝備設定">
        <div class="dialog-header">
          <h3>裝備設定</h3>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉裝備設定視窗"
            @click="closeRentalDialogs"
          >
            X
          </button>
        </div>

        <div class="settings-list">
          <div
            v-for="rental in rentalState.list"
            :key="rental.rental_id"
            class="settings-item"
          >
            <div class="settings-copy">
              <strong>{{ rental.rental_name }}</strong>
              <span>{{ rental.rental_code }} | ${{ formatPrice(rental.rental_price) }}</span>
            </div>

            <button
              type="button"
              class="status-toggle-button"
              :class="Number(rental.is_active) === 0 ? 'inactive' : 'active'"
              :disabled="rentalState.isSubmitting"
              @click="toggleRentalStatus(rental)"
            >
              {{ Number(rental.is_active) === 0 ? '設為啟用' : '設為停用' }}
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const createEmptyTicketForm = () => ({
  ticket_name: '',
  ticket_price: 0,
  is_active: 1,
  note: '',
})

const createEmptyRentalForm = () => ({
  rental_name: '',
  rental_price: 0,
  is_active: 1,
  note: '',
})

export default {
  data() {
    return {
      ticketState: {
        list: [],
        isLoading: false,
        isSubmitting: false,
        errorMessage: '',
        isPriceDialogOpen: false,
        isCreateDialogOpen: false,
        isSettingsDialogOpen: false,
        selectedId: null,
        priceForm: {
          ticket_code: '',
          ticket_name: '',
          ticket_price: 0,
        },
        createForm: createEmptyTicketForm(),
      },
      rentalState: {
        list: [],
        isLoading: false,
        isSubmitting: false,
        errorMessage: '',
        isPriceDialogOpen: false,
        isCreateDialogOpen: false,
        isSettingsDialogOpen: false,
        selectedId: null,
        priceForm: {
          rental_code: '',
          rental_name: '',
          rental_price: 0,
        },
        createForm: createEmptyRentalForm(),
      },
    }
  },

  mounted() {
    this.fetchTicketList()
    this.fetchRentalList()
  },

  methods: {
    async fetchTicketList() {
      this.ticketState.isLoading = true
      this.ticketState.errorMessage = ''

      try {
        const res = await axios.get('/api/ticket')
        this.ticketState.list = Array.isArray(res.data) ? res.data : []
      } catch (err) {
        console.error('Failed to fetch ticket list', err)
        this.ticketState.errorMessage = '票券資料讀取失敗'
      } finally {
        this.ticketState.isLoading = false
      }
    },

    async fetchRentalList() {
      this.rentalState.isLoading = true
      this.rentalState.errorMessage = ''

      try {
        const res = await axios.get('/api/rental_equipment')
        this.rentalState.list = Array.isArray(res.data) ? res.data : []
      } catch (err) {
        console.error('Failed to fetch rental equipment list', err)
        this.rentalState.errorMessage = '租借裝備資料讀取失敗'
      } finally {
        this.rentalState.isLoading = false
      }
    },

    openTicketPriceDialog(ticket) {
      this.ticketState.selectedId = ticket.ticket_id
      this.ticketState.priceForm = {
        ticket_code: ticket.ticket_code ?? '',
        ticket_name: ticket.ticket_name ?? '',
        ticket_price: Number(ticket.ticket_price ?? 0),
      }
      this.ticketState.isPriceDialogOpen = true
      this.ticketState.isCreateDialogOpen = false
      this.ticketState.isSettingsDialogOpen = false
    },

    openTicketCreateDialog() {
      this.ticketState.createForm = createEmptyTicketForm()
      this.ticketState.isCreateDialogOpen = true
      this.ticketState.isPriceDialogOpen = false
      this.ticketState.isSettingsDialogOpen = false
      this.ticketState.selectedId = null
    },

    openTicketSettingsDialog() {
      this.ticketState.isSettingsDialogOpen = true
      this.ticketState.isCreateDialogOpen = false
      this.ticketState.isPriceDialogOpen = false
      this.ticketState.selectedId = null
    },

    closeTicketDialogs() {
      this.ticketState.isPriceDialogOpen = false
      this.ticketState.isCreateDialogOpen = false
      this.ticketState.isSettingsDialogOpen = false
      this.ticketState.selectedId = null
    },

    async submitTicketPriceUpdate() {
      if (!this.ticketState.selectedId) {
        return
      }

      this.ticketState.isSubmitting = true
      this.ticketState.errorMessage = ''

      try {
        await axios.post(`/api/ticket/${this.ticketState.selectedId}`, {
          ticket_id: this.ticketState.selectedId,
          ticket_price: Number(this.ticketState.priceForm.ticket_price),
        })

        await this.fetchTicketList()
        this.closeTicketDialogs()
      } catch (err) {
        console.error('Failed to update ticket price', err)
        this.ticketState.errorMessage = '更新票券價格失敗'
      } finally {
        this.ticketState.isSubmitting = false
      }
    },

    async submitNewTicket() {
      this.ticketState.isSubmitting = true
      this.ticketState.errorMessage = ''

      try {
        await axios.post('/api/ticket', {
          ticket_name: this.ticketState.createForm.ticket_name,
          ticket_price: Number(this.ticketState.createForm.ticket_price),
          is_active: Number(this.ticketState.createForm.is_active),
          note: this.ticketState.createForm.note,
        })

        await this.fetchTicketList()
        this.closeTicketDialogs()
      } catch (err) {
        console.error('Failed to create ticket', err)
        this.ticketState.errorMessage = '新增票券失敗'
      } finally {
        this.ticketState.isSubmitting = false
      }
    },

    async toggleTicketStatus(ticket) {
      this.ticketState.isSubmitting = true
      this.ticketState.errorMessage = ''

      try {
        await axios.post(`/api/ticket/${ticket.ticket_id}/status`, {
          ticket_id: ticket.ticket_id,
          is_active: Number(ticket.is_active) === 0 ? 1 : 0,
        })

        await this.fetchTicketList()
      } catch (err) {
        console.error('Failed to toggle ticket status', err)
        this.ticketState.errorMessage = '更新票券啟用狀態失敗'
      } finally {
        this.ticketState.isSubmitting = false
      }
    },

    openRentalPriceDialog(rental) {
      this.rentalState.selectedId = rental.rental_id
      this.rentalState.priceForm = {
        rental_code: rental.rental_code ?? '',
        rental_name: rental.rental_name ?? '',
        rental_price: Number(rental.rental_price ?? 0),
      }
      this.rentalState.isPriceDialogOpen = true
      this.rentalState.isCreateDialogOpen = false
      this.rentalState.isSettingsDialogOpen = false
    },

    openRentalCreateDialog() {
      this.rentalState.createForm = createEmptyRentalForm()
      this.rentalState.isCreateDialogOpen = true
      this.rentalState.isPriceDialogOpen = false
      this.rentalState.isSettingsDialogOpen = false
      this.rentalState.selectedId = null
    },

    openRentalSettingsDialog() {
      this.rentalState.isSettingsDialogOpen = true
      this.rentalState.isCreateDialogOpen = false
      this.rentalState.isPriceDialogOpen = false
      this.rentalState.selectedId = null
    },

    closeRentalDialogs() {
      this.rentalState.isPriceDialogOpen = false
      this.rentalState.isCreateDialogOpen = false
      this.rentalState.isSettingsDialogOpen = false
      this.rentalState.selectedId = null
    },

    async submitRentalPriceUpdate() {
      if (!this.rentalState.selectedId) {
        return
      }

      this.rentalState.isSubmitting = true
      this.rentalState.errorMessage = ''

      try {
        await axios.post(`/api/rental_equipment/${this.rentalState.selectedId}`, {
          rental_id: this.rentalState.selectedId,
          rental_price: Number(this.rentalState.priceForm.rental_price),
        })

        await this.fetchRentalList()
        this.closeRentalDialogs()
      } catch (err) {
        console.error('Failed to update rental equipment price', err)
        this.rentalState.errorMessage = '更新裝備價格失敗'
      } finally {
        this.rentalState.isSubmitting = false
      }
    },

    async submitNewRental() {
      this.rentalState.isSubmitting = true
      this.rentalState.errorMessage = ''

      try {
        await axios.post('/api/rental_equipment', {
          rental_name: this.rentalState.createForm.rental_name,
          rental_price: Number(this.rentalState.createForm.rental_price),
          is_active: Number(this.rentalState.createForm.is_active),
          note: this.rentalState.createForm.note,
        })

        await this.fetchRentalList()
        this.closeRentalDialogs()
      } catch (err) {
        console.error('Failed to create rental equipment', err)
        this.rentalState.errorMessage = '新增裝備失敗'
      } finally {
        this.rentalState.isSubmitting = false
      }
    },

    async toggleRentalStatus(rental) {
      this.rentalState.isSubmitting = true
      this.rentalState.errorMessage = ''

      try {
        await axios.post(`/api/rental_equipment/${rental.rental_id}/status`, {
          rental_id: rental.rental_id,
          is_active: Number(rental.is_active) === 0 ? 1 : 0,
        })

        await this.fetchRentalList()
      } catch (err) {
        console.error('Failed to toggle rental equipment status', err)
        this.rentalState.errorMessage = '更新裝備啟用狀態失敗'
      } finally {
        this.rentalState.isSubmitting = false
      }
    },

    formatPrice(price) {
      return Number(price ?? 0)
    },
  },
}
</script>

<style scoped>
.ticket-rental-view {
  display: grid;
  gap: 32px;
  margin: 0 auto;
  max-width: 1600px;
  padding: 24px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.management-section {
  background: #fff;
  border: 1px solid #d7dce2;
  border-radius: 20px;
  padding: 24px;
}

.section-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-header h1,
.section-header h2,
.dialog-header h3 {
  margin: 0 0 8px;
}

.section-subtitle {
  color: #5b6572;
  margin: 0;
}

.section-actions {
  display: flex;
  gap: 12px;
}

.section-message {
  margin: 16px 0;
}

.section-message.error {
  color: #b00020;
}

.card-list {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.item-card {
  align-items: flex-start;
  background: #fff;
  border: 1px solid #d7dce2;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 110px;
  padding: 18px;
  text-align: left;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.item-card:hover,
.item-card:focus {
  border-color: #315efb;
  box-shadow: 0 12px 24px rgba(49, 94, 251, 0.15);
  outline: none;
  transform: translateY(-2px);
}

.item-card-top {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  width: 100%;
}

.item-name {
  color: #1d2733;
  font-size: 18px;
  font-weight: 700;
}

.item-price {
  color: #315efb;
  font-size: 24px;
  font-weight: 700;
}

.status-badge {
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
}

.status-badge.active {
  background: #e8f7ee;
  color: #1d7f46;
}

.status-badge.inactive {
  background: #f3f4f6;
  color: #5b6572;
}

.dialog-overlay {
  background: rgba(0, 0, 0, 0.35);
  inset: 0;
  position: fixed;
  z-index: 20;
}

.side-dialog {
  background: #fff;
  border-radius: 18px 0 0 18px;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
  box-sizing: border-box;
  height: 100vh;
  margin-left: auto;
  max-width: 420px;
  overflow-y: auto;
  padding: 24px;
  width: min(420px, 92vw);
}

.dialog-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 20px;
}

.dialog-close-button {
  background: #fff;
  border: 1px solid #b8c0cc;
  border-radius: 6px;
  cursor: pointer;
  height: 32px;
  width: 32px;
}

.form-grid {
  display: grid;
  gap: 14px;
}

.form-grid label {
  color: #334155;
  display: grid;
  font-weight: 600;
  gap: 6px;
}

.form-grid input,
.form-grid select,
.form-grid textarea {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
  padding: 10px 12px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.settings-list {
  display: grid;
  gap: 12px;
}

.settings-item {
  align-items: center;
  border: 1px solid #d7dce2;
  border-radius: 12px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 14px;
}

.settings-copy {
  display: grid;
  gap: 4px;
}

.settings-copy span {
  color: #5b6572;
  font-size: 14px;
}

.primary-button,
.secondary-button,
.status-toggle-button {
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  padding: 10px 16px;
}

.primary-button {
  background: #315efb;
  border: 1px solid #315efb;
  color: #fff;
}

.secondary-button {
  background: #315efb;
  border: 1px solid #315efb;
  color: #fff;
}

.status-toggle-button {
  border: 1px solid transparent;
  min-width: 108px;
}

.status-toggle-button.active {
  background: #fff4e5;
  border-color: #ffd28a;
  color: #a15c00;
}

.status-toggle-button.inactive {
  background: #e8f7ee;
  border-color: #9bd5ae;
  color: #1d7f46;
}

.primary-button:disabled,
.secondary-button:disabled,
.status-toggle-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 640px) {
  .section-header {
    align-items: stretch;
    flex-direction: column;
  }

  .section-actions,
  .form-actions,
  .settings-item {
    flex-direction: column;
  }

  .status-toggle-button {
    width: 100%;
  }
}
</style>
