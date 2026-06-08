<template>
  <div class="management-view">
    <section class="management-section">
      <div class="section-header">
        <div>
          <h1>項目管理</h1>
          <p class="section-subtitle">整合票券、租借裝備與商品的價格、分類與啟用設定。</p>
        </div>

        <div class="section-actions">
          <button type="button" class="secondary-button" @click="openSettingsDialog(activeType)">
            項目設定
          </button>
          <button type="button" class="primary-button" @click="openCreateDialog(activeType)">
            新增項目
          </button>
        </div>
      </div>

      <div class="entry-tabs" role="tablist" aria-label="項目分類">
        <button
          v-for="tab in itemTabs"
          :key="tab.key"
          type="button"
          class="entry-tab"
          :class="{ active: activeType === tab.key }"
          @click="activeType = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <p v-if="activeState.isLoading" class="section-message">
        載入{{ activeConfig.label }}資料中...
      </p>
      <p v-else-if="activeState.errorMessage" class="section-message error">
        {{ activeState.errorMessage }}
      </p>
      <p v-else-if="!activeState.list.length" class="section-message">目前沒有資料。</p>

      <div v-else class="entry-picker-panel">
        <section
          v-for="group in activeGroups"
          :key="`${activeType}-${group.categoryName}`"
          class="category-group"
        >
          <h3 class="category-group-title">{{ group.categoryName }}</h3>
          <div class="item-grid">
            <button
              v-for="item in group.items"
              :key="getItemId(activeType, item)"
              type="button"
              class="item-card"
              :class="{ 'is-product': activeType === 'product' }"
              @click="openPriceDialog(activeType, item)"
            >
              <div class="item-card-top">
                <div class="item-card-copy">
                  <strong class="item-name">{{ getItemName(activeType, item) }}</strong>
                  <span v-if="activeType === 'product'" class="item-meta">
                    庫存 {{ formatStockQty(item.stock_qty) }}
                  </span>
                </div>
                <span
                  class="status-badge"
                  :class="Number(item.is_active) === 0 ? 'inactive' : 'active'"
                >
                  {{ Number(item.is_active) === 0 ? '未啟用' : '啟用中' }}
                </span>
              </div>

              <span class="item-price">${{ formatPrice(getItemPrice(activeType, item)) }}</span>
            </button>
          </div>
        </section>
      </div>
    </section>

    <div v-if="dialogState.mode === 'price'" class="dialog-overlay" @click.self="closeDialog">
      <aside class="side-dialog" aria-label="調整項目價格">
        <div class="dialog-header">
          <h3>調整{{ currentDialogConfig.label }}價格</h3>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉調整項目價格視窗"
            @click="closeDialog"
          >
            X
          </button>
        </div>

        <form class="form-grid" @submit.prevent="submitPriceUpdate">
          <label>
            項目代碼
            <input :value="currentDialogState.priceForm.code" type="text" disabled />
          </label>

          <label>
            項目名稱
            <input :value="currentDialogState.priceForm.name" type="text" disabled />
          </label>

          <label>
            小分類
            <input :value="currentDialogState.priceForm.category_name" type="text" disabled />
          </label>

          <label v-if="dialogState.type === 'product'">
            庫存數量
            <input :value="formatStockQty(currentDialogState.priceForm.stock_qty)" type="number" disabled />
          </label>

          <label>
            價格
            <input
              v-model.number="currentDialogState.priceForm.price"
              type="number"
              min="0"
              required
            />
          </label>

          <div class="form-actions">
            <button type="submit" class="primary-button" :disabled="currentDialogState.isSubmitting">
              {{ currentDialogState.isSubmitting ? '儲存中...' : '儲存價格' }}
            </button>
            <button type="button" class="secondary-button ghost-button" @click="closeDialog">
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>

    <div v-if="dialogState.mode === 'create'" class="dialog-overlay" @click.self="closeDialog">
      <aside class="side-dialog" aria-label="新增項目">
        <div class="dialog-header">
          <h3>新增項目</h3>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉新增項目視窗"
            @click="closeDialog"
          >
            X
          </button>
        </div>

        <form class="form-grid" @submit.prevent="submitCreate">
          <div class="dialog-section">
            <span class="dialog-section-label">大分類</span>
            <div class="dialog-tabs" role="tablist" aria-label="新增項目大分類">
              <button
                v-for="tab in itemTabs"
                :key="`create-${tab.key}`"
                type="button"
                class="dialog-tab"
                :class="{ active: createForm.itemType === tab.key }"
                @click="setCreateType(tab.key)"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <label>
            項目名稱
            <input v-model.trim="createForm.name" type="text" required />
          </label>

          <label>
            小分類
            <select v-model.number="createForm.category_id" required>
              <option :value="null" disabled>請選擇小分類</option>
              <option
                v-for="category in currentCreateCategories"
                :key="category.category_id"
                :value="Number(category.category_id)"
              >
                {{ category.category_name }}
              </option>
            </select>
          </label>

          <label>
            價格
            <input v-model.number="createForm.price" type="number" min="0" required />
          </label>

          <label v-if="createForm.itemType === 'product'">
            庫存數量
            <input v-model.number="createForm.stock_qty" type="number" min="0" required />
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

          <p v-if="currentDialogState.errorMessage" class="section-message error dialog-message">
            {{ currentDialogState.errorMessage }}
          </p>

          <div class="form-actions">
            <button type="submit" class="primary-button" :disabled="currentDialogState.isSubmitting">
              {{ currentDialogState.isSubmitting ? '建立中...' : '建立項目' }}
            </button>
            <button type="button" class="secondary-button ghost-button" @click="closeDialog">
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>

    <div v-if="dialogState.mode === 'settings'" class="dialog-overlay" @click.self="closeDialog">
      <aside class="side-dialog settings-dialog" aria-label="項目設定">
        <div class="dialog-header">
          <h3>項目設定</h3>
          <button
            type="button"
            class="dialog-close-button"
            aria-label="關閉項目設定視窗"
            @click="closeDialog"
          >
            X
          </button>
        </div>

        <div class="settings-toolbar">
          <div class="dialog-section">
            <span class="dialog-section-label">大分類</span>
            <div class="dialog-tabs" role="tablist" aria-label="項目設定大分類">
              <button
                v-for="tab in itemTabs"
                :key="`settings-${tab.key}`"
                type="button"
                class="dialog-tab"
                :class="{ active: dialogState.type === tab.key }"
                @click="dialogState.type = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <p v-if="currentDialogState.errorMessage" class="section-message error dialog-message">
            {{ currentDialogState.errorMessage }}
          </p>
        </div>

        <div class="settings-list">
          <div
            v-for="item in currentDialogState.list"
            :key="getItemId(dialogState.type, item)"
            class="settings-item"
          >
            <div class="settings-copy">
              <strong>{{ getItemName(dialogState.type, item) }}</strong>
              <span>{{ getItemSummary(dialogState.type, item) }}</span>
            </div>

            <button
              type="button"
              class="status-toggle-button"
              :class="Number(item.is_active) === 0 ? 'inactive' : 'active'"
              :disabled="currentDialogState.isSubmitting"
              @click="toggleStatus(dialogState.type, item)"
            >
              {{ Number(item.is_active) === 0 ? '設為啟用' : '設為停用' }}
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const ITEM_CONFIGS = {
  ticket: {
    label: '票券',
    endpoint: '/api/ticket',
    categoryEndpoint: '/api/ticket_category',
    idField: 'ticket_id',
    codeField: 'ticket_code',
    nameField: 'ticket_name',
    priceField: 'ticket_price',
    createNameField: 'ticket_name',
    updateIdField: 'ticket_id',
  },
  rental: {
    label: '租借裝備',
    endpoint: '/api/rental_equipment',
    categoryEndpoint: '/api/rental_equipment_category',
    idField: 'rental_id',
    codeField: 'rental_code',
    nameField: 'rental_name',
    priceField: 'rental_price',
    createNameField: 'rental_name',
    updateIdField: 'rental_id',
  },
  product: {
    label: '商品',
    endpoint: '/api/product',
    categoryEndpoint: '/api/product_category',
    idField: 'product_id',
    codeField: 'product_code',
    nameField: 'product_name',
    priceField: 'product_price',
    createNameField: 'product_name',
    updateIdField: 'product_id',
  },
}

