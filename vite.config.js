import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// [https://vite.dev/config/](https://vite.dev/config/)
export default defineConfig({
  plugins: [react()],
  base: './', // <--- QUAN TRỌNG: Thêm dòng này
})