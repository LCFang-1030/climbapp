<template>
  <div class="member-form-page">
    <div class="member-form-card">
      <div class="form-header">
        <div>
          <p class="eyebrow">Member Registration</p>
          <h2>會員註冊</h2>
          <p class="subtitle">請填寫會員基本資料，並於下方完成手寫簽名。</p>
        </div>
      </div>

      <div v-if="errorMsg" class="error-box">
        {{ errorMsg }}
      </div>

      <form class="form-sections" @submit.prevent="submit">
        <section
          v-for="(section, index) in sections"
          :key="section.title"
          class="form-section"
        >
          <div class="section-heading">
            <span class="section-kicker">0{{ index + 1 }}</span>
            <h3>{{ section.title }}</h3>
            <p>{{ section.description }}</p>
          </div>

          <div class="fields-grid">
            <div
              v-for="fieldKey in section.fields"
              :key="fieldKey"
              class="field-item"
              :class="{ full: isFullField(fieldKey) }"
            >
              <label :for="fieldKey">{{ labels[fieldKey] }}</label>

              <div v-if="fieldKey === 'gender'" class="radio-group">
                <label
                  v-for="option in genderOptions"
                  :key="option.value"
                  class="radio-option"
                >
                  <input
                    v-model="form.gender"
                    type="radio"
                    :value="option.value"
                  />
                  <span>{{ option.label }}</span>
                </label>
              </div>

              <textarea
                v-else-if="fieldKey === 'note'"
                :id="fieldKey"
                v-model.trim="form[fieldKey]"
                rows="4"
                :placeholder="placeholders[fieldKey]"
              />

              <input
                v-else
                :id="fieldKey"
                v-model.trim="form[fieldKey]"
                :type="getInputType(fieldKey)"
                :placeholder="placeholders[fieldKey]"
              />
            </div>
          </div>
        </section>

        <section class="form-section signature-section">
          <div class="section-heading">
            <span class="section-kicker">04</span>
            <h3>手寫簽名</h3>
            <p>請於簽名板內簽名，支援滑鼠與觸控操作。</p>
          </div>

          <div class="signature-panel">
            <div class="signature-toolbar">
              <span>簽名板</span>
              <button
                type="button"
                class="secondary-button"
                @click="clearSignature"
              >
                清除簽名
              </button>
            </div>

            <div class="signature-frame">
              <canvas
                ref="signaturePad"
                class="signature-canvas"
                @pointerdown="startSignature"
                @pointermove="drawSignature"
                @pointerup="endSignature"
                @pointerleave="endSignature"
                @pointercancel="endSignature"
              />
              <span v-if="!hasSignature" class="signature-hint">
                請在此處簽名
              </span>
            </div>
          </div>
        </section>

        <div class="form-actions">
          <p class="action-caption">確認資料與簽名完成後即可送出</p>
          <button type="submit" class="primary-button">送出申請</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  data() {
    return {
      errorMsg: '',
      hasSignature: false,
      isDrawing: false,
      lastPoint: null,
      labels: {
        name: '姓名',
        nationality: '國籍',
        idcard: '身分證 / 護照號碼',
        phone: '手機號碼',
        birthday: '生日',
        gender: '性別',
        contact_address: '通訊地址',
        email: '電子郵件',
        emergency_name: '緊急聯絡人',
        emergency_phone: '緊急聯絡人手機',
        emergency_address: '緊急聯絡人地址',
        emergency_relation: '關係',
        line_user_id: 'LINE ID',
        note: '備註',
      },
      placeholders: {
        name: '請輸入姓名',
        nationality: '例如：台灣',
        idcard: '請輸入身分證或護照號碼',
        phone: '請輸入聯絡手機',
        birthday: '',
        gender: '',
        contact_address: '請輸入通訊地址',
        email: 'name@example.com',
        emergency_name: '請輸入緊急聯絡人姓名',
        emergency_phone: '請輸入緊急聯絡人手機',
        emergency_address: '請輸入緊急聯絡人地址',
        emergency_relation: '例如：父母、配偶、朋友',
        line_user_id: '請輸入 LINE ID',
        note: '可填寫補充資訊',
      },
      genderOptions: [
        { value: 1, label: '男' },
        { value: 2, label: '女' },
        { value: 3, label: '其他' },
      ],
      sections: [
        {
          title: '基本資料',
          description: '建立會員檔案所需的基礎資訊。',
          fields: ['name', 'nationality', 'idcard', 'birthday', 'gender', 'phone'],
        },
        {
          title: '聯絡方式',
          description: '留下可聯繫的地址與線上資訊。',
          fields: ['contact_address', 'email', 'line_user_id', 'note'],
        },
        {
          title: '緊急聯絡人',
          description: '若現場需要協助時可立即聯繫。',
          fields: [
            'emergency_name',
            'emergency_relation',
            'emergency_phone',
            'emergency_address',
          ],
        },
      ],
      form: {
        name: '',
        nationality: '',
        idcard: '',
        phone: '',
        birthday: '',
        gender: '',
        contact_address: '',
        email: '',
        emergency_name: '',
        emergency_phone: '',
        emergency_address: '',
        emergency_relation: '',
        line_user_id: '',
        is_active: '1',
        note: '',
        signature_data: '',
      },
    }
  },

  mounted() {
    this.resizeSignatureCanvas()
    window.addEventListener('resize', this.resizeSignatureCanvas)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.resizeSignatureCanvas)
  },

  methods: {
    isFullField(fieldKey) {
      return ['contact_address', 'emergency_address', 'note'].includes(fieldKey)
    },

    getInputType(fieldKey) {
      if (fieldKey === 'birthday') return 'date'
      if (fieldKey === 'email') return 'email'
      if (fieldKey.includes('phone')) return 'tel'
      return 'text'
    },

    resizeSignatureCanvas() {
      const canvas = this.$refs.signaturePad
      if (!canvas) return

      const ratio = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()

      if (!width || !height) return

      const savedImage = this.hasSignature ? canvas.toDataURL('image/png') : ''

      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)

      const ctx = canvas.getContext('2d')
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(ratio, ratio)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2
      ctx.strokeStyle = '#111827'

      if (savedImage) {
        const image = new Image()
        image.onload = () => {
          ctx.clearRect(0, 0, width, height)
          ctx.drawImage(image, 0, 0, width, height)
        }
        image.src = savedImage
      } else {
        ctx.clearRect(0, 0, width, height)
      }
    },

    getCanvasPoint(event) {
      const canvas = this.$refs.signaturePad
      const rect = canvas.getBoundingClientRect()

      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    },

    startSignature(event) {
      const canvas = this.$refs.signaturePad
      if (!canvas) return

      canvas.setPointerCapture(event.pointerId)
      this.isDrawing = true
      this.lastPoint = this.getCanvasPoint(event)
      this.hasSignature = true
    },

    drawSignature(event) {
      if (!this.isDrawing) return

      const canvas = this.$refs.signaturePad
      const ctx = canvas.getContext('2d')
      const point = this.getCanvasPoint(event)

      ctx.beginPath()
      ctx.moveTo(this.lastPoint.x, this.lastPoint.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()

      this.lastPoint = point
    },

    endSignature(event) {
      const canvas = this.$refs.signaturePad
      if (!canvas || !this.isDrawing) return

      if (event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }

      this.isDrawing = false
      this.lastPoint = null
      this.form.signature_data = canvas.toDataURL('image/png')
    },

    clearSignature() {
      const canvas = this.$refs.signaturePad
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      this.hasSignature = false
      this.isDrawing = false
      this.lastPoint = null
      this.form.signature_data = ''
    },

    async submit() {
      try {
        const result = this.validateForm()

        if (!result.ok) {
          this.errorMsg = result.message
          return
        }

        this.errorMsg = ''

        if (!this.form.signature_data) {
          const canvas = this.$refs.signaturePad
          this.form.signature_data = canvas.toDataURL('image/png')
        }

        const res = await axios.post('/api/members', this.form)
        alert(`新增成功\n會員編號：${res.data.member_code}`)

        this.resetForm()
      } catch (err) {
        console.error('新增會員失敗', err)
        alert('新增會員失敗')
      }
    },

    validateForm() {
      const requiredFields = [
        'name',
        'nationality',
        'idcard',
        'phone',
        'birthday',
        'gender',
        'contact_address',
        'email',
        'emergency_name',
        'emergency_phone',
        'emergency_address',
        'emergency_relation',
        'line_user_id',
      ]

      for (const key of requiredFields) {
        const value = this.form[key]

        if (!value || value.toString().trim() === '') {
          return {
            ok: false,
            message: `請填寫 ${this.labels[key] || key}`,
          }
        }
      }

      const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRule.test(this.form.email)) {
        return {
          ok: false,
          message: 'Email 格式不正確',
        }
      }

      if (!this.hasSignature) {
        return {
          ok: false,
          message: '請完成手寫簽名',
        }
      }

      return { ok: true }
    },

    resetForm() {
      this.form = {
        name: '',
        nationality: '',
        idcard: '',
        phone: '',
        birthday: '',
        gender: '',
        contact_address: '',
        email: '',
        emergency_name: '',
        emergency_phone: '',
        emergency_address: '',
        emergency_relation: '',
        line_user_id: '',
        is_active: '1',
        note: '',
        signature_data: '',
      }
      this.clearSignature()
      this.errorMsg = ''
    },
  },
}
</script>

