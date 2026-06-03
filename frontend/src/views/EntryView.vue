<template>
  <div class="entry-page">
    <section class="entry-main-card">
      <template v-if="entryStep === 1">
        <form class="member-search" @submit.prevent="searchMember">
          <div class="member-search-field">
            <label for="entry-member-keyword">手機 / 會員編號 / 姓名</label>
            <input
              id="entry-member-keyword"
              v-model.trim="phone"
              type="text"
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

        <div class="entry-tabs" role="tablist" aria-label="入場項目分類">
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
              <div class="entry-select-content">
                <strong class="entry-select-name">{{ ticket.ticket_name }}</strong>
                <span class="entry-select-price">${{ formatPrice(ticket.ticket_price) }}</span>
              </div>
              <div class="quantity-controls">
                <button
                  v-if="getItemQuantity(ticketQuantities, ticket.ticket_code) > 0"
                  type="button"
                  class="quantity-button secondary"
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
              <div class="entry-select-content">
                <strong class="entry-select-name">{{ item.rental_name }}</strong>
                <span class="entry-select-price">${{ formatPrice(item.rental_price) }}</span>
              </div>
              <div class="quantity-controls">
                <button
                  v-if="getItemQuantity(equipmentQuantities, item.rental_code) > 0"
                  type="button"
                  class="quantity-button secondary"
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
              <div class="entry-select-content">
                <strong class="entry-select-name">{{ product.product_name }}</strong>
                <span class="entry-select-price">${{ formatPrice(product.product_price) }}</span>
              </div>
              <div class="quantity-controls">
                <button
                  v-if="getItemQuantity(productQuantities, product.product_code) > 0"
                  type="button"
                  class="quantity-button secondary"
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
            <div class="panel-title">會員資料</div>
            <div class="member-info-card">
              <div class="member-info-row">
                <span class="member-info-label">會員編號</span>
                <strong class="member-info-value">{{ member_code || '-' }}</strong>
              </div>
              <div class="member-info-row">
                <span class="member-info-label">姓名</span>
                <strong class="member-info-value">{{ selectedMember?.name || '-' }}</strong>
              </div>
              <div class="member-info-row">
                <span class="member-info-label">手機</span>
                <strong class="member-info-value">{{ selectedMember?.phone || '-' }}</strong>
              </div>
              <div class="member-info-row">
                <span class="member-info-label">票券狀態</span>
                <strong class="member-info-value">{{ memberPassSummary }}</strong>
              </div>
            </div>
          </div>

          <div class="checkout-selection-card">
            <div class="panel-title">已選項目</div>
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
            <p v-else class="empty-state">尚未選擇票券、裝備租借或商品。</p>
          </div>

          <div class="checkout-total-card">
            <div class="panel-title">結帳應付金額</div>
            <strong class="total-amount">${{ formatPrice(subtotalAmount) }}</strong>
            <button type="button" class="submit-button" @click="goToCheckoutStep">
              送出入場
            </button>
            <p v-if="visitMessage" class="entry-message" :class="visitMessageClass">
              {{ visitMessage }}
            </p>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="entry-hero">
          <div>
            <p class="entry-eyebrow">Check In</p>
            <h1>會員入場結帳</h1>
            <p class="entry-description">
              先選擇會員與入場項目，再進入結帳明細完成活動、支付方式與稅務資料。
            </p>
          </div>
          <div class="entry-clock-card">
            <span class="entry-clock-label">目前時間</span>
            <strong>{{ datetime }}</strong>
          </div>
        </section>

        <section class="checkout-flow">
          <header class="checkout-flow-header">
            <button type="button" class="back-button" @click="backToSelectionStep">
              返回
            </button>

            <div class="checkout-flow-order">
              <span class="summary-label">訂單編號</span>
              <strong>{{ previewOrderNo }}</strong>
            </div>

            <div class="checkout-flow-member">
              <strong>{{ selectedMember?.name || '-' }}</strong>
              <span>{{ selectedMember?.phone || '-' }}</span>
            </div>
          </header>

          <div class="checkout-flow-body">
            <aside class="checkout-sidebar">
              <div class="sidebar-card">
                <p class="summary-label">選擇項目</p>
                <div v-if="lineItems.length" class="line-item-list">
                  <div v-for="item in lineItems" :key="item.key" class="line-item-row">
                    <div>
                      <strong>{{ item.item_name }}</strong>
                      <p>{{ item.item_code }}</p>
                    </div>
                    <div class="line-item-price">
                      <span>${{ formatPrice(item.unit_price) }}</span>
                      <span>x{{ item.quantity }}</span>
                    </div>
                  </div>
                </div>
                <p v-else class="empty-state">尚未選擇任何項目。</p>
              </div>
            </aside>

            <section class="checkout-detail">
              <div class="checkout-nav">
                <button type="button" class="checkout-nav-button" @click="scrollToSection('activity')">
                  會員活動
                </button>
                <button type="button" class="checkout-nav-button" @click="scrollToSection('payment')">
                  支付方式
                </button>
                <button type="button" class="checkout-nav-button" @click="scrollToSection('invoice')">
                  稅務相關
                </button>
              </div>

              <div class="checkout-detail-scroll">
                <section ref="activitySection" class="detail-section activity-section">
                  <div class="detail-section-header">
                    <h2>會員活動</h2>
                    <p>目前先支援單選一種活動。</p>
                  </div>

                  <div class="option-list">
                    <button
                      v-for="activity in activityOptions"
                      :key="activity.key"
                      type="button"
                      class="option-card"
                      :class="{ selected: selectedActivityKey === activity.key }"
                      @click="selectedActivityKey = activity.key"
                    >
                      <div class="option-card-title">{{ activity.label }}</div>
                      <div class="option-card-subtitle">{{ activity.description }}</div>
                    </button>
                  </div>
                </section>

                <section ref="paymentSection" class="detail-section">
                  <div class="detail-section-header">
                    <h2>支付方式</h2>
                    <p>只能選擇其中一種。</p>
                  </div>

                  <div class="option-list payment-grid">
                    <button
                      v-for="method in paymentOptions"
                      :key="method.value"
                      type="button"
                      class="option-card"
                      :class="{ selected: paymentMethod === method.value }"
                      @click="paymentMethod = method.value"
                    >
                      <div class="option-card-title">{{ method.label }}</div>
                    </button>
                  </div>
                </section>

                <section ref="invoiceSection" class="detail-section">
                  <div class="detail-section-header">
                    <h2>稅務相關</h2>
                    <p>不開立、統一編號、載具條碼、捐贈碼擇一。</p>
                  </div>

                  <div class="option-list">
                    <button
                      v-for="option in invoiceOptions"
                      :key="option.value"
                      type="button"
                      class="option-card"
                      :class="{ selected: invoiceType === option.value }"
                      @click="selectInvoiceType(option.value)"
                    >
                      <div class="option-card-title">{{ option.label }}</div>
                    </button>
                  </div>

                  <div v-if="invoiceType === 1" class="invoice-input-card">
                    <label>統一編號</label>
                    <input v-model.trim="taxId" type="text" placeholder="請輸入統一編號" />
                  </div>

                  <div v-if="invoiceType === 2" class="invoice-input-card">
                    <label>載具條碼</label>
                    <input v-model.trim="carrierCode" type="text" placeholder="請輸入載具條碼" />
                  </div>

                  <div v-if="invoiceType === 3" class="invoice-input-card">
                    <label>捐贈碼</label>
                    <input v-model.trim="donateCode" type="text" placeholder="請輸入捐贈碼" />
                  </div>
                </section>
              </div>
            </section>
          </div>

          <footer class="checkout-footer">
            <div class="footer-amount-block">
              <span>總金額</span>
              <strong>${{ formatPrice(subtotalAmount) }}</strong>
            </div>
            <div class="footer-amount-block">
              <span>優惠金額</span>
              <strong>${{ formatPrice(discountAmount) }}</strong>
            </div>
            <div class="footer-amount-block accent">
              <span>應付金額</span>
              <strong>${{ formatPrice(totalAmount) }}</strong>
            </div>
            <button
              type="button"
              class="checkout-confirm-button"
              :disabled="isSubmittingVisit"
              @click="submitVisit"
            >
              {{ isSubmittingVisit ? '結帳中...' : '確定結帳' }}
            </button>
          </footer>

          <p v-if="visitMessage" class="entry-message checkout-message" :class="visitMessageClass">
            {{ visitMessage }}
          </p>
        </section>
      </template>
    </section>
  </div>
