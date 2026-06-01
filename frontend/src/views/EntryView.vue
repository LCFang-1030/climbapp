<template>
  <div class="entry-page">
    <section class="entry-hero">
      <div>
        <p class="entry-eyebrow">Check In</p>
        <h1>入場結帳</h1>
        <p class="entry-description">
          搜尋會員後，選擇票券、租借裝備與商品，直接完成本次入場結帳。
        </p>
      </div>
      <div class="entry-clock-card">
        <span class="entry-clock-label">目前時間</span>
        <strong>{{ datetime }}</strong>
      </div>
    </section>

    <section class="entry-main-card">
      <form class="member-search" @submit.prevent="searchMember">
        <div class="member-search-field">
          <label for="entry-phone">手機 / 會員編號 / 姓名</label>
          <input
            id="entry-phone"
            name="phone"
            type="text"
            v-model.trim="phone"
            placeholder="輸入電話、會員編號或姓名"
          />

          <div v-if="memberSuggestions.length" class="member-suggestions">
            <button
              v-for="member in memberSuggestions"
              :key="memberKey(member)"
              type="button"
              class="member-suggestion"
              @click="selectSuggestedMember(member)"
            >
              {{ suggestionText(member) }}
            </button>
          </div>
        </div>

        <button type="submit" class="primary-button">
          {{ isSearching ? '搜尋中...' : '搜尋會員' }}
        </button>
      </form>

      <p v-if="searchMessage" class="entry-message is-error">{{ searchMessage }}</p>

      <div class="entry-tabs" role="tablist" aria-label="入場選項分類">
        <button
          v-for="tab in pickerTabs"
          :key="tab.key"
          type="button"
          class="entry-tab"
          :class="{ active: activePicker === tab.key }"
          @click="activePicker = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <section class="entry-picker-panel">
        <div v-if="activePicker === 'ticket'" class="entry-button-list">
          <div
            v-for="ticket in ticketOptions"
            :key="ticket.ticket_code"
            class="entry-select-button"
            :class="{ selected: getItemQuantity(ticketQuantities, ticket.ticket_code) > 0 }"
          >
            <span
              v-if="getItemQuantity(ticketQuantities, ticket.ticket_code) > 0"
              class="entry-select-check"
            >
              ✓
            </span>
            <div class="entry-select-top">
              <span class="entry-select-name">{{ ticket.ticket_name }}</span>
            </div>
            <span class="entry-select-price">${{ formatPrice(ticket.ticket_price) }}</span>
            <div class="quantity-controls">
              <button
                v-if="getItemQuantity(ticketQuantities, ticket.ticket_code) > 0"
                type="button"
                class="quantity-button"
                @click="changeItemQuantity('ticket', ticket.ticket_code, -1)"
              >
                -
              </button>
              <span
                v-if="getItemQuantity(ticketQuantities, ticket.ticket_code) > 0"
                class="quantity-value"
              >
                {{ getItemQuantity(ticketQuantities, ticket.ticket_code) }}
              </span>
              <button
                type="button"
                class="quantity-button"
                @click="changeItemQuantity('ticket', ticket.ticket_code, 1)"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="activePicker === 'rental'" class="entry-button-list">
          <div
            v-for="item in equipmentOptions"
            :key="item.rental_code"
            class="entry-select-button compact"
            :class="{ selected: getItemQuantity(equipmentQuantities, item.rental_code) > 0 }"
          >
            <span
              v-if="getItemQuantity(equipmentQuantities, item.rental_code) > 0"
              class="entry-select-check"
            >
              ✓
            </span>
            <div class="entry-select-top">
              <span class="entry-select-name">{{ item.rental_name }}</span>
            </div>
            <span class="entry-select-price">${{ formatPrice(item.rental_price) }}</span>
            <div class="quantity-controls">
              <button
                v-if="getItemQuantity(equipmentQuantities, item.rental_code) > 0"
                type="button"
                class="quantity-button"
                @click="changeItemQuantity('rental', item.rental_code, -1)"
              >
                -
              </button>
              <span
                v-if="getItemQuantity(equipmentQuantities, item.rental_code) > 0"
                class="quantity-value"
              >
                {{ getItemQuantity(equipmentQuantities, item.rental_code) }}
              </span>
              <button
                type="button"
                class="quantity-button"
                @click="changeItemQuantity('rental', item.rental_code, 1)"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div v-else class="entry-button-list">
          <div
            v-for="product in productOptions"
            :key="product.product_code"
            class="entry-select-button compact"
            :class="{ selected: getItemQuantity(productQuantities, product.product_code) > 0 }"
          >
            <span
              v-if="getItemQuantity(productQuantities, product.product_code) > 0"
              class="entry-select-check"
            >
              ✓
            </span>
            <div class="entry-select-top">
              <span class="entry-select-name">{{ product.product_name }}</span>
            </div>
            <span class="entry-select-price">${{ formatPrice(product.product_price) }}</span>
            <div class="quantity-controls">
              <button
                v-if="getItemQuantity(productQuantities, product.product_code) > 0"
                type="button"
                class="quantity-button"
                @click="changeItemQuantity('product', product.product_code, -1)"
              >
                -
              </button>
              <span
                v-if="getItemQuantity(productQuantities, product.product_code) > 0"
                class="quantity-value"
              >
                {{ getItemQuantity(productQuantities, product.product_code) }}
              </span>
              <button
                type="button"
                class="quantity-button"
                @click="changeItemQuantity('product', product.product_code, 1)"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="checkout-panel">
        <div class="checkout-member-card">
          <p class="summary-label">會員資料</p>
          <div v-if="selectedMember" class="member-info">
            <div class="member-info-row">
              <span>會員編號</span>
              <strong>{{ member_code || '-' }}</strong>
            </div>
            <div class="member-info-meta">
              {{ selectedMember.name || '-' }} | {{ selectedMember.phone || '-' }} | {{ memberPassSummary }}
            </div>
          </div>
          <p v-else class="empty-state">搜尋並選擇會員後，資料會顯示在這裡。</p>
        </div>

        <div class="checkout-selection-card">
          <p class="summary-label">已選內容</p>
          <div v-if="selectedSummaryChips.length" class="selection-chip-list">
            <span
              v-for="chip in selectedSummaryChips"
              :key="chip.key"
              class="selection-chip"
              :class="`is-${chip.type}`"
            >
              {{ chip.label }}
            </span>
          </div>
          <p v-else class="empty-state">尚未選擇票券、租借裝備或商品。</p>
        </div>

        <div class="checkout-total-card">
          <p class="summary-label">結帳應付金額</p>
          <strong class="total-amount">${{ formatPrice(price_total) }}</strong>
          <button
            type="button"
            class="submit-button"
            :disabled="isSubmittingVisit"
            @click="submitVisit"
          >
            {{ isSubmittingVisit ? '建立入場中...' : '送出入場' }}
          </button>
          <p v-if="visitMessage" class="entry-message" :class="visitMessageClass">
            {{ visitMessage }}
          </p>
        </div>
      </section>
    </section>
  </div>
