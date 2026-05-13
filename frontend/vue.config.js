const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // ⚠️ 必須加 target
        changeOrigin: true,               // 可避免 CORS 問題
        pathRewrite: { '^/api': '/api' }  // 可選，看你 API 路徑
      }
    }
  }
})

