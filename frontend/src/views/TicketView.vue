<template>
  <div class="ticket-view">
    <div class="ticket-header">
      <div>
        <h1>票種管理</h1>
        <p class="ticket-subtitle">管理票價、新增票種，以及設定票種是否顯示在入場頁。</p>
      </div>

      <div class="ticket-header-actions">
        <button type="button" class="secondary-button" @click="openSettingsDialog">
          票種設定
        </button>
        <button type="button" class="primary-button" @click="openCreateDialog">
          新增票種
        </button>
      </div>
    </div>

    <p v-if="isLoading" class="ticket-message">載入票種中...</p>
    <p v-else-if="errorMessage" class="ticket-message error">{{ errorMessage }}</p>

    <div v-else class="ticket-button-list">
      <button
        v-for="ticket in ticketList"
        :key="ticket.ticket_id"
        type="button"
        class="ticket-button"
        @click="openPriceDialog(ticket)"
      >
        <div class="ticket-button-top">
          <span class="ticket-button-name">{{ ticket.ticket_name }}</span>
          <span
            class="ticket-status-badge"
            :class="Number(ticket.is_active) === 0 ? 'inactive' : 'active'"
          >
            {{ Number(ticket.is_active) === 0 ? '未啟用' : '啟用中' }}
          </span>
        </div>
        <span class="ticket-button-price">${{ formatPrice(ticket.ticket_price) }}</span>
      </button>
    </div>

    <div
      v-if="isPriceDialogOpen"
      class="ticket-dialog-overlay"
      @click.self="closeDialogs"
    >
      <aside class="ticket-dialog" aria-label="修改票價">
        <div class="ticket-dialog-header">
          <h2>修改票價</h2>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉修改票價視窗"
            @click="closeDialogs"
          >
            X
          </button>
        </div>

        <form class="ticket-form" @submit.prevent="submitPriceUpdate">
          <label>
            票種代碼
            <input :value="priceForm.ticket_code" type="text" disabled />
          </label>

          <label>
            票種名稱
            <input :value="priceForm.ticket_name" type="text" disabled />
          </label>

          <label>
            票價
            <input v-model.number="priceForm.ticket_price" type="number" min="0" required />
          </label>

          <div class="ticket-form-actions">
            <button type="submit" class="primary-button" :disabled="isSubmitting">
              {{ isSubmitting ? '儲存中...' : '儲存價格' }}
            </button>
            <button type="button" class="secondary-button" @click="closeDialogs">
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>

    <div
      v-if="isCreateDialogOpen"
      class="ticket-dialog-overlay"
      @click.self="closeDialogs"
    >
      <aside class="ticket-dialog" aria-label="新增票種">
        <div class="ticket-dialog-header">
          <h2>新增票種</h2>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉新增票種視窗"
            @click="closeDialogs"
          >
            X
          </button>
        </div>

        <form class="ticket-form" @submit.prevent="submitNewTicket">
          <label>
            票種名稱
            <input v-model.trim="createForm.ticket_name" type="text" required />
          </label>

          <label>
            票價
            <input v-model.number="createForm.ticket_price" type="number" min="0" required />
          </label>

          <label>
            啟用狀態
            <select v-model.number="createForm.is_active">
              <option :value="1">啟用</option>
              <option :value="0">停用</option>
            </select>
          </label>

          <label>
            備註
            <textarea v-model.trim="createForm.note" rows="3" />
          </label>

          <div class="ticket-form-actions">
            <button type="submit" class="primary-button" :disabled="isSubmitting">
              {{ isSubmitting ? '新增中...' : '新增票種' }}
            </button>
            <button type="button" class="secondary-button" @click="closeDialogs">
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>

    <div
      v-if="isSettingsDialogOpen"
      class="ticket-dialog-overlay"
      @click.self="closeDialogs"
    >
      <aside class="ticket-dialog" aria-label="票種設定">
        <div class="ticket-dialog-header">
          <h2>票種設定</h2>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉票種設定視窗"
            @click="closeDialogs"
          >
            X
          </button>
        </div>

        <div class="settings-list">
          <div
            v-for="ticket in ticketList"
            :key="ticket.ticket_id"
            class="settings-item"
          >
            <div class="settings-copy">
              <strong>{{ ticket.ticket_name }}</strong>
              <span>{{ ticket.ticket_code }} · ${{ formatPrice(ticket.ticket_price) }}</span>
            </div>

            <button
              type="button"
              class="status-toggle-button"
              :class="Number(ticket.is_active) === 0 ? 'inactive' : 'active'"
              :disabled="isSubmitting"
              @click="toggleTicketStatus(ticket)"
            >
              {{ Number(ticket.is_active) === 0 ? '設為啟用' : '設為停用' }}
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