</template>

<script>
import axios from 'axios'

const QUANTITY_MAP_KEYS = {
  ticket: 'ticketQuantities',
  rental: 'equipmentQuantities',
  product: 'productQuantities',
}

export default {
  mounted() {
    this.updateCurrentDateTime()
    this.clockTimer = window.setInterval(this.updateCurrentDateTime, 1000)
    this.fetchMembers()
    this.fetchTickets()
    this.fetchRentalEquipment()
    this.fetchProducts()
  },

  beforeUnmount() {
    if (this.clockTimer) {
      window.clearInterval(this.clockTimer)
    }
  },

  data() {
    return {
      datetime: '',
      clockTimer: null,
      member_code: '',
      phone: '',
      selectedMember: null,
      members: [],
      isSearching: false,
      searchMessage: '',
      ticketQuantities: {},
      equipmentQuantities: {},
      productQuantities: {},
      equipmentOptions: [],
      productOptions: [],
      ticketOptions: [],
      activePicker: 'ticket',
      isSubmittingVisit: false,
      visitMessage: '',
      visitMessageType: '',
      isClearingSearchAfterSelect: false,
      pickerTabs: [
        { key: 'ticket', label: '票券' },
        { key: 'rental', label: '租借裝備' },
        { key: 'product', label: '商品' },
      ],
    }
  },

  methods: {
    updateCurrentDateTime() {
      this.datetime = new Date().toLocaleString('zh-TW', { hour12: false })
    },

    async fetchMembers() {
      if (this.members.length) {
        return
      }

      const res = await axios.get('/api/members')
      this.members = Array.isArray(res.data) ? res.data : []
    },

    async fetchTickets() {
      try {
        const res = await axios.get('/api/ticket?activeOnly=1')
        this.ticketOptions = Array.isArray(res.data)
          ? res.data.filter((ticket) => Number(ticket.is_active) !== 0)
          : []
      } catch (err) {
        console.error('載入票券失敗', err)
      }
    },

    async fetchRentalEquipment() {
      try {
        const res = await axios.get('/api/rental_equipment?activeOnly=1')
        this.equipmentOptions = Array.isArray(res.data)
          ? res.data.filter((item) => Number(item.is_active) !== 0)
          : []
      } catch (err) {
        console.error('載入租借裝備失敗', err)
      }
    },

    async fetchProducts() {
      try {
        const res = await axios.get('/api/product')
        this.productOptions = Array.isArray(res.data)
          ? res.data.filter((item) => Number(item.is_active) !== 0)
          : []
      } catch (err) {
        console.error('載入商品失敗', err)
      }
    },

    getItemQuantity(quantityMap, code) {
      return Number(quantityMap?.[code] ?? 0)
    },

    setItemQuantity(type, code, quantity) {
      const mapKey = QUANTITY_MAP_KEYS[type]

      if (!mapKey || !code) {
        return
      }

      const nextMap = { ...this[mapKey] }

      if (quantity <= 0) {
        delete nextMap[code]
      } else {
        nextMap[code] = quantity
      }

      this[mapKey] = nextMap
    },

    changeItemQuantity(type, code, delta) {
      const mapKey = QUANTITY_MAP_KEYS[type]
      const currentQuantity = this.getItemQuantity(this[mapKey], code)
      this.setItemQuantity(type, code, currentQuantity + delta)
    },

    normalizePhone(value) {
      return String(value ?? '').replace(/\D/g, '')
    },

    memberKey(member) {
      return member.id ?? member.mid ?? member.member_id ?? member.member_code ?? JSON.stringify(member)
    },

    suggestionText(member) {
      return `${member.phone ?? ''} | ${member.name ?? ''} | ${member.member_code ?? ''}`
    },

    async searchMember() {
      if (!this.phone) {
        this.clearMember()
        this.searchMessage = '請先輸入電話、會員編號或姓名再搜尋'
        return
      }

      this.isSearching = true
      this.searchMessage = ''

      try {
        await this.fetchMembers()

        const matches = this.findMatchingMembers(this.phone)
        const exactMember = matches.find((match) => match.score === 0)?.member ?? null
        const member = exactMember ?? (matches.length === 1 ? matches[0].member : null)

        if (!member) {
          this.clearMember()
          this.searchMessage = matches.length > 1
            ? `找到 ${matches.length} 筆相近會員，請從下方建議名單中點選正確會員`
            : '查無符合條件的會員資料'
          return
        }

        this.setSelectedMember(member)
      } catch (err) {
        console.error('搜尋會員失敗', err)
        this.clearMember()
        this.searchMessage = '搜尋會員失敗'
      } finally {
        this.isSearching = false
      }
    },

    findMatchingMembers(keyword) {
      const query = String(keyword ?? '').trim().toLowerCase()
      const normalizedPhone = this.normalizePhone(query)

      if (!query) {
        return []
      }

      return this.members
        .map((member) => ({
          member,
          score: this.memberSearchScore(member, query, normalizedPhone),
        }))
        .filter((result) => result.score >= 0)
        .sort((a, b) => a.score - b.score)
    },

    memberSearchScore(member, query, normalizedPhone) {
      const memberPhone = this.normalizePhone(member.phone)
      const memberPhoneWithoutLeadingZero = memberPhone.replace(/^0+/, '')
      const queryWithoutLeadingZero = normalizedPhone.replace(/^0+/, '')
      const memberCode = String(member.member_code ?? '').toLowerCase()
      const memberName = String(member.name ?? '').toLowerCase()
      const canUsePartialMatch = query.length >= 2 || normalizedPhone.length >= 2

      if (
        String(member.phone ?? '').trim() === query
        || memberPhone === normalizedPhone
        || memberPhone === queryWithoutLeadingZero
        || memberPhoneWithoutLeadingZero === normalizedPhone
        || memberPhoneWithoutLeadingZero === queryWithoutLeadingZero
        || memberCode === query
        || memberName === query
      ) {
        return 0
      }

      if (!canUsePartialMatch) {
        return -1
      }

      if (
        (normalizedPhone && memberPhone.startsWith(normalizedPhone))
        || (queryWithoutLeadingZero && memberPhoneWithoutLeadingZero.startsWith(queryWithoutLeadingZero))
        || memberCode.startsWith(query)
        || memberName.startsWith(query)
      ) {
        return 1
      }

      if (
        (normalizedPhone && memberPhone.includes(normalizedPhone))
        || (queryWithoutLeadingZero && memberPhoneWithoutLeadingZero.includes(queryWithoutLeadingZero))
        || memberCode.includes(query)
        || memberName.includes(query)
      ) {
        return 2
      }

      return -1
    },

    selectSuggestedMember(member) {
      this.setSelectedMember(member)
      this.searchMessage = ''
    },

    setSelectedMember(member) {
      this.selectedMember = member
      this.member_code = member.member_code ?? ''
      this.isClearingSearchAfterSelect = true
      this.phone = ''
      this.visitMessage = ''
      this.visitMessageType = ''
    },

    clearMember() {
      this.selectedMember = null
      this.member_code = ''
    },

    passText(passType) {
      const passLabels = {
        0: '單次票',
        1: '月票',
        2: '季票',
        3: '半年票',
        4: '年票',
        single: '單次票',
        monthly: '月票',
        quarterly: '季票',
        half_year: '半年票',
        yearly: '年票',
      }

      return passLabels[passType] ?? passType ?? '單次票'
    },

    formatDate(value) {
      if (!value) {
        return ''
      }

      const date = new Date(value)

      if (Number.isNaN(date.getTime())) {
        return value
      }

      return date.toLocaleDateString('zh-TW')
    },

    formatPrice(value) {
      return Number(value ?? 0).toLocaleString('zh-TW')
    },

    buildExpandedCodes(items, codeKey) {
      return items.flatMap((item) => Array.from({ length: item.quantity }, () => item[codeKey]))
    },

    async submitVisit() {
      if (!this.selectedMember?.member_id) {
        this.visitMessage = '請先選擇會員'
        this.visitMessageType = 'error'
        return
      }

      if (!this.selectedTicketItems.length) {
        this.visitMessage = '請先選擇票券'
        this.visitMessageType = 'error'
        return
      }

      this.isSubmittingVisit = true
      this.visitMessage = ''
      this.visitMessageType = ''

      try {
        await axios.post('/api/member_visits', {
          member_id: this.selectedMember.member_id,
          ticket_code: this.selectedTicketItems[0]?.ticket_code ?? '',
          ticket_items: this.selectedTicketItems.map((item) => ({
            ticket_code: item.ticket_code,
            quantity: item.quantity,
          })),
          rental_codes: this.buildExpandedCodes(this.selectedEquipmentItems, 'rental_code'),
          rental_items: this.selectedEquipmentItems.map((item) => ({
            rental_code: item.rental_code,
            quantity: item.quantity,
          })),
          product_codes: this.buildExpandedCodes(this.selectedProductItems, 'product_code'),
          product_items: this.selectedProductItems.map((item) => ({
            product_code: item.product_code,
            quantity: item.quantity,
          })),
        })

        this.visitMessage = '入場資料已建立'
        this.visitMessageType = 'success'
        this.ticketQuantities = {}
        this.equipmentQuantities = {}
        this.productQuantities = {}
      } catch (err) {
        console.error('建立入場失敗', err)
        this.visitMessage = err.response?.data?.message ?? '建立入場失敗'
        this.visitMessageType = 'error'
      } finally {
        this.isSubmittingVisit = false
      }
    },
  },

  computed: {
    memberSuggestions() {
      if (this.selectedMember && this.phone === this.selectedMember.phone) {
        return []
      }

      return this.findMatchingMembers(this.phone)
        .slice(0, 5)
        .map((result) => result.member)
    },

    hasLongTermPass() {
      const passType = this.selectedMember?.pass_type
      return Boolean(passType && passType !== 'single' && Number(passType) !== 0)
    },

    memberPassSummary() {
      if (!this.selectedMember) {
        return '-'
      }

      if (!this.hasLongTermPass) {
        return '單次票'
      }

      const label = this.passText(this.selectedMember.pass_type)
      const expiresAt = this.selectedMember.active_pass_expires_at
        ? this.formatDate(this.selectedMember.active_pass_expires_at)
        : ''

      return expiresAt ? `${label}｜到期 ${expiresAt}` : label
    },

    selectedTicketItems() {
      return this.ticketOptions
        .filter((ticket) => this.getItemQuantity(this.ticketQuantities, ticket.ticket_code) > 0)
        .map((ticket) => ({
          ...ticket,
          quantity: this.getItemQuantity(this.ticketQuantities, ticket.ticket_code),
        }))
    },

    selectedEquipmentItems() {
      return this.equipmentOptions
        .filter((item) => this.getItemQuantity(this.equipmentQuantities, item.rental_code) > 0)
        .map((item) => ({
          ...item,
          quantity: this.getItemQuantity(this.equipmentQuantities, item.rental_code),
        }))
    },

    selectedProductItems() {
      return this.productOptions
        .filter((item) => this.getItemQuantity(this.productQuantities, item.product_code) > 0)
        .map((item) => ({
          ...item,
          quantity: this.getItemQuantity(this.productQuantities, item.product_code),
        }))
    },

    selectedSummaryChips() {
      const chips = []

      this.selectedTicketItems.forEach((item) => {
        chips.push({
          key: `ticket-${item.ticket_code}`,
          label: `${item.ticket_name} x${item.quantity}`,
          type: 'ticket',
        })
      })

      this.selectedEquipmentItems.forEach((item) => {
        chips.push({
          key: `rental-${item.rental_code}`,
          label: `${item.rental_name} x${item.quantity}`,
          type: 'rental',
        })
      })

      this.selectedProductItems.forEach((item) => {
        chips.push({
          key: `product-${item.product_code}`,
          label: `${item.product_name} x${item.quantity}`,
          type: 'product',
        })
      })

      return chips
    },

    visitMessageClass() {
      return this.visitMessageType === 'error' ? 'is-error' : 'is-success'
    },

    price_total() {
      const ticketTotal = this.selectedTicketItems.reduce(
        (total, item) => total + Number(item.ticket_price ?? 0) * Number(item.quantity ?? 0),
        0
      )
      const equipmentTotal = this.selectedEquipmentItems.reduce(
        (total, item) => total + Number(item.rental_price ?? 0) * Number(item.quantity ?? 0),
        0
      )
      const productTotal = this.selectedProductItems.reduce(
        (total, item) => total + Number(item.product_price ?? 0) * Number(item.quantity ?? 0),
        0
      )

      return ticketTotal + equipmentTotal + productTotal
    },
  },

  watch: {
    phone() {
      if (this.isClearingSearchAfterSelect) {
        this.isClearingSearchAfterSelect = false
        this.searchMessage = ''
        return
      }

      this.searchMessage = ''
    },
  },
}
</script>

