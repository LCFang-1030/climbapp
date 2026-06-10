<template>
  <div class="activity-view">
    <section class="activity-section">
      <div class="section-header">
        <div>
          <h1>會員活動設定</h1>
          <p class="section-subtitle">依照 activity_categories 結構管理活動內容與啟用狀態。</p>
        </div>

        <div class="section-actions">
          <button type="button" class="secondary-button" @click="fetchActivityData">
            重新整理
          </button>
          <button
            v-if="supportedCategories.length"
            type="button"
            class="primary-button"
            @click="openCreateDialog"
          >
            新增活動
          </button>
        </div>
      </div>

      <div v-if="categoryTabs.length" class="category-tabs" role="tablist" aria-label="活動大分類">
        <button
          v-for="tab in categoryTabs"
          :key="tab.key"
          type="button"
          class="category-tab"
          :class="{ active: selectedCategoryId === tab.key }"
          @click="selectedCategoryId = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <p v-if="isLoading" class="section-message">活動資料載入中...</p>
      <p v-else-if="errorMessage" class="section-message error">{{ errorMessage }}</p>
      <p v-else-if="!selectedCategory" class="section-message">目前沒有可顯示的活動分類。</p>

      <div v-else class="entry-picker-panel">
        <section class="category-group">
          <div class="category-heading">
            <h2 class="category-group-title">{{ selectedCategory.category_name }}</h2>
            <span class="category-count">{{ activeItems.length }} 筆</span>
          </div>

          <p v-if="!activeItems.length" class="section-message">目前沒有活動資料。</p>

          <div v-else class="item-grid">
            <article
              v-for="item in activeItems"
              :key="activityCardKey(item)"
              class="item-card"
              :class="item.type === 'gift' ? 'is-gift' : 'is-promotion'"
            >
              <div class="item-card-top">
                <div class="item-card-heading">
                  <strong class="item-name">{{ item.title }}</strong>
                  <span class="item-time">{{ item.subtitle }}</span>
                </div>
                <span
                  class="status-badge"
                  :class="Number(item.is_active) === 0 ? 'inactive' : 'active'"
                >
                  {{ Number(item.is_active) === 0 ? '停用中' : '啟用中' }}
                </span>
              </div>

              <div class="item-card-body">
                <p class="item-summary">{{ itemDisplaySummary(item) }}</p>
                <div v-if="item.type === 'gift' && item.gift_items?.length" class="gift-chip-list">
                  <span
                    v-for="giftItem in item.gift_items"
                    :key="giftItem.gift_item_id"
                    class="gift-chip"
                  >
                    {{ giftItem.gift_name }}｜剩 {{ formatNumber(giftItem.remaining_qty) }}/{{ formatNumber(giftItem.total_qty) }}
                  </span>
                </div>
              </div>

              <div class="item-actions">
                <button type="button" class="secondary-button ghost-button" @click="openEditDialog(item)">
                  編輯內容
                </button>
                <button
                  type="button"
                  class="status-toggle-button"
                  :class="Number(item.is_active) === 0 ? 'inactive' : 'active'"
                  @click="toggleStatus(item)"
                >
                  {{ Number(item.is_active) === 0 ? '設為啟用' : '設為停用' }}
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </section>

    <div v-if="dialogMode" class="dialog-overlay" @click.self="closeDialog">
      <aside class="side-dialog" :aria-label="dialogMode === 'create' ? '新增會員活動' : '編輯會員活動'">
        <div class="dialog-header">
          <h3>{{ dialogMode === 'create' ? '新增活動' : '編輯活動' }}</h3>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉活動編輯視窗"
            @click="closeDialog"
          >
            X
          </button>
        </div>

        <form class="form-grid" @submit.prevent="submitForm">
          <label>
            活動大分類
            <select v-model.number="form.category_id" @change="handleFormCategoryChange" required>
              <option :value="null" disabled>請選擇活動大分類</option>
              <option
                v-for="category in supportedCategories"
                :key="category.category_id"
                :value="Number(category.category_id)"
              >
                {{ category.category_name }}
              </option>
            </select>
          </label>

          <label>
            活動名稱
            <input v-model.trim="form.name" type="text" maxlength="100" required />
          </label>

          <div class="datetime-grid">
            <label>
              開始時間
              <input v-model="form.start_time" type="datetime-local" />
            </label>

            <label>
              結束時間
              <input v-model="form.end_time" type="datetime-local" />
            </label>
          </div>

          <label>
            啟用狀態
            <select v-model.number="form.is_active">
              <option :value="1">啟用</option>
              <option :value="0">停用</option>
            </select>
          </label>

          <template v-if="form.activityType === 'promotion'">
            <div class="detail-block">
              <p class="detail-block-title">優惠活動內容</p>
              <div class="datetime-grid">
                <label>
                  折扣類型
                  <select v-model="form.discount_type" required>
                    <option value="amount">折抵金額</option>
                    <option value="percent">折扣率</option>
                    <option value="fixed">固定價格</option>
                  </select>
                </label>

                <label>
                  折扣數值
                  <input v-model.number="form.discount_value" type="number" min="0" step="0.01" required />
                </label>
              </div>
            </div>
          </template>

          <template v-else-if="form.activityType === 'gift'">
            <div class="dialog-section">
              <div class="gift-section-header">
                <span class="dialog-section-label">贈品活動內容</span>
                <button type="button" class="secondary-button ghost-button" @click="addGiftItem">
                  新增贈品
                </button>
              </div>

              <div v-if="!form.gift_items.length" class="empty-gift-state">
                尚未加入任何贈品項目。
              </div>

              <div v-else class="gift-form-list">
                <div
                  v-for="(giftItem, index) in form.gift_items"
                  :key="giftItem.local_key"
                  class="gift-form-card"
                >
                  <div class="gift-form-header">
                    <strong>贈品 {{ index + 1 }}</strong>
                    <button type="button" class="text-button" @click="removeGiftItem(index)">
                      移除
                    </button>
                  </div>

                  <label>
                    贈品名稱
                    <input v-model.trim="giftItem.gift_name" type="text" maxlength="100" required />
                  </label>

                  <div class="gift-item-grid">
                    <label>
                      總數量
                      <input v-model.number="giftItem.total_qty" type="number" min="0" required />
                    </label>

                    <label>
                      剩餘數量
                      <input v-model.number="giftItem.remaining_qty" type="number" min="0" required />
                    </label>

                    <label>
                      每會員上限
                      <input v-model.number="giftItem.limit_per_member" type="number" min="0" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <p class="section-message">這個活動大分類目前尚未支援設定內容。</p>
          </template>

          <p v-if="dialogErrorMessage" class="section-message error dialog-message">
            {{ dialogErrorMessage }}
          </p>

          <div class="form-actions">
            <button
              type="submit"
              class="primary-button"
              :disabled="isSubmitting || form.activityType === 'unsupported'"
            >
              {{ isSubmitting ? '儲存中...' : dialogMode === 'create' ? '建立活動' : '儲存修改' }}
            </button>
            <button type="button" class="secondary-button ghost-button" @click="closeDialog">
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const createGiftItem = (giftItem = {}) => ({
  local_key: `gift-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  gift_item_id: giftItem.gift_item_id ?? null,
  gift_name: giftItem.gift_name ?? '',
  total_qty: Number(giftItem.total_qty ?? 0),
  remaining_qty: Number(giftItem.remaining_qty ?? giftItem.total_qty ?? 0),
  limit_per_member: giftItem.limit_per_member == null || giftItem.limit_per_member === ''
    ? null
    : Number(giftItem.limit_per_member),
})

const createEmptyForm = (activityType = 'promotion', categoryId = null) => ({
  activityType,
  id: null,
  category_id: categoryId,
  name: '',
  start_time: '',
  end_time: '',
  is_active: 1,
  discount_type: 'amount',
  discount_value: 0,
  gift_items: activityType === 'gift' ? [createGiftItem()] : [],
})

export default {
  data() {
    return {
      isLoading: false,
      isSubmitting: false,
      errorMessage: '',
      dialogErrorMessage: '',
      selectedCategoryId: null,
      dialogMode: '',
      categories: [],
      form: createEmptyForm(),
    }
  },

  computed: {
    supportedCategories() {
      return this.categories.filter((category) => this.resolveCategoryMode(category) !== 'unsupported')
    },

    categoryTabs() {
      return this.supportedCategories.map((category) => ({
        key: Number(category.category_id),
        label: category.category_name,
      }))
    },

    selectedCategory() {
      return this.supportedCategories.find((category) => Number(category.category_id) === Number(this.selectedCategoryId)) ?? null
    },

    selectedCategoryMode() {
      return this.resolveCategoryMode(this.selectedCategory)
    },

    activeItems() {
      if (!this.selectedCategory) {
        return []
      }

      if (this.selectedCategoryMode === 'promotion') {
        return this.selectedCategory.promotions ?? []
      }

      if (this.selectedCategoryMode === 'gift') {
        return this.selectedCategory.gift_campaigns ?? []
      }

      return []
    },
  },

  mounted() {
    this.fetchActivityData()
  },

  methods: {
    async fetchActivityData() {
      this.isLoading = true
      this.errorMessage = ''

      try {
        const res = await axios.get('/api/activity_management')
        this.categories = Array.isArray(res.data) ? res.data : []

        if (!this.supportedCategories.length) {
          this.selectedCategoryId = null
        } else if (
          !this.selectedCategoryId ||
          !this.supportedCategories.some((category) => Number(category.category_id) === Number(this.selectedCategoryId))
        ) {
          this.selectedCategoryId = Number(this.supportedCategories[0].category_id)
        }
      } catch (err) {
        console.error('取得活動管理資料失敗', err)
        this.errorMessage = err.response?.data?.message ?? '取得活動管理資料失敗。'
        this.categories = []
        this.selectedCategoryId = null
      } finally {
        this.isLoading = false
      }
    },

    resolveCategoryMode(category) {
      if (!category) {
        return 'unsupported'
      }

      if (Array.isArray(category.gift_campaigns) && category.gift_campaigns.length) {
        return 'gift'
      }

      if (Array.isArray(category.promotions) && category.promotions.length) {
        return 'promotion'
      }

      const categoryName = String(category.category_name ?? '')
      if (categoryName.includes('贈品')) {
        return 'gift'
      }
      if (categoryName.includes('優惠')) {
        return 'promotion'
      }

      return 'unsupported'
    },

    activityCardKey(item) {
      return `${item.type}-${item.id}`
    },

    itemDisplaySummary(item) {
      if (item.type === 'gift') {
        return item.summary || '贈品活動'
      }

      return String(item.summary || '').split(' | ')[0]
    },

    formatNumber(value) {
      return Number(value ?? 0)
    },

    toDatetimeLocal(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const offset = date.getTimezoneOffset()
      const localDate = new Date(date.getTime() - offset * 60000)
      return localDate.toISOString().slice(0, 16)
    },

    toNullableDateTime(value) {
      return value ? value.replace('T', ' ') + ':00' : null
    },

    updateFormTypeByCategory(categoryId) {
      const category = this.supportedCategories.find((item) => Number(item.category_id) === Number(categoryId))
      const nextType = this.resolveCategoryMode(category)
      this.form.activityType = nextType

      if (nextType === 'gift') {
        this.form.gift_items = this.form.gift_items.length ? this.form.gift_items : [createGiftItem()]
      } else {
        this.form.gift_items = []
      }
    },

    handleFormCategoryChange() {
      this.updateFormTypeByCategory(this.form.category_id)
    },

    openCreateDialog() {
      const defaultCategoryId = this.selectedCategoryId ?? this.supportedCategories[0]?.category_id ?? null
      const defaultCategory = this.supportedCategories.find((category) => Number(category.category_id) === Number(defaultCategoryId))
      const defaultType = this.resolveCategoryMode(defaultCategory)

      this.dialogMode = 'create'
      this.dialogErrorMessage = ''
      this.form = createEmptyForm(defaultType, defaultCategoryId == null ? null : Number(defaultCategoryId))
      this.updateFormTypeByCategory(this.form.category_id)
    },

    openEditDialog(item) {
      this.dialogMode = 'edit'
      this.dialogErrorMessage = ''
      this.form = {
        activityType: item.type,
        id: item.id,
        category_id: Number(item.category_id),
        name: item.title,
        start_time: this.toDatetimeLocal(item.start_time),
        end_time: this.toDatetimeLocal(item.end_time),
        is_active: Number(item.is_active),
        discount_type: item.discount_type ?? 'amount',
        discount_value: Number(item.discount_value ?? 0),
        gift_items: (item.gift_items ?? []).map((giftItem) => createGiftItem(giftItem)),
      }

      this.updateFormTypeByCategory(this.form.category_id)

      if (item.type === 'gift') {
        this.form.gift_items = (item.gift_items ?? []).map((giftItem) => createGiftItem(giftItem))
        if (!this.form.gift_items.length) {
          this.form.gift_items = [createGiftItem()]
        }
      }
    },

    closeDialog() {
      this.dialogMode = ''
      this.dialogErrorMessage = ''
      this.isSubmitting = false
      this.form = createEmptyForm('promotion', this.selectedCategoryId)
    },

    addGiftItem() {
      this.form.gift_items = [...this.form.gift_items, createGiftItem()]
    },

    removeGiftItem(index) {
      const nextItems = this.form.gift_items.filter((_, itemIndex) => itemIndex !== index)
      this.form.gift_items = nextItems.length ? nextItems : [createGiftItem()]
    },

    buildPayload() {
      const basePayload = {
        category_id: Number(this.form.category_id),
        is_active: Number(this.form.is_active),
        start_time: this.toNullableDateTime(this.form.start_time),
        end_time: this.toNullableDateTime(this.form.end_time),
      }

      if (this.form.activityType === 'promotion') {
        return {
          ...basePayload,
          promotion_name: this.form.name,
          discount_type: this.form.discount_type,
          discount_value: Number(this.form.discount_value ?? 0),
        }
      }

      return {
        ...basePayload,
        campaign_name: this.form.name,
        gift_items: this.form.gift_items.map((giftItem) => ({
          gift_item_id: giftItem.gift_item_id,
          gift_name: giftItem.gift_name,
          total_qty: Number(giftItem.total_qty ?? 0),
          remaining_qty: Number(giftItem.remaining_qty ?? 0),
          limit_per_member: giftItem.limit_per_member == null || giftItem.limit_per_member === ''
            ? null
            : Number(giftItem.limit_per_member),
        })),
      }
    },

    validateForm() {
      if (!this.form.category_id) {
        this.dialogErrorMessage = '請先選擇活動大分類。'
        return false
      }

      if (this.form.activityType === 'unsupported') {
        this.dialogErrorMessage = '這個活動大分類目前尚未支援。'
        return false
      }

      if (!this.form.name.trim()) {
        this.dialogErrorMessage = '請輸入活動名稱。'
        return false
      }

      if (this.form.start_time && this.form.end_time && this.form.start_time > this.form.end_time) {
        this.dialogErrorMessage = '結束時間不能早於開始時間。'
        return false
      }

      if (this.form.activityType === 'promotion') {
        if (!['amount', 'percent', 'fixed'].includes(this.form.discount_type)) {
          this.dialogErrorMessage = '請選擇正確的折扣類型。'
          return false
        }

        if (Number(this.form.discount_value) < 0) {
          this.dialogErrorMessage = '折扣數值不能小於 0。'
          return false
        }
      } else {
        const hasInvalidGiftItem = this.form.gift_items.some((giftItem) => {
          if (!giftItem.gift_name.trim()) return true
          if (Number(giftItem.total_qty) < 0) return true
          if (Number(giftItem.remaining_qty) < 0) return true
          if (Number(giftItem.remaining_qty) > Number(giftItem.total_qty)) return true
          return giftItem.limit_per_member != null && Number(giftItem.limit_per_member) < 0
        })

        if (hasInvalidGiftItem) {
          this.dialogErrorMessage = '請確認贈品名稱、數量與上限設定都正確。'
          return false
        }
      }

      this.dialogErrorMessage = ''
      return true
    },

    async submitForm() {
      if (!this.validateForm()) {
        return
      }

      this.isSubmitting = true
      this.dialogErrorMessage = ''

      const isGift = this.form.activityType === 'gift'
      const endpoint = this.dialogMode === 'create'
        ? isGift ? '/api/gift_campaigns' : '/api/promotions'
        : isGift ? `/api/gift_campaigns/${this.form.id}` : `/api/promotions/${this.form.id}`

      try {
        await axios.post(endpoint, this.buildPayload())
        await this.fetchActivityData()
        this.selectedCategoryId = Number(this.form.category_id)
        this.closeDialog()
      } catch (err) {
        console.error('儲存活動失敗', err)
        this.dialogErrorMessage = err.response?.data?.message ?? '儲存活動失敗。'
      } finally {
        this.isSubmitting = false
      }
    },

    async toggleStatus(item) {
      const endpoint = item.type === 'gift'
        ? `/api/gift_campaigns/${item.id}/status`
        : `/api/promotions/${item.id}/status`

      try {
        await axios.post(endpoint, {
          is_active: Number(item.is_active) === 0 ? 1 : 0,
        })
        await this.fetchActivityData()
      } catch (err) {
        console.error('更新活動狀態失敗', err)
        this.errorMessage = err.response?.data?.message ?? '更新活動狀態失敗。'
      }
    },
  },
}
</script>

<style scoped>
.activity-view {
  --page-bg: linear-gradient(180deg, #fff7fa 0%, #fdf0f4 100%);
  --panel-bg: rgba(255, 255, 255, 0.94);
  --panel-border: rgba(168, 88, 117, 0.16);
  --text-main: #5c2d3e;
  --text-soft: #8f6272;
  --accent: #d87a9a;
  --accent-strong: #bf5d81;
  --accent-soft: #fde7ef;
  --success-bg: #fce7ef;
  --success-text: #ad4d72;
  --danger: #b2395f;
  --shadow: 0 18px 36px rgba(139, 76, 99, 0.08);
  box-sizing: border-box;
  height: calc(100vh - 56px);
  overflow: hidden;
  padding: 12px 18px 12px 0;
  width: 100%;
}

.activity-section {
  background: var(--page-bg);
  border: 1px solid var(--panel-border);
  border-radius: 28px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow: hidden;
  padding: 18px 28px 20px;
}

.section-header {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.section-header h1,
.dialog-header h3 {
  color: var(--text-main);
  margin: 0 0 4px;
}

.section-header h1 {
  font-size: 26px;
  line-height: 1.1;
}

.section-subtitle,
.item-time,
.item-summary,
.empty-gift-state {
  color: var(--text-soft);
}

.section-subtitle,
.section-message,
.item-summary {
  margin: 0;
}

.section-subtitle {
  line-height: 1.45;
}

.section-actions,
.item-actions,
.form-actions,
.gift-section-header {
  display: flex;
  gap: 10px;
}

.category-tabs {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  overflow: auto;
  padding-bottom: 2px;
}

.category-tab,
.primary-button,
.secondary-button,
.status-toggle-button,
.text-button {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.category-tab {
  background: rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  color: var(--text-soft);
  font-weight: 800;
  padding: 11px 22px;
  transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  white-space: nowrap;
}

.category-tab.active {
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px rgba(191, 93, 129, 0.15);
  color: var(--accent-strong);
}

.entry-picker-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.category-group {
  display: grid;
  gap: 12px;
}

.category-heading {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.category-group-title {
  border-left: 4px solid var(--accent);
  color: var(--text-main);
  font-size: 18px;
  font-weight: 800;
  margin: 0;
  padding-left: 12px;
}

.category-count {
  background: rgba(255, 255, 255, 0.74);
  border-radius: 999px;
  color: var(--accent-strong);
  font-size: 13px;
  font-weight: 800;
  padding: 8px 12px;
}

.item-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.item-card {
  background: var(--panel-bg);
  border: 1px solid rgba(168, 88, 117, 0.14);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 170px;
  padding: 18px 20px;
}

.item-card.is-gift {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 245, 249, 0.96) 100%);
}

.item-card-top {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.item-card-heading {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.item-name {
  color: var(--text-main);
  font-size: 18px;
  line-height: 1.25;
}

.item-time {
  font-size: 14px;
  line-height: 1.4;
}

.item-card-body {
  display: grid;
  gap: 12px;
}

.item-summary {
  line-height: 1.5;
}

.gift-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.gift-chip {
  background: var(--accent-soft);
  border-radius: 999px;
  color: var(--accent-strong);
  font-size: 13px;
  font-weight: 700;
  padding: 8px 12px;
}

.status-badge {
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  white-space: nowrap;
}

.status-badge.active {
  background: var(--success-bg);
  color: var(--success-text);
}

.status-badge.inactive {
  background: #f6f0f3;
  color: #8d7480;
}

.dialog-overlay {
  background: rgba(77, 31, 47, 0.22);
  inset: 0;
  position: fixed;
  z-index: 20;
}

.side-dialog {
  background: linear-gradient(180deg, #fffafb 0%, #fff3f7 100%);
  border-radius: 28px 0 0 28px;
  box-shadow: -8px 0 24px rgba(77, 31, 47, 0.16);
  box-sizing: border-box;
  height: 100vh;
  margin-left: auto;
  max-width: 520px;
  overflow-y: auto;
  padding: 24px;
  width: min(520px, 96vw);
}

.dialog-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 18px;
}

.dialog-close-button {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(168, 88, 117, 0.2);
  border-radius: 10px;
  color: var(--text-main);
  cursor: pointer;
  height: 36px;
  width: 36px;
}

.dialog-section,
.detail-block {
  display: grid;
  gap: 10px;
}

.dialog-section-label,
.detail-block-title {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 700;
  margin: 0;
}

.form-grid {
  display: grid;
  gap: 14px;
}

.form-grid label {
  color: var(--text-main);
  display: grid;
  font-weight: 600;
  gap: 6px;
}

.form-grid input,
.form-grid select {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(168, 88, 117, 0.2);
  border-radius: 12px;
  color: var(--text-main);
  font: inherit;
  padding: 11px 12px;
}

.datetime-grid,
.gift-item-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gift-item-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.gift-form-list {
  display: grid;
  gap: 12px;
}

.gift-form-card {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(168, 88, 117, 0.14);
  border-radius: 18px;
  display: grid;
  gap: 12px;
  padding: 14px;
}

.gift-form-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.text-button {
  background: transparent;
  color: var(--danger);
  font-weight: 700;
  padding: 0;
}

.dialog-message {
  margin-top: -4px;
}

.primary-button,
.secondary-button,
.status-toggle-button {
  border-radius: 12px;
  padding: 10px 16px;
}

.primary-button {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #fff;
}

.secondary-button {
  background: rgba(255, 255, 255, 0.82);
  color: var(--accent-strong);
}

.ghost-button {
  border: 1px solid rgba(191, 93, 129, 0.18);
}

.status-toggle-button.active {
  background: rgba(255, 229, 236, 0.95);
  color: #b54d73;
}

.status-toggle-button.inactive {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.section-message.error {
  color: var(--danger);
}

.primary-button:disabled,
.secondary-button:disabled,
.status-toggle-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 1400px) {
  .item-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .activity-view {
    height: auto;
    overflow: auto;
    padding: 16px 16px 16px 0;
  }

  .activity-section {
    height: auto;
    padding: 20px;
  }

  .section-header,
  .section-actions,
  .item-actions,
  .form-actions,
  .gift-section-header,
  .category-heading {
    flex-direction: column;
  }

  .item-grid,
  .datetime-grid,
  .gift-item-grid {
    grid-template-columns: 1fr;
  }
}
</style>
