<template>
  <div class="rental-view">
    <div class="rental-header">
      <div>
        <h1>租借裝備設定</h1>
        <p class="rental-subtitle">管理租借裝備的名稱、價格與啟用狀態。</p>
      </div>

      <div class="rental-header-actions">
        <button type="button" class="secondary-button" @click="openSettingsDialog">
          裝備設定
        </button>
        <button type="button" class="primary-button" @click="openCreateDialog">
          新增裝備
        </button>
      </div>
    </div>

    <p v-if="isLoading" class="rental-message">載入租借裝備中...</p>
    <p v-else-if="errorMessage" class="rental-message error">{{ errorMessage }}</p>

    <div v-else class="rental-button-list">
      <button
        v-for="rental in rentalList"
        :key="rental.rental_id"
        type="button"
        class="rental-button"
        @click="openPriceDialog(rental)"
      >
        <div class="rental-button-top">
          <span class="rental-button-name">{{ rental.rental_name }}</span>
          <span
            class="rental-status-badge"
            :class="Number(rental.is_active) === 0 ? 'inactive' : 'active'"
          >
            {{ Number(rental.is_active) === 0 ? '未啟用' : '啟用中' }}
          </span>
        </div>
        <span class="rental-button-price">${{ formatPrice(rental.rental_price) }}</span>
      </button>
    </div>

    <div
      v-if="isPriceDialogOpen"
      class="rental-dialog-overlay"
      @click.self="closeDialogs"
    >
      <aside class="rental-dialog" aria-label="修改裝備價格">
        <div class="rental-dialog-header">
          <h2>修改裝備價格</h2>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉修改裝備價格視窗"
            @click="closeDialogs"
          >
            X
          </button>
        </div>

        <form class="rental-form" @submit.prevent="submitPriceUpdate">
          <label>
            裝備代碼
            <input :value="priceForm.rental_code" type="text" disabled />
          </label>

          <label>
            裝備名稱
            <input :value="priceForm.rental_name" type="text" disabled />
          </label>

          <label>
            價格
            <input v-model.number="priceForm.rental_price" type="number" min="0" required />
          </label>

          <div class="rental-form-actions">
            <button type="submit" class="primary-button" :disabled="isSubmitting">
              {{ isSubmitting ? '更新中...' : '更新價格' }}
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
      class="rental-dialog-overlay"
      @click.self="closeDialogs"
    >
      <aside class="rental-dialog" aria-label="新增租借裝備">
        <div class="rental-dialog-header">
          <h2>新增租借裝備</h2>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉新增租借裝備視窗"
            @click="closeDialogs"
          >
            X
          </button>
        </div>

        <form class="rental-form" @submit.prevent="submitNewRental">
          <label>
            裝備名稱
            <input v-model.trim="createForm.rental_name" type="text" required />
          </label>

          <label>
            價格
            <input v-model.number="createForm.rental_price" type="number" min="0" required />
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

          <div class="rental-form-actions">
            <button type="submit" class="primary-button" :disabled="isSubmitting">
              {{ isSubmitting ? '新增中...' : '新增裝備' }}
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
      class="rental-dialog-overlay"
      @click.self="closeDialogs"
    >
      <aside class="rental-dialog" aria-label="裝備設定">
        <div class="rental-dialog-header">
          <h2>裝備設定</h2>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉裝備設定視窗"
            @click="closeDialogs"
          >
            X
          </button>
        </div>

        <div class="settings-list">
          <div
            v-for="rental in rentalList"
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
              :disabled="isSubmitting"
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

const createEmptyRentalForm = () => ({
  rental_name: '',
  rental_price: 0,
  is_active: 1,
  note: '',
})