</template>

<script>
import axios from 'axios'
import { getStoredAuth } from '../utils/auth'

const QUANTITY_MAP_KEYS = {
  ticket: 'ticketQuantities',
  rental: 'equipmentQuantities',
  product: 'productQuantities',
}

export default {
  data() {
    return {
      datetime: '',
      clockTimer: null,
      entryStep: 1,
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
      selectedActivityKey: 'none',
      paymentMethod: null,
      invoiceType: 0,
      taxId: '',
      carrierCode: '',
      donateCode: '',
      pickerTabs: [
        { key: 'ticket', label: '進場票券' },
        { key: 'rental', label: '設備租借' },
        { key: 'product', label: '商品販售' },
      ],
      activityOptions: [
        { key: 'none', label: '不使用活動', description: '照原價結帳', type: 'none', value: 0 },
        { key: 'opening', label: '開幕活動 9 折', description: '總金額 9 折', type: 'percent', value: 10 },
      ],
      paymentOptions: [
        { value: 1, label: '現金' },
        { value: 2, label: '轉帳' },
        { value: 3, label: '信用卡' },
        { value: 4, label: 'Line Pay' },
      ],
      invoiceOptions: [
        { value: 0, label: '不開立' },
        { value: 1, label: '統一編號' },
        { value: 2, label: '載具條碼' },
        { value: 3, label: '捐贈碼' },
      ],
    }
  },

  computed: {
    memberSuggestions() {
      if (this.selectedMember && this.phone === this.selectedMember.phone) {
        return []
      }

      return this.findMatchingMembers(this.phone).slice(0, 5).map((result) => result.member)
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

      return expiresAt ? `${label} 到期日 ${expiresAt}` : label
    },

    selectedTicketItems() {
      return this.ticketOptions
        .filter((ticket) => this.getItemQuantity(this.ticketQuantities, ticket.ticket_code) > 0)
        .map((ticket) => ({ ...ticket, quantity: this.getItemQuantity(this.ticketQuantities, ticket.ticket_code) }))
    },

    selectedEquipmentItems() {
      return this.equipmentOptions
        .filter((item) => this.getItemQuantity(this.equipmentQuantities, item.rental_code) > 0)
        .map((item) => ({ ...item, quantity: this.getItemQuantity(this.equipmentQuantities, item.rental_code) }))
    },

    selectedProductItems() {
      return this.productOptions
        .filter((item) => this.getItemQuantity(this.productQuantities, item.product_code) > 0)
        .map((item) => ({ ...item, quantity: this.getItemQuantity(this.productQuantities, item.product_code) }))
    },

    selectedSummaryChips() {
      const chips = []

      this.selectedTicketItems.forEach((item) => {
        chips.push({ key: `ticket-${item.ticket_code}`, label: `${item.ticket_name} x${item.quantity}`, type: 'ticket' })
      })
      this.selectedEquipmentItems.forEach((item) => {
        chips.push({ key: `rental-${item.rental_code}`, label: `${item.rental_name} x${item.quantity}`, type: 'rental' })
      })
      this.selectedProductItems.forEach((item) => {
        chips.push({ key: `product-${item.product_code}`, label: `${item.product_name} x${item.quantity}`, type: 'product' })
      })

      return chips
    },

    lineItems() {
      return [
        ...this.selectedTicketItems.map((item) => ({
          key: `ticket-${item.ticket_code}`,
          item_code: item.ticket_code,
          item_name: item.ticket_name,
          unit_price: Number(item.ticket_price ?? 0),
          quantity: Number(item.quantity ?? 0),
        })),
        ...this.selectedEquipmentItems.map((item) => ({
          key: `rental-${item.rental_code}`,
          item_code: item.rental_code,
          item_name: item.rental_name,
          unit_price: Number(item.rental_price ?? 0),
          quantity: Number(item.quantity ?? 0),
        })),
        ...this.selectedProductItems.map((item) => ({
          key: `product-${item.product_code}`,
          item_code: item.product_code,
          item_name: item.product_name,
          unit_price: Number(item.product_price ?? 0),
          quantity: Number(item.quantity ?? 0),
        })),
      ]
    },

    subtotalAmount() {
      return this.lineItems.reduce((total, item) => total + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0), 0)
    },

    selectedActivity() {
      return this.activityOptions.find((activity) => activity.key === this.selectedActivityKey) ?? this.activityOptions[0]
    },

    discountAmount() {
      if (!this.selectedActivity || this.selectedActivity.type === 'none') {
        return 0
      }
      if (this.selectedActivity.type === 'percent') {
        return Math.round(this.subtotalAmount * (Number(this.selectedActivity.value ?? 0) / 100))
      }
      if (this.selectedActivity.type === 'fixed') {
        return Math.min(Number(this.selectedActivity.value ?? 0), this.subtotalAmount)
      }
      return 0
    },

    totalAmount() {
      return Math.max(this.subtotalAmount - this.discountAmount, 0)
    },

    previewOrderNo() {
      const now = new Date()
      const part = (value) => String(value).padStart(2, '0')
      return `${now.getFullYear()}${part(now.getMonth() + 1)}${part(now.getDate())}${part(now.getHours())}${part(now.getMinutes())}${part(now.getSeconds())}`
    },

    visitMessageClass() {
      return this.visitMessageType === 'error' ? 'is-error' : 'is-success'
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

  methods: {
    updateCurrentDateTime() {
      this.datetime = new Date().toLocaleString('zh-TW', { hour12: false })
    },
    async fetchMembers() {
      if (this.members.length) return
      const res = await axios.get('/api/members')
      this.members = Array.isArray(res.data) ? res.data : []
    },
    async fetchTickets() {
      try {
        const res = await axios.get('/api/ticket?activeOnly=1')
        this.ticketOptions = Array.isArray(res.data) ? res.data.filter((ticket) => Number(ticket.is_active) !== 0) : []
      } catch (err) {
        console.error('取得票券失敗', err)
      }
    },
    async fetchRentalEquipment() {
      try {
        const res = await axios.get('/api/rental_equipment?activeOnly=1')
        this.equipmentOptions = Array.isArray(res.data) ? res.data.filter((item) => Number(item.is_active) !== 0) : []
      } catch (err) {
        console.error('取得租借裝備失敗', err)
      }
    },
    async fetchProducts() {
      try {
        const res = await axios.get('/api/product')
        this.productOptions = Array.isArray(res.data) ? res.data.filter((item) => Number(item.is_active) !== 0) : []
      } catch (err) {
        console.error('取得商品失敗', err)
      }
    },
    getItemQuantity(quantityMap, code) {
      return Number(quantityMap?.[code] ?? 0)
    },
    setItemQuantity(type, code, quantity) {
      const mapKey = QUANTITY_MAP_KEYS[type]
      if (!mapKey || !code) return
      const nextMap = { ...this[mapKey] }
      if (quantity <= 0) delete nextMap[code]
      else nextMap[code] = quantity
      this[mapKey] = nextMap
      this.visitMessage = ''
      this.visitMessageType = ''
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
        this.searchMessage = '請輸入會員編號、姓名或手機。'
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
          this.searchMessage = matches.length > 1 ? `找到 ${matches.length} 位符合會員，請輸入更完整條件。` : '找不到符合的會員。'
          return
        }
        this.setSelectedMember(member)
      } catch (err) {
        console.error('搜尋會員失敗', err)
        this.clearMember()
        this.searchMessage = '搜尋會員失敗。'
      } finally {
        this.isSearching = false
      }
    },
    findMatchingMembers(keyword) {
      const query = String(keyword ?? '').trim().toLowerCase()
      const normalizedPhone = this.normalizePhone(query)
      if (!query) return []
      return this.members
        .map((member) => ({ member, score: this.memberSearchScore(member, query, normalizedPhone) }))
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
      if (!canUsePartialMatch) return -1
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
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      return date.toLocaleDateString('zh-TW')
    },
    formatPrice(value) {
      return Number(value ?? 0).toLocaleString('zh-TW')
    },
    goToCheckoutStep() {
      if (!this.selectedMember?.member_id) {
        this.visitMessage = '請先選擇會員。'
        this.visitMessageType = 'error'
        return
      }
      if (!this.selectedTicketItems.length) {
        this.visitMessage = '請至少選擇一張入場票券。'
        this.visitMessageType = 'error'
        return
      }
      this.entryStep = 2
      this.visitMessage = ''
      this.visitMessageType = ''
    },
    backToSelectionStep() {
      this.entryStep = 1
      this.visitMessage = ''
      this.visitMessageType = ''
    },
    scrollToSection(section) {
      const refName = `${section}Section`
      this.$refs[refName]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    selectInvoiceType(type) {
      this.invoiceType = type
      this.taxId = ''
      this.carrierCode = ''
      this.donateCode = ''
    },
    validateCheckoutForm() {
      if (!this.paymentMethod) {
        this.visitMessage = '請選擇支付方式。'
        this.visitMessageType = 'error'
        this.scrollToSection('payment')
        return false
      }
      if (this.invoiceType === 1 && !this.taxId) {
        this.visitMessage = '請輸入統一編號。'
        this.visitMessageType = 'error'
        this.scrollToSection('invoice')
        return false
      }
      if (this.invoiceType === 2 && !this.carrierCode) {
        this.visitMessage = '請輸入載具條碼。'
        this.visitMessageType = 'error'
        this.scrollToSection('invoice')
        return false
      }
      if (this.invoiceType === 3 && !this.donateCode) {
        this.visitMessage = '請輸入捐贈碼。'
        this.visitMessageType = 'error'
        this.scrollToSection('invoice')
        return false
      }
      return true
    },
    buildSubmitPayload() {
      const auth = getStoredAuth()
      return {
        member_id: this.selectedMember.member_id,
        activity_id: null,
        discount_amount: this.discountAmount,
        payment_method: this.paymentMethod,
        invoice_type: this.invoiceType,
        tax_id: this.invoiceType === 1 ? this.taxId : null,
        carrier_code: this.invoiceType === 2 ? this.carrierCode : null,
        donate_code: this.invoiceType === 3 ? this.donateCode : null,
        created_by: auth?.eid ?? null,
        ticket_items: this.selectedTicketItems.map((item) => ({ ticket_code: item.ticket_code, quantity: item.quantity })),
        rental_items: this.selectedEquipmentItems.map((item) => ({ rental_code: item.rental_code, quantity: item.quantity })),
        product_items: this.selectedProductItems.map((item) => ({ product_code: item.product_code, quantity: item.quantity })),
      }
    },
    resetSelection() {
      this.ticketQuantities = {}
      this.equipmentQuantities = {}
      this.productQuantities = {}
      this.paymentMethod = null
      this.selectedActivityKey = 'none'
      this.selectInvoiceType(0)
      this.entryStep = 1
    },
    async submitVisit() {
      if (!this.selectedMember?.member_id) {
        this.visitMessage = '請先選擇會員。'
        this.visitMessageType = 'error'
        return
      }
      if (!this.selectedTicketItems.length) {
        this.visitMessage = '請至少選擇一張入場票券。'
        this.visitMessageType = 'error'
        return
      }
      if (!this.validateCheckoutForm()) return
      this.isSubmittingVisit = true
      this.visitMessage = ''
      this.visitMessageType = ''
      try {
        const payload = this.buildSubmitPayload()
        const response = await axios.post('/api/member_visits', payload)
        const orderNo = response?.data?.order_no ? `，訂單編號 ${response.data.order_no}` : ''
        this.visitMessage = `結帳完成${orderNo}`
        this.visitMessageType = 'success'
        this.resetSelection()
      } catch (err) {
        console.error('新增入場紀錄失敗', err)
        this.visitMessage = err.response?.data?.message ?? '新增入場紀錄失敗。'
        this.visitMessageType = 'error'
      } finally {
        this.isSubmittingVisit = false
      }
    },
  },
}
</script>

