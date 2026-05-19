<template>
  <div class="form">
    <h2>報名表單</h2>

    <div v-for="(label, key) in labels" :key="key" class="form-grid">

      <label>{{ label }}</label>

      <!-- 👇 gender 特別處理 -->
      <div v-if="key === 'gender'">
        <label>
          <input type="radio" value="male" v-model="form.gender" />
          男性
        </label>

        <label>
          <input type="radio" value="female" v-model="form.gender" />
          女性
        </label>

        <label>
          <input type="radio" value="other" v-model="form.gender" />
          其他
        </label>
      </div>

      <!-- 👇 其他全部都是 input -->
      <input
        v-else
        type="text"
        v-model="form[key]"
      />

    </div>

    <button @click="submit">送出</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      labels: {
        name: "姓名",
        idcard: "身分證字號",
        phone: "電話",
        birthday: "生日",
        gender: "性別",
        address: "住址",
        email: "電子信箱",
        emergency_name: "緊急聯絡人",
        emergency_phone: "緊急聯絡人電話",
        emergency_relation: "關係",
        line_user_id: "Line"
      },

      form: {
        name: "",
        idcard: "",
        phone: "",
        birthday: "",
        gender: "",
        address: "",
        email: "",
        emergency_name: "",
        emergency_phone: "",
        emergency_relation: "",
        line_user_id: ""
      }
    };
  },

  methods: {
    submit() {
      console.log(this.form);
    }
  }
}
</script>

<style scoped>
.form {
  max-width: 600px;
  margin: auto;
  padding: 20px;
}

/* PC 排版 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.full {
  grid-column: span 2;
}

/* 📱 手機排版 */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .full {
    grid-column: span 1;
  }
}
</style>