export default {
  data() {
    return {
      rentalList: [],
      isLoading: false,
      isSubmitting: false,
      errorMessage: '',
      isPriceDialogOpen: false,
      isCreateDialogOpen: false,
      isSettingsDialogOpen: false,
      selectedRentalId: null,
      priceForm: {
        rental_code: '',
        rental_name: '',
        rental_price: 0,
      },
      createForm: createEmptyRentalForm(),
    }
  },

  mounted() {
    this.fetchRentalList()
  },

  methods: {
    async fetchRentalList() {
      this.isLoading = true
      this.errorMessage = ''

      try {
        const res = await axios.get('/api/rental_equipment')
        this.rentalList = Array.isArray(res.data) ? res.data : []
      } catch (err) {
        console.error('取得 rental_equipment 失敗', err)
        this.errorMessage = '租借裝備資料載入失敗'
      } finally {
        this.isLoading = false
      }
    },

    openPriceDialog(rental) {
      this.selectedRentalId = rental.rental_id
      this.priceForm = {
        rental_code: rental.rental_code ?? '',
        rental_name: rental.rental_name ?? '',
        rental_price: Number(rental.rental_price ?? 0),
      }
      this.isPriceDialogOpen = true
      this.isCreateDialogOpen = false
      this.isSettingsDialogOpen = false
    },

    openCreateDialog() {
      this.createForm = createEmptyRentalForm()
      this.isCreateDialogOpen = true
      this.isPriceDialogOpen = false
      this.isSettingsDialogOpen = false
      this.selectedRentalId = null
    },

    openSettingsDialog() {
      this.isSettingsDialogOpen = true
      this.isCreateDialogOpen = false
      this.isPriceDialogOpen = false
      this.selectedRentalId = null
    },

    closeDialogs() {
      this.isPriceDialogOpen = false
      this.isCreateDialogOpen = false
      this.isSettingsDialogOpen = false
      this.selectedRentalId = null
    },

    async submitPriceUpdate() {
      if (!this.selectedRentalId) {
        return
      }

      this.isSubmitting = true
      this.errorMessage = ''

      try {
        await axios.post(`/api/rental_equipment/${this.selectedRentalId}`, {
          rental_id: this.selectedRentalId,
          rental_price: Number(this.priceForm.rental_price),
        })

        await this.fetchRentalList()
        this.closeDialogs()
      } catch (err) {
        console.error('更新 rental_equipment 價格失敗', err)
        this.errorMessage = '更新裝備價格失敗'
      } finally {
        this.isSubmitting = false
      }
    },

    async submitNewRental() {
      this.isSubmitting = true
      this.errorMessage = ''

      try {
        await axios.post('/api/rental_equipment', {
          rental_name: this.createForm.rental_name,
          rental_price: Number(this.createForm.rental_price),
          is_active: Number(this.createForm.is_active),
          note: this.createForm.note,
        })

        await this.fetchRentalList()
        this.closeDialogs()
      } catch (err) {
        console.error('新增 rental_equipment 失敗', err)
        this.errorMessage = '新增裝備失敗'
      } finally {
        this.isSubmitting = false
      }
    },

    async toggleRentalStatus(rental) {
      this.isSubmitting = true
      this.errorMessage = ''

      try {
        await axios.post(`/api/rental_equipment/${rental.rental_id}/status`, {
          rental_id: rental.rental_id,
          is_active: Number(rental.is_active) === 0 ? 1 : 0,
        })

        await this.fetchRentalList()
      } catch (err) {
        console.error('更新 rental_equipment 啟用狀態失敗', err)
        this.errorMessage = '更新裝備啟用狀態失敗'
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
.rental-view {
  margin: 0 auto;
  max-width: 960px;
  padding: 24px;
}

.rental-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 24px;
}

.rental-header h1 {
  margin: 0 0 8px;
}

.rental-header-actions {
  display: flex;
  gap: 12px;
}

.rental-subtitle {
  color: #5b6572;
  margin: 0;
}

.rental-message {
  margin: 16px 0;
}

.rental-message.error {
  color: #b00020;
}

.rental-button-list {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.rental-button {
  align-items: flex-start;
  background: #fff;
  border: 1px solid #d7dce2;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 110px;
  padding: 18px;
  text-align: left;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.rental-button:hover,
.rental-button:focus {
  border-color: #315efb;
  box-shadow: 0 12px 24px rgba(49, 94, 251, 0.15);
  outline: none;
  transform: translateY(-2px);
}

.rental-button-top {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  width: 100%;
}

.rental-button-name {
  color: #1d2733;
  font-size: 18px;
  font-weight: 700;
}

.rental-button-price {
  color: #315efb;
  font-size: 24px;
  font-weight: 700;
}

.rental-status-badge,
.status-toggle-button {
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  padding: 6px 10px;
}

.rental-status-badge.active,
.status-toggle-button.active {
  background: #e8f7ee;
  color: #1f7a43;
}

.rental-status-badge.inactive,
.status-toggle-button.inactive {
  background: #fbe9e9;
  color: #b42318;
}

.rental-dialog-overlay {
  background: rgba(0, 0, 0, 0.35);
  inset: 0;
  position: fixed;
  z-index: 20;
}

.rental-dialog {
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

.rental-dialog-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 20px;
}

.rental-dialog-header h2 {
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

.rental-form {
  display: grid;
  gap: 14px;
}

.rental-form label {
  color: #334155;
  display: grid;
  font-weight: 600;
  gap: 6px;
}

.rental-form input,
.rental-form select,
.rental-form textarea {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
  padding: 10px 12px;
}

.rental-form-actions {
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

.status-toggle-button {
  background: transparent;
  border: 0;
  cursor: pointer;
}

.status-toggle-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.primary-button,
.secondary-button {
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

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.secondary-button {
  background: #315efb;
  border: 1px solid #315efb;
  color: #fff;
}

@media (max-width: 640px) {
  .rental-header {
    align-items: stretch;
    flex-direction: column;
  }

  .rental-header-actions,
  .rental-form-actions,
  .settings-item {
    flex-direction: column;
  }

  .status-toggle-button {
    width: 100%;
  }
}
</style>