<style scoped>
.entry-page {
  --entry-bg: #f6faf7;
  --panel-bg: rgba(255, 255, 255, 0.96);
  --panel-border: rgba(34, 66, 49, 0.14);
  --text-main: #1c2f25;
  --text-soft: #5f7365;
  --accent: #2f7a53;
  --accent-strong: #1f5e3e;
  --accent-soft: #e7f3ea;
  --danger: #b23a31;
  --success: #1c7a48;
  --ticket: #dcecff;
  --rental: #ece8ff;
  --product: #ffe8d4;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  height: calc(100vh - 64px);
  min-height: calc(100vh - 64px);
  padding: 12px 16px 16px;
  box-sizing: border-box;
  background: var(--entry-bg);
  color: var(--text-main);
  overflow: hidden;
}

.entry-main-card,
.entry-clock-card {
  border: 1px solid var(--panel-border);
  border-radius: 22px;
  background: var(--panel-bg);
  box-shadow: 0 12px 30px rgba(24, 48, 34, 0.08);
}

.entry-main-card {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  padding: 16px 16px 0;
  overflow: hidden;
}

.entry-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.entry-eyebrow,
.summary-label,
.panel-title {
  margin: 0 0 8px;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.entry-hero h1,
.detail-section-header h2 {
  margin: 0;
}

.entry-description,
.detail-section-header p,
.line-item-row p,
.member-meta-row {
  margin: 8px 0 0;
  color: var(--text-soft);
  line-height: 1.6;
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

.member-search {
  display: flex;
  align-items: end;
  gap: 12px;
  margin-bottom: 14px;
}

.member-search-field {
  position: relative;
  flex: 1;
}

.member-search-field label,
.invoice-input-card label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
}

.member-search-field input,
.invoice-input-card input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(34, 66, 49, 0.18);
  border-radius: 18px;
  background: #fff;
  color: var(--text-main);
  font: inherit;
  padding: 15px 18px;
}

