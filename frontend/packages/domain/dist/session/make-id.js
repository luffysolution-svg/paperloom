// 本地乐观消息/会话 id 生成（纯函数，无宿主依赖）。
export function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
