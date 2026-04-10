import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// MacとLinuxでの日本語濁点(NFC/NFD)の差異を吸収するため、実際のディレクトリからファイル名を取得
const files = fs.readdirSync(__dirname);
const protoFile = files.find(f => f.includes('通信対戦') && f.endsWith('.html')) || '通信対戦プロト.html';

export default defineConfig({
  base: './', // Use relative paths for assets
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        onlineProto: resolve(__dirname, protoFile)
      }
    }
  }
});
