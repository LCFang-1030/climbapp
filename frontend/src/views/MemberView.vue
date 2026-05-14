<template>
  <div class="member">
    <h1>Member Board</h1>

    <p v-if="isLoading">讀取會員資料中...</p>
    <p v-else-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <table v-else-if="members.length" border="1" class="member-board">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column">
            {{ column }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="member in members" :key="memberKey(member)">
          <td v-for="column in columns" :key="column">
            {{ formatValue(member[column]) }}
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>目前沒有會員資料</p>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  mounted() {
    this.fetchMembers()
  },

  data() {
    return {
      members: [],
      isLoading: false,
      errorMessage: '',
    }
  },

  computed: {
    columns() {
      const columnSet = new Set()

      this.members.forEach((member) => {
        Object.keys(member).forEach((key) => columnSet.add(key))
      })

      return Array.from(columnSet)
    },
  },

  methods: {
    async fetchMembers() {
      this.isLoading = true
      this.errorMessage = ''

      try {
        const res = await axios.get('/api/members')
        this.members = res.data
      } catch (err) {
        console.error('取得 members 失敗', err)
        this.errorMessage = '取得會員資料失敗'
      } finally {
        this.isLoading = false
      }
    },

    memberKey(member) {
      return member.id ?? member.mid ?? member.member_id ?? JSON.stringify(member)
    },

    formatValue(value) {
      if (value === null || value === undefined) {
        return ''
      }

      return value
    },
  },
}
</script>

<style scoped>
.member-board {
  border-collapse: collapse;
  min-width: 480px;
}

.member-board th,
.member-board td {
  padding: 8px 12px;
  text-align: left;
}

.member-board th {
  background: #f2f2f2;
}

.error-message {
  color: #c62828;
}
</style>