<style scoped>
.entry-page {
  --entry-bg: linear-gradient(180deg, #f3f8f4 0%, #e7f1ea 100%);
  --panel-bg: rgba(255, 255, 255, 0.92);
  --panel-border: rgba(41, 88, 61, 0.14);
  --text-main: #193225;
  --text-soft: #607568;
  --accent: #2f7a53;
  --accent-strong: #205d3d;
  --danger: #b23a31;
  --success: #176a3c;
  --shadow-soft: 0 18px 40px rgba(25, 50, 37, 0.12);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  max-width: 1320px;
  height: 100vh;
  padding: 32px 24px 40px;
  box-sizing: border-box;
  overflow: hidden;
  color: var(--text-main);
  background: var(--entry-bg);
}

.entry-hero {
  flex-shrink: 0;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.entry-eyebrow,
.summary-label {
  margin: 0 0 8px;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.entry-hero h1 {
  margin: 0;
}

.entry-description {
  max-width: 640px;
  margin: 12px 0 0;
  color: var(--text-soft);
  line-height: 1.7;
}

.entry-clock-card,
.entry-main-card {
  border: 1px solid var(--panel-border);
  border-radius: 24px;
  background: var(--panel-bg);
  box-shadow: var(--shadow-soft);
}

.entry-clock-card {
  min-width: 220px;
  padding: 18px 20px;
}

.entry-clock-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-soft);
  font-size: 13px;
}

.entry-main-card {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 24px;
  backdrop-filter: blur(6px);
  overflow: hidden;
}

.member-search {
  display: flex;
  align-items: end;
  gap: 12px;
  margin-bottom: 18px;
}

.member-search-field {
  position: relative;
  flex: 1;
}

.member-search-field label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
}