.member-search-field input:focus,
.invoice-input-card input:focus {
  outline: 2px solid rgba(47, 122, 83, 0.16);
  border-color: var(--accent);
}

.primary-button,
.submit-button,
.entry-tab,
.quantity-button,
.back-button,
.checkout-nav-button,
.checkout-confirm-button,
.option-card {
  border: 0;
  cursor: pointer;
  font: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, background 0.15s ease;
}

.primary-button,
.submit-button,
.checkout-confirm-button {
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #fff;
  padding: 14px 24px;
  font-weight: 700;
  box-shadow: 0 12px 24px rgba(31, 94, 62, 0.18);
}

.member-suggestions {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 5;
  overflow: hidden;
  border: 1px solid rgba(34, 66, 49, 0.12);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 36px rgba(24, 48, 34, 0.12);
}

.member-suggestion {
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  padding: 12px 14px;
}

.member-suggestion:hover,
.member-suggestion:focus {
  background: #edf6f0;
}

.entry-message {
  margin: 12px 0 0;
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
  margin: 6px 0 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(34, 66, 49, 0.08);
}

.entry-tab {
  border-radius: 999px;
  background: #edf4ef;
  color: #577060;
  padding: 12px 22px;
  font-weight: 800;
}

.entry-tab.active {
  background: var(--accent-soft);
  color: var(--accent-strong);
  box-shadow: inset 0 0 0 1px rgba(47, 122, 83, 0.12);
}