<style scoped>
.member-form-page {
  padding: 32px 16px 56px;
  background:
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.18), transparent 32%),
    linear-gradient(180deg, #f7faf7 0%, #edf4ef 100%);
  min-height: calc(100vh - 60px);
}

.member-form-card {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.form-header {
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #2f6b45;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.form-header h2 {
  margin: 0;
  color: #14231a;
  font-size: clamp(2rem, 4vw, 2.8rem);
}

.subtitle {
  margin: 10px 0 0;
  color: #4a5b52;
  font-size: 1rem;
}

.error-box {
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid #fecaca;
  border-radius: 14px;
  background: #fff1f2;
  color: #b91c1c;
  font-weight: 600;
}

.form-sections {
  display: grid;
  gap: 24px;
}

.form-section {
  padding: 24px;
  border: 1px solid #d9e6db;
  border-radius: 24px;
  background: #fcfefd;
}

.section-heading {
  margin-bottom: 18px;
}

.section-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 28px;
  margin-bottom: 10px;
  padding: 0 10px;
  border-radius: 999px;
  background: #e8f3eb;
  color: #2f6b45;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.section-heading h3 {
  margin: 0 0 8px;
  color: #14231a;
  font-size: 1.3rem;
}

.section-heading p {
  margin: 0;
  color: #617065;
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-item.full {
  grid-column: 1 / -1;
}

.field-item label {
  color: #24352a;
  font-weight: 600;
}

.field-item input,
.field-item textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #cddbcf;
  border-radius: 14px;
  background: #fff;
  color: #14231a;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.field-item input:focus,
.field-item textarea:focus {
  outline: none;
  border-color: #2f6b45;
  box-shadow: 0 0 0 4px rgba(47, 107, 69, 0.12);
}

.field-item textarea {
  resize: vertical;
  min-height: 110px;
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.radio-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid #cddbcf;
  border-radius: 999px;
  background: #fff;
  color: #24352a;
}

.signature-panel {
  display: grid;
  gap: 12px;
}

.signature-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #24352a;
  font-weight: 600;
}

