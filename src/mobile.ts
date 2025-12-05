/*
  移动端 UI 交互逻辑
  - FAB（浮动操作按钮）
  - 抽屉式文件库
  - 虚拟键盘适配
*/

import { isMobile } from './platform'

export function initMobileUI(): void {
  if (!isMobile()) return

  wireFab()
  setupDrawer()
  setupModeSegment()
  adaptVirtualKeyboard()
  disableDragDrop()
}

function wireFab(): void {
  const fabMain = document.getElementById('fabMain')
  const fabMenu = document.getElementById('fabMenu')

  if (fabMain && fabMenu) {
    let isOpen = false
    const close = () => {
      isOpen = false
      fabMain.classList.remove('open')
      fabMenu.classList.remove('open')
    }
    const toggle = (ev?: Event) => {
      if (ev) ev.stopPropagation()
      isOpen = !isOpen
      fabMain.classList.toggle('open', isOpen)
      fabMenu.classList.toggle('open', isOpen)
    }

    fabMain.addEventListener('click', toggle)
    fabMenu.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement | null)?.closest('[data-action]') as HTMLElement | null
      if (!btn) return
      const action = btn.dataset.action
      if (action) triggerFABAction(action)
      close()
    })
    document.addEventListener('click', (e) => {
      if (!isOpen) return
      if (fabMain.contains(e.target as Node) || fabMenu.contains(e.target as Node)) return
      close()
    })
    return
  }

  buildFallbackFab()
}

// 兜底：未找到预置 FAB 时动态创建一个轻量版
function buildFallbackFab(): void {
  const container = document.createElement('div')
  container.className = 'fab-container'
  container.innerHTML = `
    <button class="fab-main" id="fabMain" aria-label="操作菜单">
      <span>+</span>
    </button>
    <div class="fab-menu" id="fabMenu">
      <button class="fab-item" data-action="library" data-label="文件库" aria-label="打开文件库">LIB</button>
      <button class="fab-item" data-action="preview" data-label="预览" aria-label="切换预览">PRE</button>
      <button class="fab-item" data-action="save" data-label="保存" aria-label="保存文件">SAVE</button>
      <button class="fab-item" data-action="open" data-label="打开" aria-label="打开文件">OPEN</button>
      <button class="fab-item" data-action="new" data-label="新建" aria-label="新建文件">NEW</button>
    </div>
  `
  document.body.appendChild(container)

  wireFab()
}

// 触发 FAB 操作（通过自定义事件通知 main.ts）
function triggerFABAction(action: string): void {
  const event = new CustomEvent('fab-action', { detail: { action } })
  window.dispatchEvent(event)
}

function setupDrawer(): void {
  const overlay = ensureDrawerOverlay()
  if (overlay) overlay.addEventListener('click', () => closeDrawer())

  const closeBtn = document.getElementById('drawer-close')
  if (closeBtn) closeBtn.addEventListener('click', () => closeDrawer())

  moveLibraryIntoDrawer()
  syncDrawerWithLibrary()
}

function getDrawerPanel(): HTMLElement | null {
  return document.getElementById('fileTreePanel') || document.getElementById('library')
}

function ensureDrawerOverlay(): HTMLElement | null {
  let overlay = document.getElementById('drawerOverlay')
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = 'drawerOverlay'
    overlay.className = 'drawer-overlay'
    document.body.appendChild(overlay)
  }
  return overlay
}

// 打开抽屉（文件库）
export function openDrawer(): void {
  const panel = getDrawerPanel()
  const overlay = ensureDrawerOverlay()
  if (panel) {
    panel.classList.add('mobile-open')
    panel.classList.remove('hidden')
  }
  if (overlay) overlay.classList.add('show')
  document.body.style.overflow = 'hidden'
}

// 关闭抽屉
export function closeDrawer(): void {
  const panel = getDrawerPanel()
  const overlay = ensureDrawerOverlay()
  if (panel) {
    panel.classList.remove('mobile-open')
    panel.classList.add('hidden')
  }
  if (overlay) overlay.classList.remove('show')
  document.body.style.overflow = ''
}