.entry-picker-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
  padding-bottom: 4px;
}

.entry-button-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.entry-select-button,
.sidebar-card,
.detail-section,
.invoice-input-card,
.checkout-member-card,
.checkout-selection-card,
.checkout-total-card {
  border: 1px solid rgba(34, 66, 49, 0.12);
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.97);
}

.entry-select-button {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: 118px;
  padding: 18px 18px 14px;
}

.entry-select-button.selected {
  border-color: rgba(47, 122, 83, 0.36);
  box-shadow: inset 0 0 0 1px rgba(47, 122, 83, 0.16);
}

.entry-select-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.entry-select-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 80px;
}

.entry-select-name {
  font-size: 18px;
  line-height: 1.3;
}

.entry-select-price {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent-strong);
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  justify-content: flex-end;
  align-self: flex-end;
}

.quantity-button {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: #e6f0e9;
  color: var(--accent-strong);
  font-size: 22px;
  font-weight: 700;
}

.quantity-button.secondary {
  background: #f1f5f2;
}

.quantity-value {
  min-width: 24px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
}

.checkout-panel {
  display: grid;
  grid-template-columns: 1fr 1.15fr 0.75fr;
  gap: 16px;
  margin-top: 10px;
  padding: 12px 0;
  border-top: 1px solid rgba(34, 66, 49, 0.1);
  flex-shrink: 0;
}