.member-search-field input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(41, 88, 61, 0.18);
  border-radius: 20px;
  background: #fff;
  color: var(--text-main);
  font: inherit;
  padding: 16px 18px;
}

.member-search-field input:focus {
  outline: 2px solid rgba(47, 122, 83, 0.18);
  border-color: var(--accent);
}

.primary-button,
.submit-button,
.entry-tab,
.quantity-button {
  border: 0;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.primary-button,
.submit-button {
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #fff;
  box-shadow: 0 14px 28px rgba(32, 93, 61, 0.2);
  padding: 15px 24px;
}

.primary-button:hover,
.submit-button:hover,
.entry-tab:hover,
.quantity-button:hover {
  transform: translateY(-1px);
}

.primary-button:disabled,
.submit-button:disabled {
  opacity: 0.55;
  cursor: wait;
  transform: none;
}

.member-suggestions {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 10;
  overflow: hidden;
  border: 1px solid rgba(41, 88, 61, 0.12);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 36px rgba(25, 50, 37, 0.14);
}

.member-suggestion {
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
  padding: 12px 14px;
  text-align: left;
}

.member-suggestion:hover,
.member-suggestion:focus {
  background: #edf6f0;
}

.entry-message {
  margin: 14px 0 0;
  line-height: 1.6;
}

.entry-message.is-error {
  color: var(--danger);
}

.entry-message.is-success {
  color: var(--success);
}

.entry-tabs {
  display: flex;
  gap: 12px;
  margin: 8px 0 24px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(41, 88, 61, 0.14);
}

.entry-tab {
  border-radius: 16px;
  background: transparent;
  color: var(--text-soft);
  padding: 10px 18px;
}

.entry-tab.active {
  background: rgba(47, 122, 83, 0.12);
  color: var(--accent-strong);
  box-shadow: inset 0 0 0 1px rgba(47, 122, 83, 0.16);
}

.entry-picker-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  width: min(75%, 720px);
  max-width: 100%;
  padding-bottom: 260px;
  padding-right: 8px;
  margin-bottom: 28px;
}

