/**
 * 从 localStorage 读取数据
 * @method getStorage
 * @param {string} key - 存储键名（必填）
 * @returns {unknown} 解析后的数据，若键不存在或解析失败则返回原始字符串或 null
 */
export function getStorage(key: string): unknown {
  if (!key) {
    console.error('[localStorage Error]: Key is required.');
    return null;
  }

  const raw = localStorage.getItem(key);
  if (raw === null) return null;

  try {
    return JSON.parse(raw);
  } catch {
    // 若存储的不是 JSON 格式，则直接返回原始字符串
    return raw;
  }
}

/**
 * 存储数据到 localStorage
 * @method setStorage
 * @param {string} key - 存储键名（必填）
 * @param {*} data - 要存储的数据（必填，若为 null 或 undefined 会报错）
 * @returns {boolean} 存储是否成功
 */
export function setStorage(key: string, data: unknown): boolean {
  if (!key || data == null) {
    console.error('[localStorage Error]: Key and data are required, and data cannot be null/undefined.');
    return false;
  }

  try {
    localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[localStorage Error]: Failed to set item:', error);
    return false;
  }
}

/**
 * 清除 localStorage 数据
 * @method clearStorage
 * @param {string} [key] - 可选，若提供则删除指定键，否则清空全部
 * @returns {void}
 */
export function clearStorage(key?: string): void {
  if (key) {
    localStorage.removeItem(key);
  } else {
    localStorage.clear();
  }
}