.checkout-member-card,
.checkout-selection-card,
.checkout-total-card {
  padding: 16px 18px;
}

.member-info-card {
  display: flex;
  flex-direction: column;
}

.member-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(34, 66, 49, 0.08);
}

.member-info-row:last-child {
  border-bottom: 0;
}

.member-info-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-soft);
}

.member-info-value {
  font-size: 15px;
  word-break: break-word;
  text-align: right;
}

.selection-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.selection-chip {
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 700;
}

.selection-chip.is-ticket {
  background: var(--ticket);
}

.selection-chip.is-rental {
  background: var(--rental);
}

.selection-chip.is-product {
  background: var(--product);
}

.total-amount {
  display: block;
  margin-bottom: 18px;
  font-size: 56px;
  color: var(--accent);
}

.submit-button {
  width: 100%;
}

.empty-state {
  margin: 0;
  color: var(--text-soft);
}

.checkout-flow {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.checkout-flow-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(34, 66, 49, 0.12);
}

.back-button {
  border-radius: 999px;
  background: #edf4ef;
  color: var(--accent-strong);
  padding: 12px 18px;
  font-weight: 700;
}

.checkout-flow-order strong,
.footer-amount-block strong {
  font-size: 34px;
}

.checkout-flow-member {
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 4px;
}