.entry-button-list {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, 180px);
  justify-content: start;
}

.entry-select-button {
  position: relative;
  width: 180px;
  min-height: 88px;
  height: 88px;
  border: 1px solid rgba(41, 88, 61, 0.14);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 247, 242, 0.96) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 6px;
  padding: 16px 16px 14px;
  text-align: left;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  box-sizing: border-box;
  overflow: hidden;
}

.entry-select-button:hover {
  border-color: rgba(47, 122, 83, 0.34);
  box-shadow: 0 14px 30px rgba(25, 50, 37, 0.1);
  transform: translateY(-1px);
}

.entry-select-button.selected {
  border-color: var(--accent);
  box-shadow: 0 16px 34px rgba(32, 93, 61, 0.16);
}

.entry-select-button.compact {
  min-height: 88px;
  height: 88px;
}

.entry-select-top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 8px;
}

.entry-select-name {
  font-size: 16px;
  font-weight: 700;
  padding-right: 24px;
  word-break: break-word;
}

.entry-select-price {
  color: var(--text-soft);
  font-size: 14px;
  padding-right: 76px;
}

.entry-select-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.quantity-controls {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-height: 28px;
}

.quantity-button {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: rgba(47, 122, 83, 0.12);
  color: var(--accent-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.quantity-value {
  min-width: 18px;
  text-align: center;
  font-weight: 700;
}

.checkout-panel {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 24px;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(260px, 0.7fr);
  overflow: hidden;
  border: 1px solid rgba(41, 88, 61, 0.16);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 18px 40px rgba(25, 50, 37, 0.16);
  backdrop-filter: blur(10px);
}

.checkout-member-card,
.checkout-selection-card,
.checkout-total-card {
  height: 140px;
  padding: 18px 20px;
}

.checkout-selection-card,
.checkout-total-card {
  border-left: 1px solid rgba(41, 88, 61, 0.12);
}

.checkout-member-card,
.checkout-selection-card {
  overflow-y: auto;
}

.member-info {
  display: grid;
  gap: 8px;
}

.member-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(41, 88, 61, 0.1);
  padding-bottom: 8px;
}

.member-info-row span {
  color: var(--text-soft);
}

.member-info-row strong {
  text-align: right;
}

.member-info-meta {
  color: var(--text-main);
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
}

.selection-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.selection-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
  padding: 10px 16px;
}

