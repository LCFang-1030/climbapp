<template>
  <div class="entry">
    <h1>This is an entry page</h1>

    <h4>datetime: {{ datetime }}</h4>

    <form class="member-search" @submit.prevent="searchMember">
      <div class="member-search-field">
        <label for="entry-phone">phone:</label>
        <input id="entry-phone" name="phone" type="text" v-model.trim="phone" />

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
      <button type="submit">搜尋會員</button>
    </form>

    <p v-if="isSearching">搜尋會員中...</p>
    <p v-else-if="searchMessage" class="entry-message">{{ searchMessage }}</p>

    <section v-if="selectedMember" class="member-summary">
      {{ memberSummaryItems.join(' | ') }}
    </section>

    <div>
      equipment: {{ equipment }} &nbsp;&nbsp;
      <label v-for="item in equipmentOptions" :key="item.id">
        <input type="checkbox" :value="item.id" v-model="equipment" />
        {{ item.label }} ${{ item.price }}
      </label>
    </div>

    <div>
      ticket: {{ ticket_type }} &nbsp;&nbsp;
      <label v-for="ticket in ticketOptions" :key="ticket.ticket_id">
        <input type="radio" :value="ticket.ticket_id" v-model="ticket_type" />
        {{ ticket.ticket_name }} ${{ ticket.ticket_price }}
      </label>
    </div>

    <div>price: {{ price_total }}</div>

    <hr />
    entry_record: {{ entry_record }}
    {{ islogout }}
    <button @click="Setlogout()"> logout </button>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  beforeCreate() {
    if (!localStorage.getItem('islogin')) {
      this.$router.push('/staff')
    }
  },

  mounted() {
    this.datetime = new Date().toLocaleString('zh-TW', { hour12: false })
    this.fetchMembers()
    this.fetchTickets()
  },

  data() {
    return {
      x: this.$route.query.x,
      datetime: '',
      member_code: '',
      phone: '',
      selectedMember: null,
      members: [],
      isSearching: false,
      searchMessage: '',
      equipment: [],
      ticket_type: null,
      equipmentOptions: [
        { id: 'shoes', label: '租鞋', price: 100 },
        { id: 'rope', label: '繩索', price: 50 },
        { id: 'harness', label: '吊帶', price: 70 },
        { id: 'chalk_bag', label: '粉袋', price: 80 },
      ],
      ticketOptions: [],
      entry_record: {
        datetime: '',
        member_code: '',
        member_name: '',
        phone: '',
        ticket_type: null,
        equipment: [],
        price_total: 0,
      },
      islogout: false,
    }
  },

  methods: {
    async fetchMembers() {
      if (this.members.length) {
        return
      }

      const res = await axios.get('/api/members')
      this.members = res.data
    },

    async fetchTickets() {
      try {
        const res = await axios.get('/api/ticket')
        this.ticketOptions = Array.isArray(res.data)
          ? res.data.filter((ticket) => Number(ticket.is_active) !== 0)
          : []
      } catch (err) {
        console.error('取得票種失敗', err)
      }
    },

    async searchMember() {
      if (!this.phone) {
        this.clearMember()
        this.searchMessage = '請輸入電話、會員編號或姓名'
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
            ? `找到 ${matches.length} 位會員，請輸入更完整的資料`
            : '找不到符合的會員'
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
      this.phone = member.phone ?? this.phone
      this.updateEntryRecord()
    },

    normalizePhone(value) {
      return String(value ?? '').replace(/\D/g, '')
    },

    memberKey(member) {
      return member.id ?? member.mid ?? member.member_id ?? member.member_code ?? JSON.stringify(member)
    },

    suggestionText(member) {
      return member.phone ?? ''
    },

    Setlogout() {
      localStorage.removeItem('islogin')
      this.$router.push('/staff')
    },

    clearMember() {
      this.selectedMember = null
      this.member_code = ''
    },

    passText(passType) {
      const passLabels = {
        0: 'NONE',
        single: 'NONE',
        1: '月卡',
        monthly: '月卡',
        2: '季卡',
        quarterly: '季卡',
        3: '半年卡',
        half_year: '半年卡',
        4: '年卡',
        yearly: '年卡',
      }

      return passLabels[passType] ?? passType ?? 'NONE'
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

    updateEntryRecord() {
      this.entry_record = {
        datetime: this.datetime,
        member_code: this.member_code,
        member_name: this.selectedMember?.name ?? '',
        phone: this.phone,
        ticket_type: this.ticket_type,
        equipment: this.equipment,
        price_total: this.price_total,
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

    memberSummaryItems() {
      if (!this.selectedMember) {
        return []
      }

      const passItems = this.hasLongTermPass
        ? [
            this.passText(this.selectedMember.pass_type),
            this.selectedMember.active_pass_expires_at
              ? this.formatDate(this.selectedMember.active_pass_expires_at)
              : '',
          ]
        : ['單次票']

      return [
        this.member_code,
        this.selectedMember.name,
        this.selectedMember.phone,
        ...passItems,
      ].filter((value) => value !== null && value !== undefined && value !== '')
    },

    selectedTicket() {
      return this.ticketOptions.find((ticket) => ticket.ticket_id === this.ticket_type)
    },

    hasLongTermPass() {
      const passType = this.selectedMember?.pass_type
      return Boolean(passType && passType !== 'single' && Number(passType) !== 0)
    },

    price_total() {
      const ticketTotal = Number(this.selectedTicket?.ticket_price ?? 0)
      const equipmentTotal = this.equipment.reduce((total, id) => {
        const item = this.equipmentOptions.find((option) => option.id === id)
        return total + Number(item?.price ?? 0)
      }, 0)

      return ticketTotal + equipmentTotal
    },
  },

  watch: {
    phone(newPhone) {
      if (this.selectedMember && newPhone !== this.selectedMember.phone) {
        this.clearMember()
      }

      this.searchMessage = ''
    },

    ticket_type() {
      this.updateEntryRecord()
    },

    equipment: {
      handler() {
        this.updateEntryRecord()
      },
      deep: true,
    },
  },
}
</script>

<style scoped>
.member-search,
.member-summary,
.entry-message {
  margin-bottom: 16px;
}

.member-search {
  align-items: flex-start;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.member-search-field {
  display: flex;
  position: relative;
}

.member-search input {
  margin: 0 8px;
}

.entry label {
  margin-right: 12px;
}

.member-summary {
  font-weight: 600;
}

.member-suggestions {
  background: #fff;
  border: 1px solid #d7d7d7;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  left: 106px;
  min-width: 120px;
  overflow: hidden;
  position: absolute;
  top: calc(100% + 6px);
  width: max-content;
  z-index: 10;
}

.member-suggestion {
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 10px 12px;
  text-align: left;
  white-space: nowrap;
}

.member-suggestion:hover,
.member-suggestion:focus {
  background: #f2f4f7;
}

.entry-message {
  color: #b00020;
}
</style>