.checkout-flow-body {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 18px;
  min-height: 0;
  flex: 1;
  padding: 12px 0 0;
  overflow: hidden;
  align-items: start;
}

.checkout-sidebar {
  min-height: 0;
}

.sidebar-card {
  padding: 10px 16px;
  overflow: auto;
  height: 46vh; 
  max-height: 46vh;
}

.line-item-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.line-item-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(34, 66, 49, 0.08);
}

.line-item-row p {
  margin: 6px 0 0;
  font-size: 13px;
}

.line-item-price {
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 4px;
  white-space: nowrap;
}

.checkout-detail {
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.checkout-nav {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.checkout-nav-button {
  border-radius: 999px;
  background: #edf4ef;
  color: var(--text-soft);
  padding: 10px 16px;
  font-weight: 700;
}

.checkout-detail-scroll {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 0 0 auto;
  height: 41vh;
  max-height: 41vh;
  min-height: 0;
  overflow: auto;
  padding-right: 6px;
  padding-bottom: 8px;
  scroll-behavior: smooth;
}

.detail-section,
.invoice-input-card {
  padding: 14px 16px;
}

.option-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.payment-grid {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.option-card {
  text-align: left;
  border-radius: 18px;
  background: #f7faf8;
  padding: 16px 18px;
}

.option-card.selected {
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px rgba(47, 122, 83, 0.18);
}

.option-card-title {
  font-size: 24px;
  font-weight: 700;
}

.option-card-subtitle {
  margin-top: 6px;
  color: var(--text-soft);
}

.activity-section .detail-section-header h2 {
  font-size: 22px;
}

.activity-section .detail-section-header p {
  font-size: 14px;
}

.activity-section .option-card {
  padding: 10px 14px;
}

.activity-section .option-card-title {
  font-size: 18px;
}

.activity-section .option-card-subtitle {
  margin-top: 4px;
  font-size: 14px;
}

.invoice-input-card {
  margin-top: 16px;
}

.checkout-footer {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 16px;
  align-items: center;
  flex-shrink: 0;
  margin-top: 12px;
  padding: 18px 22px;
  border: 1px solid rgba(34, 66, 49, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 40px rgba(24, 48, 34, 0.14);
  backdrop-filter: blur(10px);
}

.footer-amount-block {
  padding: 12px 0;
}

.footer-amount-block span {
  display: block;
  margin-bottom: 8px;
  color: var(--text-soft);
}

.footer-amount-block.accent strong {
  color: var(--accent);
}

.checkout-message {
  margin-top: 14px;
}

@media (max-width: 1100px) {
  .checkout-panel,
  .checkout-flow-body,
  .checkout-footer {
    grid-template-columns: 1fr;
  }

  .checkout-flow-member {
    align-items: start;
  }

  .sidebar-card,
  .checkout-detail-scroll {
    max-height: none;
  }

  .checkout-flow {
    overflow: visible;
  }
}

@media (max-width: 720px) {
  .entry-page {
    padding: 12px;
    height: auto;
    min-height: calc(100vh - 64px);
    overflow: auto;
  }

  .member-search,
  .checkout-flow-header {
    display: grid;
    grid-template-columns: 1fr;
  }

  .entry-button-list {
    grid-template-columns: 1fr;
  }

  .entry-tabs {
    overflow: auto;
    padding-bottom: 10px;
  }

  .entry-tab {
    white-space: nowrap;
  }

  .total-amount,
  .checkout-flow-order strong,
  .footer-amount-block strong {
    font-size: 30px;
  }

  .checkout-footer {
    padding: 16px;
  }
}
</style>
