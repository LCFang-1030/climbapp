
<template>
  <div class="entry">
    <h1>This is an entry page</h1>

    <h4>datetime: {{ datetime }}</h4>
    <h4>num_id: {{ num_id }} &nbsp; <input type="text" v-model.trim="num_id" /></h4>
    <h4>phone: {{ phone }}</h4>

    <div>
    checkbox: {{ equipment }} &nbsp;&nbsp;
      <input type="checkbox" value="0" v-model="equipment" /> 岩鞋
      <input type="checkbox" value="1" v-model="equipment" /> 主繩
      <input type="checkbox" value="2" v-model="equipment" /> 吊帶
      <input type="checkbox" value="3" v-model="equipment" /> 粉袋
    </div>

    <div>
    ticket: {{ ticket_type }} &nbsp;&nbsp;
      <input type="radio" value="0" v-model="ticket_type" /> 平日單次
      <input type="radio" value="1" v-model="ticket_type" /> 假日單次
      <input type="radio" value="2" v-model="ticket_type" /> 星光
      <input type="radio" value="3" v-model="ticket_type" /> 長期票
      <!-- <input type="radio" value="3" v-model="ticket_type" /> 月票
      <input type="radio" value="4" v-model="ticket_type" /> 季票
      <input type="radio" value="5" v-model="ticket_type" /> 半年票 -->
    </div>
   
    <div>price: {{ price_total }}</div>

    <hr />
    entry_record: {{ entry_record }}
    {{ islogout }}
    <button @click="Setlogout()"> logout </button>

  </div>
</template>

<script>
export default {
  beforeCreate() {
    console.log('entry beforeCreate');

    if (!localStorage.getItem('islogin')) {
      // 沒登入就踢回 staff
      console.log('islogin is false, back to staffView!!');
      this.$router.push('/staff');
    }
  },

  mounted() {
    this.datetime = new Date().toLocaleString('zh-TW', { hour12: false });

  },

  data() {
    return {
      x: this.$route.query.x,

      datetime: '',
      num_id: '0',
      phone: '123456789',
      equipment: [],
      ticket_type: null,
      entry_record: {
        datetime: '',
        ticket_type: null,
        equipment: [],
      },
      islogout: false,
    }
  },

  methods: {
    Setlogout() {
      localStorage.removeItem('islogin');
      this.$router.push('/staff');
    },
  },

  computed: {
    price_total() {
      const ticketPriceMap = {
        0: 250,
        1: 300,
        2: 200,
        3: 0,
      };

      const equipmentPriceMap = {
        0: 100, // 鞋子
        1: 50,  // 主繩
        2: 70,  // 吊帶
        3: 80,  // 粉袋
      };

      let total = ticketPriceMap[this.ticket_type] || 0;

      this.equipment.forEach(i => {
        total += equipmentPriceMap[i] || 0;
      });

      return total;
    },

  },

  watch: {

  },

}
</script>