.selection-chip.is-ticket {
  background: rgba(63, 120, 224, 0.16);
  border-color: rgba(63, 120, 224, 0.2);
  color: #2b5da8;
}

.selection-chip.is-rental {
  background: rgba(47, 122, 83, 0.14);
  border-color: rgba(47, 122, 83, 0.18);
  color: var(--accent-strong);
}

.selection-chip.is-product {
  background: rgba(211, 140, 59, 0.16);
  border-color: rgba(211, 140, 59, 0.22);
  color: #8c5616;
}

.checkout-total-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.total-amount {
  margin: 6px 0 18px;
  color: #36b37e;
  font-size: 45px;
  line-height: 1;
}

.checkout-total-card .submit-button {
  width: 100%;
  margin-bottom: 4px;
}

.empty-state {
  margin: 0;
  color: var(--text-soft);
  line-height: 1.7;
}

@media (max-width: 980px) {
  .entry-page {
    height: auto;
    overflow: visible;
  }

  .entry-main-card {
    display: block;
    overflow: visible;
  }

  .entry-picker-panel {
    width: 100%;
    padding-bottom: 0;
    overflow: visible;
    padding-right: 0;
  }

  .entry-button-list {
    grid-template-columns: repeat(auto-fill, 140px);
  }

  .entry-select-button,
  .entry-select-button.compact {
    width: 140px;
    min-height: 88px;
    height: 88px;
  }

  .checkout-panel {
    position: static;
    left: auto;
    right: auto;
    bottom: auto;
    grid-template-columns: 1fr;
  }

  .checkout-selection-card,
  .checkout-total-card {
    border-left: 0;
    border-top: 1px solid rgba(41, 88, 61, 0.12);
  }
}

@media (max-width: 720px) {
  .entry-page {
    padding: 24px 16px 32px;
  }

  .entry-hero,
  .member-search,
  .member-info-row {
    flex-direction: column;
    align-items: stretch;
  }

  .entry-clock-card,
  .primary-button {
    width: 100%;
  }

  .entry-tabs {
    overflow-x: auto;
    padding-bottom: 12px;
  }

  .entry-tab {
    white-space: nowrap;
  }

  .member-info-row strong {
    text-align: left;
  }

  .total-amount {
    font-size: 42px;
  }
}
</style>