export default {
  data() {
    return {
      ticketList: [],
      isLoading: false,
      isSubmitting: false,
      errorMessage: '',
      isPriceDialogOpen: false,
      isCreateDialogOpen: false,
      isSettingsDialogOpen: false,
      selectedTicketId: null,
      priceForm: {
        ticket_code: '',
        ticket_name: '',
        ticket_price: 0,
      },
      createForm: createEmptyTicketForm(),
    }
  },

  mounted() {
    this.fetchTicketList()
  },

  methods: {
    async fetchTicketList() {
      this.isLoading = true
      this.errorMessage = ''

      try {
        const res = await axios.get('/api/ticket')
        this.ticketList = Array.isArray(res.data) ? res.data : []
      } catch (err) {
        console.error('取得 ticket 失敗', err)
        this.errorMessage = '票種資料讀取失敗'
      } finally {
        this.isLoading = false
      }
    },

    openPriceDialog(ticket) {
      this.selectedTicketId = ticket.ticket_id
      this.priceForm = {
        ticket_code: ticket.ticket_code ?? '',
        ticket_name: ticket.ticket_name ?? '',
        ticket_price: Number(ticket.ticket_price ?? 0),
      }
      this.isPriceDialogOpen = true
      this.isCreateDialogOpen = false
      this.isSettingsDialogOpen = false
    },

    openCreateDialog() {
      this.createForm = createEmptyTicketForm()
      this.isCreateDialogOpen = true
      this.isPriceDialogOpen = false
      this.isSettingsDialogOpen = false
      this.selectedTicketId = null
    },

    openSettingsDialog() {
      this.isSettingsDialogOpen = true
      this.isCreateDialogOpen = false
      this.isPriceDialogOpen = false
      this.selectedTicketId = null
    },

    closeDialogs() {
      this.isPriceDialogOpen = false
      this.isCreateDialogOpen = false
      this.isSettingsDialogOpen = false
      this.selectedTicketId = null
    },

    async submitPriceUpdate() {
      if (!this.selectedTicketId) {
        return
      }

      this.isSubmitting = true

      try {
        await axios.post(`/api/ticket/${this.selectedTicketId}`, {
          ticket_id: this.selectedTicketId,
          ticket_price: Number(this.priceForm.ticket_price),
        })

        await this.fetchTicketList()
        this.closeDialogs()
      } catch (err) {
        console.error('更新 ticket 價格失敗', err)
        this.errorMessage = '更新票價失敗'
      } finally {
        this.isSubmitting = false
      }
    },

    async submitNewTicket() {
      this.isSubmitting = true

      try {
        await axios.post('/api/ticket', {
          ticket_name: this.createForm.ticket_name,
          ticket_price: Number(this.createForm.ticket_price),
          is_active: Number(this.createForm.is_active),
          note: this.createForm.note,
        })

        await this.fetchTicketList()
        this.closeDialogs()
      } catch (err) {
        console.error('新增 ticket 失敗', err)
        this.errorMessage = '新增票種失敗'
      } finally {
        this.isSubmitting = false
      }
    },

    async toggleTicketStatus(ticket) {
      this.isSubmitting = true
      this.errorMessage = ''

      try {
        await axios.post(`/api/ticket/${ticket.ticket_id}/status`, {
          ticket_id: ticket.ticket_id,
          is_active: Number(ticket.is_active) === 0 ? 1 : 0,
        })

        await this.fetchTicketList()
      } catch (err) {
        console.error('更新 ticket 啟用狀態失敗', err)
        this.errorMessage = '更新票種設定失敗'
      } finally {
        this.isSubmitting = false
      }
    },

    formatPrice(price) {
      return Number(price ?? 0)
    },
  },
}
</script>

<style scoped>
.ticket-view {
  margin: 0 auto;
  max-width: 960px;
  padding: 24px;
}

.ticket-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 24px;
}

.ticket-header h1 {
  margin: 0 0 8px;
}

.ticket-header-actions {
  display: flex;
  gap: 12px;
}

.ticket-subtitle {
  color: #5b6572;
  margin: 0;
}

.ticket-message {
  margin: 16px 0;
}

.ticket-message.error {
  color: #b00020;
}

.ticket-button-list {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.ticket-button {
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

.ticket-button:hover,
.ticket-button:focus {
  border-color: #315efb;
  box-shadow: 0 12px 24px rgba(49, 94, 251, 0.15);
  outline: none;
  transform: translateY(-2px);
}

.ticket-button-top {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  width: 100%;
}

.ticket-button-name {
  color: #1d2733;
  font-size: 18px;
  font-weight: 700;
}

.ticket-button-price {
  color: #315efb;
  font-size: 24px;
  font-weight: 700;
}

.ticket-status-badge {
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
}

.ticket-status-badge.active {
  background: #e8f7ee;
  color: #1d7f46;
}

.ticket-status-badge.inactive {
  background: #f3f4f6;
  color: #5b6572;
}

.ticket-dialog-overlay {
  background: rgba(0, 0, 0, 0.35);
  inset: 0;
  position: fixed;
  z-index: 20;
}

.ticket-dialog {
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

.ticket-dialog-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 20px;
}

.ticket-dialog-header h2 {
  margin: 0;
}

.dialog-close-button {
  background: #fff;
  border: 1px solid #b8c0cc;
  border-radius: 6px;
  cursor: pointer;
  height: 32px;
  width: 32px;
}

.ticket-form {
  display: grid;
  gap: 14px;
}

.ticket-form label {
  color: #334155;
  display: grid;
  font-weight: 600;
  gap: 6px;
}

.ticket-form input,
.ticket-form select,
.ticket-form textarea {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
  padding: 10px 12px;
}

.ticket-form-actions {
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
  .ticket-header {
    align-items: stretch;
    flex-direction: column;
  }

  .ticket-header-actions,
  .ticket-form-actions,
  .settings-item {
    flex-direction: column;
  }

  .status-toggle-button {
    width: 100%;
  }
}
</style>
