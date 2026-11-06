export default {
  '*.{ts,tsx}': [
    // tsc -b 是全项目构建检查，不能接收单个文件列表
    () => 'tsc -b',
    'eslint',
  ],
}