.signature-frame {
  position: relative;
  min-height: 240px;
  border: 2px dashed #9db8a4;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 249, 245, 0.96));
  overflow: hidden;
}

.signature-canvas {
  width: 100%;
  height: 240px;
  display: block;
  touch-action: none;
  cursor: crosshair;
}

.signature-hint {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #78907f;
  pointer-events: none;
  font-weight: 600;
}

.form-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  justify-content: flex-end;
}

.action-caption {
  margin: 0;
  color: #617065;
  font-size: 0.92rem;
  text-align: right;
  justify-content: flex-end;
}

.primary-button,
.secondary-button {
  border: 0;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.primary-button {
  padding: 14px 24px;
  background: linear-gradient(135deg, #24553a, #3f8659);
  color: #fff;
  box-shadow: 0 14px 30px rgba(36, 85, 58, 0.22);
}

.secondary-button {
  padding: 10px 16px;
  background: #eef5f0;
  color: #24553a;
}

.primary-button:hover,
.secondary-button:hover {
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .member-form-page {
    padding: 0 0 110px;
    background:
      linear-gradient(180deg, #eef7f1 0%, #f7faf7 120px, #f7faf7 100%);
  }

  .member-form-card {
    padding: 0 0 24px;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .form-sections {
    gap: 14px;
  }

  .form-header {
    margin-bottom: 12px;
    padding: 22px 16px 18px;
    border-radius: 0 0 26px 26px;
    background: linear-gradient(135deg, #24553a, #3f8659);
  }

  .form-section {
    padding: 18px 16px;
    margin: 0 12px;
    border: 0;
    border-radius: 22px;
    background: #ffffff;
    box-shadow: 0 10px 28px rgba(20, 35, 26, 0.08);
  }

  .eyebrow {
    color: rgba(255, 255, 255, 0.78);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
  }

  .form-header h2 {
    color: #ffffff;
    font-size: 1.7rem;
    line-height: 1.2;
  }

  .subtitle {
    color: rgba(255, 255, 255, 0.82);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .section-heading p {
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .section-heading {
    margin-bottom: 14px;
  }

  .section-kicker {
    min-width: 40px;
    height: 24px;
    margin-bottom: 8px;
    padding: 0 8px;
    font-size: 0.72rem;
  }

  .section-heading h3 {
    font-size: 1.08rem;
  }

  .fields-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .field-item.full {
    grid-column: auto;
  }

  .field-item {
    gap: 7px;
  }

  .field-item label {
    font-size: 0.88rem;
    color: #597061;
  }

  .field-item input,
  .field-item textarea {
    min-height: 52px;
    padding: 14px 14px;
    font-size: 16px;
    border: 1px solid #d7e3da;
    border-radius: 16px;
    background: #f8fbf8;
  }

  .radio-group {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .radio-option {
    justify-content: flex-start;
    gap: 12px;
    min-height: 52px;
    padding: 0 14px;
    border-radius: 16px;
    font-size: 0.98rem;
    background: #f8fbf8;
  }

  .radio-option input {
    margin: 0;
  }

  .signature-panel {
    gap: 10px;
  }

  .signature-toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 0.95rem;
  }

  .signature-frame {
    min-height: 220px;
    margin-left: -4px;
    margin-right: -4px;
    border-width: 1px;
    border-style: solid;
    border-color: #d7e3da;
    border-radius: 18px;
  }

  .signature-canvas {
    height: 220px;
  }

  .signature-hint {
    padding: 0 16px;
    text-align: center;
    font-size: 0.92rem;
  }

  .form-actions {
    position: sticky;
    bottom: 0;
    z-index: 5;
    margin: 0;
    padding: 14px 12px calc(14px + env(safe-area-inset-bottom, 0px));
    background: linear-gradient(180deg, rgba(247, 250, 247, 0), rgba(247, 250, 247, 0.92) 24%, #f7faf7 100%);
    align-items: stretch;
    gap: 8px;
  }

  .action-caption {
    padding: 0 4px;
    font-size: 0.84rem;
    text-align: center;
  }

  .primary-button,
  .secondary-button {
    width: 100%;
    padding-left: 16px;
    padding-right: 16px;
  }

  .primary-button {
    padding-top: 15px;
    padding-bottom: 15px;
    border-radius: 18px;
    font-size: 1rem;
  }

  .secondary-button {
    width: auto;
    min-height: 44px;
    border-radius: 14px;
  }
}

@media (max-width: 480px) {
  .form-header {
    padding-left: 14px;
    padding-right: 14px;
  }

  .form-section {
    padding: 16px 12px;
  }

  .signature-frame {
    min-height: 190px;
  }

  .signature-canvas {
    height: 190px;
  }
}
</style>