const createEmptyListState = () => ({
  list: [],
  isLoading: false,
  isSubmitting: false,
  errorMessage: '',
  selectedId: null,
  priceForm: {
    code: '',
    name: '',
    category_name: '',
    stock_qty: 0,
    price: 0,
  },
})

const createEmptyCreateForm = (itemType = 'ticket') => ({
  itemType,
  name: '',
  category_id: null,
  price: 0,
  stock_qty: itemType === 'product' ? 0 : null,
  is_active: 1,
  note: '',
})

export default {
  data() {
    return {
      activeType: 'ticket',
      dialogState: {
        mode: '',
        type: 'ticket',
      },
      createForm: createEmptyCreateForm(),
      ticketState: createEmptyListState(),
      rentalState: createEmptyListState(),
      productState: createEmptyListState(),
      ticketCategoryOptions: [],
      rentalCategoryOptions: [],
      productCategoryOptions: [],
    }
  },

  computed: {
    itemTabs() {
      return Object.entries(ITEM_CONFIGS).map(([key, config]) => ({
        key,
        label: config.label,
      }))
    },

    activeConfig() {
      return ITEM_CONFIGS[this.activeType]
    },

    activeState() {
      return this.getState(this.activeType)
    },

    activeGroups() {
      return this.groupItemsByCategory(this.activeState.list)
    },

    currentDialogConfig() {
      return ITEM_CONFIGS[this.dialogState.type]
    },

    currentDialogState() {
      return this.getState(this.dialogState.type)
    },

    currentCreateCategories() {
      return this.getCategoryOptions(this.createForm.itemType)
    },
  },

  mounted() {
    this.fetchAllData()
  },

  methods: {
    async fetchAllData() {
      await Promise.all([
        this.fetchList('ticket'),
        this.fetchList('rental'),
        this.fetchList('product'),
        this.fetchCategories('ticket'),
        this.fetchCategories('rental'),
        this.fetchCategories('product'),
      ])
    },

    getState(type) {
      return this[`${type}State`]
    },

    getCategoryOptions(type) {
      if (type === 'ticket') {
        return this.ticketCategoryOptions
      }

      if (type === 'rental') {
        return this.rentalCategoryOptions
      }

      return this.productCategoryOptions
    },

    async fetchList(type) {
      const state = this.getState(type)
      state.isLoading = true
      state.errorMessage = ''

      try {
        const res = await axios.get(ITEM_CONFIGS[type].endpoint)
        state.list = Array.isArray(res.data) ? res.data : []
      } catch (err) {
        console.error(`Failed to fetch ${type} list`, err)
        state.errorMessage = `${ITEM_CONFIGS[type].label}資料讀取失敗`
      } finally {
        state.isLoading = false
      }
    },

    async fetchCategories(type) {
      try {
        const res = await axios.get(ITEM_CONFIGS[type].categoryEndpoint)
        this.setCategoryOptions(type, Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        console.error(`Failed to fetch ${type} categories`, err)
        this.setCategoryOptions(type, [])
      }
    },

    setCategoryOptions(type, options) {
      if (type === 'ticket') {
        this.ticketCategoryOptions = options
        return
      }

      if (type === 'rental') {
        this.rentalCategoryOptions = options
        return
      }

      this.productCategoryOptions = options
    },

    getItemId(type, item) {
      return item?.[ITEM_CONFIGS[type].idField]
    },

    getItemName(type, item) {
      return item?.[ITEM_CONFIGS[type].nameField] ?? ''
    },

    getItemPrice(type, item) {
      return item?.[ITEM_CONFIGS[type].priceField] ?? 0
    },

    getItemCode(type, item) {
      return item?.[ITEM_CONFIGS[type].codeField] ?? ''
    },

    getItemSummary(type, item) {
      const summary = [
        this.getItemCode(type, item),
        item?.category_name || '未分類',
      ]

      if (type === 'product') {
        summary.push(`庫存 ${this.formatStockQty(item.stock_qty)}`)
      }

      summary.push(`$${this.formatPrice(this.getItemPrice(type, item))}`)

      return summary.join(' | ')
    },

    openPriceDialog(type, item) {
      const state = this.getState(type)
      state.selectedId = this.getItemId(type, item)
      state.errorMessage = ''
      state.priceForm = {
        code: this.getItemCode(type, item),
        name: this.getItemName(type, item),
        category_name: item?.category_name ?? '',
        stock_qty: Number(item?.stock_qty ?? 0),
        price: Number(this.getItemPrice(type, item)),
      }
      this.dialogState = {
        mode: 'price',
        type,
      }
    },

    openCreateDialog(type) {
      const state = this.getState(type)
      state.errorMessage = ''
      state.selectedId = null
      this.createForm = createEmptyCreateForm(type)
      this.dialogState = {
        mode: 'create',
        type,
      }
    },

    openSettingsDialog(type) {
      this.getState(type).errorMessage = ''
      this.dialogState = {
        mode: 'settings',
        type,
      }
    },

    closeDialog() {
      this.dialogState = {
        mode: '',
        type: this.activeType,
      }
    },

    setCreateType(type) {
      this.createForm.itemType = type
      this.createForm.category_id = null
      this.createForm.stock_qty = type === 'product' ? 0 : null
      this.getState(type).errorMessage = ''
      this.dialogState.type = type
    },

    async submitPriceUpdate() {
      const type = this.dialogState.type
      const state = this.getState(type)
      const config = ITEM_CONFIGS[type]

      if (!state.selectedId) {
        return
      }

      state.isSubmitting = true
      state.errorMessage = ''

      try {
        await axios.post(`${config.endpoint}/${state.selectedId}`, {
          [config.updateIdField]: state.selectedId,
          [config.priceField]: Number(state.priceForm.price),
        })

        await this.fetchList(type)
        this.closeDialog()
      } catch (err) {
        console.error(`Failed to update ${type} price`, err)
        state.errorMessage = `更新${config.label}價格失敗`
      } finally {
        state.isSubmitting = false
      }
    },

    async submitCreate() {
      const type = this.createForm.itemType
      const state = this.getState(type)
      const config = ITEM_CONFIGS[type]

      state.isSubmitting = true
      state.errorMessage = ''

      const payload = {
        [config.createNameField]: this.createForm.name,
        category_id: Number(this.createForm.category_id),
        [config.priceField]: Number(this.createForm.price),
        is_active: Number(this.createForm.is_active),
        note: this.createForm.note,
      }

      if (type === 'product') {
        payload.stock_qty = Number(this.createForm.stock_qty)
      }

      try {
        await axios.post(config.endpoint, payload)
        await this.fetchList(type)
        this.activeType = type
        this.closeDialog()
      } catch (err) {
        console.error(`Failed to create ${type}`, err)
        state.errorMessage = `新增${config.label}失敗`
      } finally {
        state.isSubmitting = false
      }
    },

    async toggleStatus(type, item) {
      const state = this.getState(type)
      const config = ITEM_CONFIGS[type]
      const itemId = this.getItemId(type, item)

      state.isSubmitting = true
      state.errorMessage = ''

      try {
        await axios.post(`${config.endpoint}/${itemId}/status`, {
          [config.updateIdField]: itemId,
          is_active: Number(item.is_active) === 0 ? 1 : 0,
        })

        await this.fetchList(type)
      } catch (err) {
        console.error(`Failed to toggle ${type} status`, err)
        state.errorMessage = `更新${config.label}啟用狀態失敗`
      } finally {
        state.isSubmitting = false
      }
    },

    groupItemsByCategory(items) {
      const groupedMap = new Map()

      items.forEach((item) => {
        const categoryName = item?.category_name || '未分類'
        if (!groupedMap.has(categoryName)) {
          groupedMap.set(categoryName, [])
        }

        groupedMap.get(categoryName).push(item)
      })

      return Array.from(groupedMap.entries()).map(([categoryName, groupedItems]) => ({
        categoryName,
        items: groupedItems,
      }))
    },

    formatPrice(price) {
      return Number(price ?? 0)
    },

    formatStockQty(stockQty) {
      return Number(stockQty ?? 0)
    },
  },
}
</script>

<style scoped>
.management-view {
  box-sizing: border-box;
  height: calc(100vh - 48px);
  margin: 0;
  padding: 24px 24px 24px 0;
  width: 100%;
}

.management-section {
  background: #fff;
  border: 1px solid #d7dce2;
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 95%;
  overflow: hidden;
  padding: 28px;
}

.section-header {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.section-header h1,
.dialog-header h3 {
  color: #153126;
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
  margin: 0;
}

.section-message.error {
  color: #b00020;
}

.entry-tabs,
.dialog-tabs {
  display: flex;
  gap: 12px;
}

.entry-tabs {
  border-bottom: 1px solid rgba(34, 66, 49, 0.08);
  margin: 4px 0 0;
  padding-bottom: 14px;
}

.entry-tab,
.dialog-tab,
.primary-button,
.secondary-button,
.status-toggle-button {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.entry-tab,
.dialog-tab {
  background: #edf4ef;
  border-radius: 999px;
  color: #577060;
  font-weight: 800;
  padding: 12px 22px;
  transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.entry-tab.active,
.dialog-tab.active {
  background: #dff0e4;
  box-shadow: inset 0 0 0 1px rgba(47, 122, 83, 0.12);
  color: #1f6f48;
}

.entry-picker-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.category-group {
  display: grid;
  gap: 14px;
}

.category-group + .category-group {
  margin-top: 24px;
}

.category-group-title {
  border-left: 4px solid #2f7a53;
  color: #1d2733;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  padding-left: 12px;
}

.item-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.item-card {
  align-items: flex-start;
  background: #fff;
  border: 1px solid rgba(34, 66, 49, 0.12);
  border-radius: 25px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 128px;
  padding: 20px;
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.item-card:hover,
.item-card:focus {
  border-color: rgba(47, 122, 83, 0.3);
  box-shadow: 0 16px 30px rgba(30, 64, 47, 0.08);
  outline: none;
  transform: translateY(-2px);
}

.item-card-top {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  width: 100%;
}

.item-card-copy {
  display: grid;
  gap: 6px;
}

.item-name {
  color: #153126;
  font-size: 18px;
}

.item-meta {
  color: #5b6572;
  font-size: 14px;
}

.item-price {
  color: #0d6b46;
  font-size: 28px;
  font-weight: 800;
}

.status-badge {
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  white-space: nowrap;
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
  border-radius: 24px 0 0 24px;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
  box-sizing: border-box;
  height: 100vh;
  margin-left: auto;
  max-width: 460px;
  overflow-y: auto;
  padding: 24px;
  width: min(460px, 94vw);
}

.settings-dialog {
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  border-radius: 8px;
  cursor: pointer;
  height: 36px;
  width: 36px;
}

.dialog-section {
  display: grid;
  gap: 10px;
}

.dialog-section-label {
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.settings-toolbar {
  background: #fff;
  display: grid;
  gap: 12px;
  padding-bottom: 12px;
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
  border-radius: 10px;
  font: inherit;
  padding: 10px 12px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.settings-list {
  align-content: start;
  display: grid;
  flex: 1;
  gap: 10px;
  grid-auto-rows: min-content;
  margin-top: 6px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.settings-item {
  align-items: center;
  border: 1px solid #d7dce2;
  border-radius: 16px;
  display: flex;
  gap: 10px;
  height: 76px;
  overflow: hidden;
  justify-content: space-between;
  min-height: 76px;
  padding: 10px 12px;
}

.settings-copy {
  display: grid;
  flex: 1;
  gap: 1px;
  min-width: 0;
}

.settings-copy strong {
  color: #153126;
  line-height: 1.25;
}

.settings-copy span {
  color: #5b6572;
  font-size: 14px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-message {
  margin-top: -4px;
}

.primary-button,
.secondary-button,
.status-toggle-button {
  border-radius: 10px;
  padding: 10px 16px;
}

.primary-button {
  background: #1f6f48;
  color: #fff;
}

.secondary-button {
  background: #edf4ef;
  color: #1f6f48;
}

.ghost-button {
  border: 1px solid rgba(31, 111, 72, 0.2);
}

.status-toggle-button {
  flex: 0 0 108px;
  align-self: center;
  min-height: 40px;
  min-width: 108px;
  padding: 8px 14px;
}

.status-toggle-button.active {
  background: #fff4e5;
  color: #a15c00;
}

.status-toggle-button.inactive {
  background: #e8f7ee;
  color: #1d7f46;
}

.primary-button:disabled,
.secondary-button:disabled,
.status-toggle-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 1400px) {
  .item-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .item-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .management-view {
    height: auto;
    padding: 16px 16px 16px 0;
  }

  .management-section {
    border-radius: 20px;
    height: auto;
    padding: 20px;
  }

  .section-header,
  .settings-item,
  .form-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .entry-tabs,
  .dialog-tabs {
    overflow: auto;
    padding-bottom: 4px;
  }

  .entry-tab,
  .dialog-tab {
    white-space: nowrap;
  }

  .item-grid {
    grid-template-columns: 1fr;
  }
}
</style>
