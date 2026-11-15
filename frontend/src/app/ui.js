/**
 * 从组件目录直接引入，避免 `import { ElMessage } from 'element-plus'`
 * 把整个组件库一起打进包里（根入口会把所有组件都算进来）。
 */
export { ElMessage } from 'element-plus/es/components/message/index'
export { ElMessageBox } from 'element-plus/es/components/message-box/index'
