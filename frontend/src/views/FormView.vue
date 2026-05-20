<template>
  <div class="form">
    <h2>報名表單</h2>

    <div v-if="errorMsg" class="error-box">
      ⚠ {{ errorMsg }}
    </div>

    <div v-for="(label, key) in labels" :key="key" class="form-grid">

      <label>{{ label }}</label>

      <!-- 👇 gender 特別處理 -->
      <div v-if="key === 'gender'">
        <label>
          <input type="radio" :value="1" v-model="form.gender" />
          男性
        </label>

        <label>
          <input type="radio" :value="2" v-model="form.gender" />
          女性
        </label>

        <label>
          <input type="radio" :value="3" v-model="form.gender" />
          其他
        </label>
      </div>

      <div v-else-if="key === 'birthday'">
        <input
          type="date"
          v-model="form[key]"
        />
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
import axios from 'axios'

export default {
  data() {
    return {
      errorMsg: "",

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
        line_user_id: "Line",
        note: "備註",
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
        line_user_id: "",
        note: "",
      }
    };
  },

  methods: {
    async submit() {
      try {
        const result = this.validateForm();

        if (!result.ok) {
          this.errorMsg = result.message;
          return;
        } else {
          this.errorMsg = "";
        }

        console.log(this.form);

        const res = await axios.post('/api/members', this.form);
        alert(`新增成功\n會員編號：${res.data.member_code}`);

        console.log(res.data);
      } catch (err) {
        console.error('新增失敗', err);
        alert('新增失敗');
      }
    },

    validateForm() {
      const requiredFields = [
        'name',
        'idcard',
        'phone',
        'birthday',
        'gender',
        'address',
        'email',
        'emergency_name',
        'emergency_phone',
        'emergency_relation',
        'line_user_id'
      ];

      for (const key of requiredFields) {
        const value = this.form[key];

        if (!value || value.toString().trim() === '') {
          return {
            ok: false,
            message: `請填寫：${this.labels[key] || key}`
          };
        }
      }

      // Email
      const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRule.test(this.form.email)) {
        return {
          ok: false,
          message: 'Email 格式錯誤'
        };
      }

      // Phone（台灣手機）
      // const phoneRule = /^09\d{8}$/;
      // if (!phoneRule.test(this.form.phone)) {
      //   return {
      //     ok: false,
      //     message: '電話格式錯誤'
      //   };
      // }

      return {
        ok: true
      };
    }
  }
}
</script>

<style scoped>
.error-box {
  background: #ffe5e5;
  color: #d10000;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ffb3b3;
  border-radius: 6px;
  font-weight: bold;
}

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