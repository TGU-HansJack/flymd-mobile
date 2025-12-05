/*
  平台检测与适配层
  - 桌面：使用 Tauri 文件系统/对话框插件（路径模式）
  - Android（Capacitor）：使用 SAF 插件（URI 模式）
*/

import { Capacitor } from '@capacitor/core'
import Saf from './capacitor/saf'

export type Platform = 'windows' | 'linux' | 'macos' | 'android' | 'unknown'

// 文件引用：桌面使用路径，Android 使用 content:// URI
export type FileRef = {
  path: string
  name: string
  platform: Platform
}

let cachedPlatform: Platform | null = null

function hasTauriRuntime(): boolean {
  return typeof (window as any).__TAURI__ !== 'undefined'
}

function extractNameFromUri(uri: string, fallback: string): string {
  const fromSlash = uri.split(/[/\\]/).pop()
  if (fromSlash && fromSlash.length > 0) return fromSlash
  const fromQuery = uri.split('?')[0]?.split(/[/\\]/).pop()
  return fromQuery || fallback
}

// 获取当前平台
export async function getPlatform(): Promise<Platform> {
  if (cachedPlatform) return cachedPlatform

  if (Capacitor.isNativePlatform()) {
    const capPlatform = Capacitor.getPlatform()
    cachedPlatform = capPlatform === 'android' ? 'android' : 'unknown'
    return cachedPlatform
  }

  if (hasTauriRuntime()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      cachedPlatform = await invoke<Platform>('get_platform')
      return cachedPlatform
    } catch (err) {
      console.warn('[Platform] fallback to unknown platform:', err)
    }
  }

  cachedPlatform = 'unknown'
  return cachedPlatform
}

// 同步检查是否为移动端（包含 Capacitor 原生）
export function isMobile(): boolean {
  if (Capacitor.isNativePlatform()) return true
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// 打开文件对话框（跨平台）
export async function openFileDialog(): Promise<FileRef | null> {
  const platform = await getPlatform()

  if (platform === 'android') {
    try {
      const { uri, name } = await Saf.pickDocument()
      return { path: uri, name: name || extractNameFromUri(uri, 'document.md'), platform }
    } catch (e) {
      console.error('Android SAF pick document failed:', e)
      return null
    }
  }

  if (hasTauriRuntime()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const path = await open({
      multiple: false,
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (!path) return null
    const name = extractNameFromUri(path, 'document.md')
    return { path, name, platform }
  }

  // 浏览器兜底：使用 input[type=file]
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.txt,text/markdown,text/plain'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      resolve({ path: file.name, name: file.name, platform: 'unknown' })
    }
    input.click()
  })
}

// 保存文件对话框（跨平台）
export async function saveFileDialog(defaultName: string = 'untitled.md'): Promise<FileRef | null> {
  const platform = await getPlatform()

  if (platform === 'android') {
    try {
      const { uri } = await Saf.createDocument({
        filename: defaultName,
        mimeType: 'text/markdown'
      })
      return { path: uri, name: defaultName, platform }
    } catch (e) {
      console.error('Android SAF create document failed:', e)
      return null
    }
  }

  if (hasTauriRuntime()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (!path) return null
    const name = extractNameFromUri(path, defaultName)
    return { path, name, platform }
  }

  // 浏览器兜底：不支持本地保存路径，直接返回临时引用
  return { path: defaultName, name: defaultName, platform: 'unknown' }
}

// 读取文件（跨平台）
export async function readFile(ref: FileRef): Promise<string> {
  if (ref.platform === 'android') {
    const { content } = await Saf.readUri({ uri: ref.path })
    return content
  }

  if (hasTauriRuntime()) {
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    return await readTextFile(ref.path)
  }

  throw new Error('File read is not supported on this platform')
}

// 写入文件（跨平台）
export async function writeFile(ref: FileRef, content: string): Promise<void> {
  if (ref.platform === 'android') {
    await Saf.writeUri({ uri: ref.path, content })
    return
  }

  if (hasTauriRuntime()) {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    await writeTextFile(ref.path, content)
    return
  }

  throw new Error('File write is not supported on this platform')
}

// 持久化 URI 权限（Android 专用）
export async function persistUriPermission(uri: string): Promise<void> {
  const platform = await getPlatform()
  if (platform === 'android') {
    try {
      await Saf.persistPermission({ uri })
    } catch (e) {
      console.warn('Failed to persist URI permission:', e)
    }
  }
}

// 最近文件列表存储（Android 用 URI）
const RECENT_FILES_KEY = 'flymd_recent_files'

export function getRecentFiles(): FileRef[] {
  try {
    const json = localStorage.getItem(RECENT_FILES_KEY)
    if (!json) return []
    return JSON.parse(json) as FileRef[]
  } catch {
    return []
  }
}

export function addRecentFile(ref: FileRef): void {
  const recent = getRecentFiles()
  const filtered = recent.filter(f => f.path !== ref.path)
  filtered.unshift(ref)
  if (filtered.length > 20) filtered.length = 20
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(filtered))
}

export function clearRecentFiles(): void {
  localStorage.removeItem(RECENT_FILES_KEY)
}