// 将桌面端的 library 面板挂载到移动端抽屉
function moveLibraryIntoDrawer(): void {
  const panel = document.getElementById('fileTreePanel')
  const library = document.getElementById('library')

  if (panel && library && !panel.contains(library)) {
    panel.appendChild(library)
  }

  if (!library) {
    const observer = new MutationObserver(() => {
      const lib = document.getElementById('library')
      if (!lib) return
      observer.disconnect()
      moveLibraryIntoDrawer()
      syncDrawerWithLibrary()
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }
}

function syncDrawerWithLibrary(): void {
  const panel = getDrawerPanel()
  const overlay = document.getElementById('drawerOverlay')
  if (!panel || !overlay) return

  const sync = () => {
    const open = panel.classList.contains('mobile-open') || !panel.classList.contains('hidden')
    overlay.classList.toggle('show', open)
    document.body.style.overflow = open ? 'hidden' : ''
  }

  sync()
  const observer = new MutationObserver(sync)
  observer.observe(panel, { attributes: true, attributeFilter: ['class'] })
}

function setupModeSegment(): void {
  const seg = document.getElementById('mobile-mode-segment') as HTMLElement | null
  if (!seg) return

  const handleChange = (value?: string | null) => {
    const target = value === 'preview' ? 'preview' : 'edit'
    requestMode(target)
  }

  seg.addEventListener('ionChange', (ev: any) => handleChange(ev?.detail?.value))
  const buttons = Array.from(seg.querySelectorAll('ion-segment-button'))
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const val = (btn as any).value || btn.getAttribute('value')
      handleChange(val)
    })
  }

  syncSegmentWithPreview(seg)
}

function requestMode(target: 'edit' | 'preview'): void {
  const current = getCurrentMode()
  if (current === target) return
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true }))
}

function getCurrentMode(): 'edit' | 'preview' {
  const preview = document.getElementById('preview')
  if (preview && !preview.classList.contains('hidden')) return 'preview'
  return 'edit'
}

function syncSegmentWithPreview(seg: HTMLElement): void {
  const apply = () => setSegmentValue(seg, getCurrentMode())
  apply()
  const preview = document.getElementById('preview')
  if (!preview) return
  const observer = new MutationObserver(apply)
  observer.observe(preview, { attributes: true, attributeFilter: ['class'] })
}

function setSegmentValue(seg: HTMLElement, value: string): void {
  seg.setAttribute('value', value)
}

// 适配虚拟键盘（防遮挡）
function adaptVirtualKeyboard(): void {
  if ('visualViewport' in window) {
    const viewport = window.visualViewport!
    const editor = document.getElementById('editor')

    viewport.addEventListener('resize', () => {
      if (!editor) return

      const keyboardHeight = window.innerHeight - viewport.height

      if (keyboardHeight > 100) {
        editor.style.paddingBottom = `${keyboardHeight}px`
      } else {
        editor.style.paddingBottom = '0'
      }
    })
  }
}

// 禁用桌面端的拖拽打开文件
function disableDragDrop(): void {
  document.addEventListener('dragover', (e) => e.preventDefault(), true)
  document.addEventListener('drop', (e) => e.preventDefault(), true)
}

// 监听屏幕旋转
export function onOrientationChange(callback: () => void): void {
  window.addEventListener('orientationchange', callback)
  window.addEventListener('resize', callback)
}

// 请求全屏（移动端沉浸式体验）
export async function requestFullscreen(): Promise<void> {
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen()
    }
  } catch (err) {
    console.warn('Fullscreen request failed:', err)
  }
}

// 退出全屏
export async function exitFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen()
    }
  } catch (err) {
    console.warn('Exit fullscreen failed:', err)
  }
}

// 检测是否为平板设备（横屏且宽度较大）
export function isTablet(): boolean {
  return window.innerWidth >= 768 && window.innerWidth < 1200
}

// 震动反馈（Android 支持）
export function vibrate(pattern: number | number[] = 50): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}
