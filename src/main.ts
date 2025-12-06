import './imePatch'
/*


    `

/*
  flymd 主入口（中文注释）
  - 极简编辑器：<textarea>
  - Ctrl+E 切换编辑/阅读
  - Ctrl+O 打开、Ctrl+S 保存、Ctrl+Shift+S 另存为、Ctrl+N 新建
  - 拖放文件打开
*/

// 性能标记：应用启动
performance.mark('flymd-app-start')
const _startTime = performance.now()

import './style.css'
import './mobile.css'  // 移动端样式
import '@fortawesome/fontawesome-free/css/all.min.css'
import '@ionic/core/css/ionic.bundle.css'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import { initThemeUI, applySavedTheme, updateChromeColorsForMode } from './theme'
import { t, fmtStatus, getLocalePref, setLocalePref, getLocale } from './i18n'
// KaTeX 样式改为按需动态加载（首次检测到公式时再加载）

// markdown-it 和 DOMPurify 改为按需动态 import，类型仅在编译期引用
import type MarkdownIt from 'markdown-it'
import type { TabDocument } from './tabs/types'
// WYSIWYG: 锚点插件与锚点同步（用于替换纯比例同步）
import { enableWysiwygV2, disableWysiwygV2, wysiwygV2ToggleBold, wysiwygV2ToggleItalic, wysiwygV2ApplyLink, wysiwygV2GetSelectedText, wysiwygV2FindNext, wysiwygV2FindPrev, wysiwygV2ReplaceOne as wysiwygV2ReplaceOneSel, wysiwygV2ReplaceAllInDoc, wysiwygV2ReplaceAll } from './wysiwyg/v2/index'

// Tauri 插件（v2）
// Tauri 对话框：使用 ask 提供原生确认，避免浏览器 confirm 在关闭事件中失效
import { open, save, ask } from '@tauri-apps/plugin-dialog'
import { showThreeButtonDialog } from './dialog'
import { readTextFile, writeTextFile, readDir, stat, readFile, mkdir  , rename, remove, writeFile, exists, copyFile } from '@tauri-apps/plugin-fs'
import { Store } from '@tauri-apps/plugin-store'
import { open as openFileHandle, BaseDirectory } from '@tauri-apps/plugin-fs'
// Tauri v2 插件 opener 的导出为 openUrl / openPath，不再是 open
import { openUrl, openPath } from '@tauri-apps/plugin-opener'
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { appLocalDataDir } from '@tauri-apps/api/path'
import fileTree, { FOLDER_ICONS, folderIconModal } from './fileTree'
import { uploadImageToS3R2, type UploaderConfig } from './uploader/s3'
import { transcodeToWebpIfNeeded } from './utils/image'
// 方案A：多库管理（统一 libraries/activeLibraryId）
import { getLibraries, getActiveLibraryId, getActiveLibraryRoot, setActiveLibraryId as setActiveLibId, upsertLibrary, removeLibrary as removeLib, renameLibrary as renameLib } from './utils/library'
import appIconUrl from '../Flymdnew.png?url'
import goodImgUrl from '../good.png?url'
import { decorateCodeBlocks } from './decorate'
import pkg from '../package.json'
defineCustomElements(window)
// htmlToMarkdown 改为按需动态导入（仅在粘贴 HTML 时使用）
import { initWebdavSync, openWebdavSyncDialog, getWebdavSyncConfig, isWebdavConfiguredForActiveLibrary, syncNow as webdavSyncNow, setOnSyncComplete, openSyncLog as webdavOpenSyncLog } from './extensions/webdavSync'
// 平台适配层（Android 支持）
import { initPlatformIntegration, mobileSaveFile, isMobilePlatform } from './platform-integration'
import { createImageUploader } from './core/imageUpload'
import { createPluginMarket, compareInstallableItems, FALLBACK_INSTALLABLES } from './extensions/market'
import type { InstallableItem } from './extensions/market'
import { listDirOnce, type LibEntry } from './core/libraryFs'
import { normSep, isInside, ensureDir, moveFileSafe, renameFileSafe } from './core/fsSafe'
import { getLibrarySort, setLibrarySort, type LibSortMode } from './core/librarySort'
import { createCustomTitleBar, removeCustomTitleBar, applyWindowDecorationsCore } from './modes/focusMode'
import {
  type StickyNoteColor,
  type StickyNoteReminderMap,
  type StickyNotePrefs,
  STICKY_NOTE_PREFS_FILE,
  STICKY_NOTE_DEFAULT_OPACITY,
  STICKY_NOTE_DEFAULT_COLOR,
  STICKY_NOTE_VALID_COLORS,
  loadStickyNotePrefsCore,
  saveStickyNotePrefsCore,
  type StickyNotePrefsDeps,
  applyStickyNoteAppearance,
  type StickyNoteModeDeps,
  type StickyNoteModeResult,
  type StickyNoteWindowDeps,
  enterStickyNoteModeCore,
  restoreWindowStateBeforeStickyCore,
} from './modes/stickyNote'
import {
  ensurePluginsDir,
  parseRepoInput,
  compareVersions,
  getHttpClient,
  fetchTextSmart,
  fetchBinarySmart,
  resolvePluginManifestUrl,
  getPluginUpdateStates,
  loadInstalledPlugins,
  saveInstalledPlugins,
  installPluginFromGitCore,
  installPluginFromLocalCore,
  type PluginManifest,
  type InstalledPlugin,
  type PluginUpdateState,
} from './extensions/runtime'
import {
  removeContextMenu,
  showContextMenu,
  type ContextMenuContext,
  type ContextMenuItemConfig,
  type PluginContextMenuItem,
} from './ui/contextMenus'
// 应用版本号（用于窗口标题/关于弹窗）
const APP_VERSION: string = (pkg as any)?.version ?? '0.0.0'

// UI 缩放与预览宽度（已拆分到 core/uiZoom.ts）
import { getUiZoom, setUiZoom, applyUiZoom, zoomIn, zoomOut, zoomReset, getPreviewWidth, setPreviewWidth, applyPreviewWidth, resetPreviewWidth, PREVIEW_WIDTH_STEP } from './core/uiZoom'

// 滚动条自动隐藏
import { initAutoHideScrollbar, rescanScrollContainers } from './core/scrollbar'

type Mode = 'edit' | 'preview'
// 最近文件最多条数
const RECENT_MAX = 5

// 渲染器（延迟初始化，首次进入预览时创建）
let md: MarkdownIt | null = null
let sanitizeHtml: ((html: string, cfg?: any) => string) | null = null
let katexCssLoaded = false
let hljsLoaded = false
let mermaidReady = false

// 获取 mermaid 初始化配置（根据夜间模式自动选择主题）
function getMermaidConfig(): any {
  const isDark = document.body.classList.contains('dark-mode') ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: isDark ? 'dark' : 'default',
    logLevel: 'fatal' as any,
    fontSize: 16 as any,
    flowchart: { useMaxWidth: true } as any,
    themeVariables: isDark ? {
      fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif',
      fontSize: '16px',
      // 夜间模式配色
      primaryColor: '#3c3c3c',
      primaryTextColor: '#d4d4d4',
      primaryBorderColor: '#505050',
      lineColor: '#808080',
      secondaryColor: '#252526',
      tertiaryColor: '#1e1e1e',
      background: '#1e1e1e',
      mainBkg: '#252526',
      secondBkg: '#1e1e1e',
      border1: '#505050',
      border2: '#3c3c3c',
      arrowheadColor: '#d4d4d4',
      textColor: '#d4d4d4',
      nodeTextColor: '#d4d4d4',
    } : {
      fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif',
      fontSize: '16px'
    }
  }
}

// Mermaid 工具（已拆分到 core/mermaid.ts）
import { isMermaidCacheDisabled, getMermaidScale, setMermaidScaleClamped, adjustExistingMermaidSvgsForScale, exportMermaidViaDialog, createMermaidToolsFor, mermaidSvgCache, mermaidSvgCacheVersion, getCachedMermaidSvg, cacheMermaidSvg, normalizeMermaidSvg, postAttachMermaidSvgAdjust, invalidateMermaidSvgCache, MERMAID_SCALE_MIN, MERMAID_SCALE_MAX, MERMAID_SCALE_STEP } from './core/mermaid'
// 当前 PDF 预览 URL（iframe 使用），用于页内跳转
let _currentPdfSrcUrl: string | null = null
// 大纲缓存（Markdown/WYSIWYG）：避免重复重建 DOM
let _outlineLastSignature = ''
// PDF 目录缓存：按文件路径缓存解析结果与 mtime，用于自动失效
const _pdfOutlineCache = new Map<string, { mtime: number; items: Array<{ level: number; title: string; page: number }> }>()
// 所见模式：用于滚动同步的“源位锚点”表
// 旧所见模式已移除：不再维护锚点表

function hashMermaidCode(code: string): string {
  try {
    // WYSIWYG 情况下，在编辑未闭合的 ```mermaid 围栏内时，跳过 Mermaid 渲染以避免每次输入导致整屏重排/闪烁
    const _skipMermaid = (() => {
      if (!wysiwyg) return false
      try {
        const text = editor.value
        const caret = editor.selectionStart >>> 0
        const lines = text.split('\n')
        const caretLine = (() => { try { return text.slice(0, caret).split('\n').length - 1 } catch { return -1 } })()
        let inside = false
        let fenceCh = ''
        let fenceLang = ''
        for (let i = 0; i <= Math.min(Math.max(0, caretLine), lines.length - 1); i++) {
          const ln = lines[i]
          const m = ln.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
          if (m) {
            const ch = m[1][0]
            if (!inside) {
              inside = true
              fenceCh = ch
              fenceLang = (m[2] || '').trim().split(/\s+/)[0]?.toLowerCase() || ''
            } else if (ch === fenceCh) {
              inside = false
              fenceCh = ''
              fenceLang = ''
            }
          }
        }
        return !!(inside && fenceLang === 'mermaid')
      } catch { return false }
    })()
    if (_skipMermaid) { throw new Error('SKIP_MERMAID_RENDER_IN_WYSIWYG') }
    if (!code) return 'mmd-empty'
    let hash = 2166136261 >>> 0 // FNV-1a 32 位初始值
    for (let i = 0; i < code.length; i++) {
      hash ^= code.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
      function handleBeforeInput(ev: any) {
      // 记忆上次值与选区（用于 input 兜底计算差异）
      function rememberPrev() {
        try {
          const ta = getEditor(); if (!ta) return
          const w = window as any
          w._edPrevVal = String(ta.value || '')
          w._edPrevSelS = ta.selectionStart >>> 0
          w._edPrevSelE = ta.selectionEnd >>> 0
        } catch {}
      }

      function handleInput(ev: any) {
        try {
          const ta = getEditor(); if (!ta) return
          if (ev.target !== ta) return
          if (!isEditMode()) return
          const w = window as any
          const prev = String(w._edPrevVal ?? '')
          const ps = (w._edPrevSelS >>> 0) || 0
          const pe = (w._edPrevSelE >>> 0) || ps
          const cur = String(ta.value || '')
          const curS = ta.selectionStart >>> 0
          // 仅处理插入类（粘贴/输入/合成结束），删除等跳过
          if (cur.length >= prev.length) {
            const insertedLen = Math.max(0, curS - ps)
            const hadSel = (pe > ps)
            const inserted = (insertedLen > 0) ? cur.slice(ps, ps + insertedLen) : ''
            // 三连反引号围栏
            if (inserted === '```') {
              const before = prev.slice(0, ps)
              const mid = hadSel ? prev.slice(ps, pe) : ''
              const after = prev.slice(pe)
              const content = hadSel ? ('\n' + mid + '\n') : ('\n\n')
              ta.value = before + '```' + content + '```' + after
              const caret = hadSel ? (ps + content.length + 3) : (ps + 4)
              ta.selectionStart = ta.selectionEnd = caret
              try { dirty = true; refreshTitle(); refreshStatus() } catch {}
              if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
              rememberPrev();
              return
            }
            // 单个左标记：自动/环绕补全（含全角）
            if (inserted.length === 1) {
              const close = (openClose as any)[inserted]
              if (close) {
                if (hadSel) {
                  const before = prev.slice(0, ps)
                  const mid = prev.slice(ps, pe)
                  const after = prev.slice(pe)
                  ta.value = before + inserted + mid + close + after
                  ta.selectionStart = ps + 1; ta.selectionEnd = ps + 1 + mid.length
                } else {
                  // 光标插入：在当前结果右侧补一个闭合
                  const before = cur.slice(0, curS)
                  const after = cur.slice(curS)
                  ta.value = before + close + after
                  ta.selectionStart = ta.selectionEnd = curS
                }
                try { dirty = true; refreshTitle(); refreshStatus() } catch {}
                if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
                rememberPrev();
                return
              }
              // 右标记跳过
              if ((closers as any).has && (closers as any).has(inserted) && !hadSel) {
                const rightChar = inserted
                if (prev.slice(ps, ps + 1) === rightChar) {
                  ta.selectionStart = ta.selectionEnd = ps + 1
                  rememberPrev();
                  return
                }
              }
            }
          }
          // 默认：更新 prev 快照
          rememberPrev()
        } catch {}
      }

      // 初始快照：获取一次
      try { rememberPrev() } catch {}
        try {
          const ta = getEditor(); if (!ta) return
          if (ev.target !== ta) return
          if (!isEditMode()) return
          const it = (ev as any).inputType || ''
          if (it !== 'insertText' && it !== 'insertCompositionText') return
          const data = (ev as any).data as string || ''
          if (!data) return
          const val = String(ta.value || '')
          const s = ta.selectionStart >>> 0
          const epos = ta.selectionEnd >>> 0

          // 组合输入：三连反引号``` 直接围栏
          if (data === '```') {
            ev.preventDefault()
            const before = val.slice(0, s)
            const mid = val.slice(s, epos)
            const after = val.slice(epos)
            const content = (epos > s ? ('\n' + mid + '\n') : ('\n\n'))
            ta.value = before + '```' + content + '```' + after
            const caret = (epos > s) ? (s + content.length + 3) : (s + 4)
            ta.selectionStart = ta.selectionEnd = caret
            try { dirty = true; refreshTitle(); refreshStatus() } catch {}
            if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
            return
          }

          // 组合输入：跳过右侧闭合
          if (data.length === 1 && (closers as any).has && (closers as any).has(data) && s === epos && val[s] === data) {
            ev.preventDefault(); ta.selectionStart = ta.selectionEnd = s + 1; return
          }

          // 组合输入：通用成对/环绕（含全角左标记）
          if (data.length === 1) {
            const close = (openClose as any)[data]
            if (close) {
              ev.preventDefault()
              const before = val.slice(0, s)
              const mid = val.slice(s, epos)
              const after = val.slice(epos)
              if (epos > s) {
                ta.value = before + data + mid + close + after
                ta.selectionStart = s + 1; ta.selectionEnd = s + 1 + mid.length
              } else {
                ta.value = before + data + close + after
                ta.selectionStart = ta.selectionEnd = s + 1
              }
              try { dirty = true; refreshTitle(); refreshStatus() } catch {}
              if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
              return
            }
          }
        } catch {}
      }

    }
    return `mmd-${(hash >>> 0).toString(36)}`
  } catch {
    return 'mmd-fallback'
  }
}

// Mermaid 全局 API 注册（依赖模块级变量，保留在 main.ts）
try {
  if (typeof window !== 'undefined') {
    ;(window as any).invalidateMermaidSvgCache = invalidateMermaidSvgCache
    ;(window as any).isMermaidCacheDisabled = () => { try { return isMermaidCacheDisabled() } catch { return true } }
    ;(window as any).setDisableMermaidCache = (v: boolean) => {
      try { localStorage.setItem('flymd:disableMermaidCache', v ? '1' : '0') } catch {}
      try { invalidateMermaidSvgCache('toggle disable mermaid cache') } catch {}
      try { if (mode === 'preview') { void renderPreview() } else if (wysiwyg) { scheduleWysiwygRender() } } catch {}
    }
    ;(window as any).setMermaidScale = (n: number) => {
      try { const v = (!Number.isFinite(n) || n <= 0) ? '1' : String(n); localStorage.setItem('flymd:mermaidScale', v) } catch {}
      try { adjustExistingMermaidSvgsForScale() } catch {}
    }
    try { if (isMermaidCacheDisabled()) invalidateMermaidSvgCache('startup: cache disabled') } catch {}

    // 暴露创建工具条与导出能力给所见模式插件使用
    try { ;(window as any).createMermaidToolsFor = (svg: SVGElement) => createMermaidToolsFor(svg) } catch {}
    try { ;(window as any).exportMermaidFromElement = (svg: SVGElement, fmt?: 'svg'|'png') => { if (!svg) return; if (fmt) { if (fmt === 'svg') { void (async()=>{ const clone = svg.cloneNode(true) as SVGElement; if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns','http://www.w3.org/2000/svg'); const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` + new XMLSerializer().serializeToString(clone); const p = await save({ defaultPath: 'mermaid.svg', filters: [{name:'SVG',extensions:['svg']}] as any } as any); if (p) await writeTextFile(p, xml) })(); } else { void exportMermaidViaDialog(svg) } } else { void exportMermaidViaDialog(svg) } } } catch {}

    // 动态注入一条 CSS，确保 Mermaid SVG 在所有环境中自适应父容器宽度
    try {
      const id = 'flymd-mermaid-responsive-style'
      if (!document.getElementById(id)) {
        const style = document.createElement('style')
        style.id = id
        style.textContent = [
          '.preview-body svg[data-mmd-hash],',
          '.preview-body .mermaid svg,',
          '.preview-body svg { display:block; max-width:100%; height:auto; }'
        ].join('\n')
        document.head.appendChild(style)
      }
    } catch {}
  }
} catch {}

// 应用状态
let fileTreeReady = false
let mode: Mode = 'edit'
// 所见即所得开关（Overlay 模式）
let wysiwyg = false
let wysiwygV2Active = false
// 模式切换时的滚动位置缓存（百分比 0-1）
let lastScrollPercent = 0
let _wysiwygRaf = 0
// 仅在按回车时触发渲染（可选开关，默认关闭）
let wysiwygEnterToRenderOnly = false
// 所见模式：针对行内 $ 与 代码围栏 ``` 的“闭合后需回车再渲染”延迟标记
let wysiwygHoldInlineDollarUntilEnter = false
let wysiwygHoldFenceUntilEnter = false

function shouldDeferWysiwygRender(): boolean {
  return !!(wysiwygEnterToRenderOnly || wysiwygHoldInlineDollarUntilEnter || wysiwygHoldFenceUntilEnter)
}
// 当前行高亮元素
let wysiwygLineEl: HTMLDivElement | null = null
// 点状光标元素与度量缓存
let wysiwygCaretEl: HTMLDivElement | null = null
let wysiwygStatusEl: HTMLDivElement | null = null
let _wysiwygCaretLineIndex = 0
let _wysiwygCaretVisualColumn = 0
let _caretCharWidth = 0
let _caretFontKey = ''
// 点状“光标”闪烁控制（仅所见模式预览中的点）
let _dotBlinkTimer: number | null = null
let _dotBlinkOn = true

function startDotBlink() {
  try {
    if (_dotBlinkTimer != null) return
    _dotBlinkOn = true
    _dotBlinkTimer = window.setInterval(() => {
      _dotBlinkOn = !_dotBlinkOn
      // 闪烁由 CSS 动画驱动；此计时器仅用于保持状态，可按需扩展
    }, 800)
  } catch {}
}

function stopDotBlink() {
  try {
    if (_dotBlinkTimer != null) { clearInterval(_dotBlinkTimer); _dotBlinkTimer = null }
    _dotBlinkOn = false
  } catch {}
}
// 库侧栏选中状态
let selectedFolderPath: string | null = null
let selectedNodeEl: HTMLElement | null = null
// 库面板停靠状态：true=固定在左侧并收缩编辑区；false=覆盖式抽屉
  let libraryDocked = true
  type LibrarySide = 'left' | 'right'
  let librarySide: LibrarySide = 'left'
  let libraryVisible = true
  // 大纲布局模式：embedded=嵌入库侧栏；left=库 | 大纲 | 编辑区；right=库 | 编辑区 | 大纲
  type OutlineLayout = 'embedded' | 'left' | 'right'
  let outlineLayout: OutlineLayout = 'embedded'
// 非固定模式下：离开侧栏后自动隐藏的延迟定时器
let _libLeaveTimer: number | null = null
// 专注模式：隐藏顶栏，鼠标移到顶部边缘时显示
let focusMode = false
let _focusTitlebarShowTimer: number | null = null
let _focusTitlebarHideTimer: number | null = null
// 紧凑标题栏：隐藏原生窗口标题栏，在应用内使用自绘控制按钮
let compactTitlebar = false
// 便签模式：专注+阅读+无侧栏，顶部显示锁定/置顶按钮
let stickyNoteMode = false
let stickyNoteLocked = false   // 窗口位置锁定（禁止拖动）
let stickyNoteOnTop = false    // 窗口置顶
let stickyTodoAutoPreview = false // 便签快速待办编辑后是否需要自动返回阅读模式
let stickyNoteOpacity = STICKY_NOTE_DEFAULT_OPACITY   // 窗口透明度
let stickyNoteColor: StickyNoteColor = STICKY_NOTE_DEFAULT_COLOR  // 便签背景色
let stickyNoteReminders: StickyNoteReminderMap = {}   // 便签待办提醒状态（按文件+文本标记）
// 边缘唤醒热区元素（非固定且隐藏时显示，鼠标靠近自动展开库）
let _libEdgeEl: HTMLDivElement | null = null
let _libFloatToggleEl: HTMLButtonElement | null = null
let _settingsOverlayEl: HTMLDivElement | null = null
let _settingsPluginListEl: HTMLDivElement | null = null
let _librarySwipeBound = false
function selectLibraryNode(el: HTMLElement | null, path: string | null, isDir: boolean) {
  try {
    if (selectedNodeEl) selectedNodeEl.classList.remove('selected')
    selectedNodeEl = el as any
    if (selectedNodeEl) selectedNodeEl.classList.add('selected')
    selectedFolderPath = (isDir && path) ? path : selectedFolderPath
  } catch {}
}

let currentFilePath: string | null = null
// YAML Front Matter 当前缓存，仅用于渲染/所见模式，源码始终保留完整文本
let currentFrontMatter: string | null = null
// 全局“未保存更改”标记（供关闭时提示与扩展查询）
let dirty = false // 是否有未保存更改（此处需加分号，避免下一行以括号开头被解析为对 false 的函数调用）
// 暴露一个轻量只读查询函数，避免直接访问变量引起耦合
;(window as any).flymdIsDirty = () => dirty
// 最近一次粘贴组合键：normal=Ctrl+V, plain=Ctrl+Shift+V；用于在 paste 事件中区分行为
let _lastPasteCombo: 'normal' | 'plain' | null = null

// 配置存储（使用 tauri store）
let store: Store | null = null
let uploaderEnabledSnapshot = false
// 配置备份（已拆分到 core/configBackup.ts）
import { CONFIG_BACKUP_VERSION, PLUGINS_DIR, SETTINGS_FILE_NAME, BACKUP_PREFIX_APPDATA, BACKUP_PREFIX_APPLOCAL, APP_LOCAL_EXCLUDE_ROOTS, normalizeBackupPath, bytesToBase64, base64ToBytes, getSettingsBaseDir, collectConfigBackupFiles, resolveBackupPath, ensureParentDirsForBackup, clearDirectory, clearAppLocalDataForRestore, type ConfigBackupEntry, type ConfigBackupPayload, type BackupPathInfo } from './core/configBackup'
import { load as yamlLoad } from 'js-yaml'
// 便携模式（已拆分到 core/portable.ts）
import { PORTABLE_BACKUP_FILENAME, getPortableBaseDir, getPortableDirAbsolute, joinPortableFile, exportPortableBackupSilent, readPortableBackupPayload } from './core/portable'

const CONFIG_BACKUP_FILE_EXT = 'flymdconfig'

async function isPortableModeEnabled(): Promise<boolean> {
  try {
    if (!store) return false
    const raw = await store.get('portableMode')
    return !!(raw as any)?.enabled
  } catch {
    return false
  }
}

async function setPortableModeEnabled(next: boolean): Promise<void> {
  try {
    if (!store) return
    const raw = ((await store.get('portableMode')) as any) || {}
    raw.enabled = next
    await store.set('portableMode', raw)
    await store.save()
  } catch {}
}

// 便携模式：导入备份（依赖 store，保留在 main.ts）
async function importPortableBackupSilent(): Promise<boolean> {
  try {
    const payload = await readPortableBackupPayload()
    if (!payload) return false
    await restoreConfigFromPayload(payload)
    return true
  } catch (err) {
    console.warn('[Portable] 导入失败', err)
    return false
  }
}

async function maybeAutoImportPortableBackup(): Promise<void> {
  try {
    if (!(await isPortableModeEnabled())) return
    await importPortableBackupSilent()
  } catch (err) {
    console.warn('[Portable] 自动导入异常', err)
  }
}

async function maybeAutoExportPortableBackup(): Promise<void> {
  try {
    if (!(await isPortableModeEnabled())) return
    await exportPortableBackupSilent()
  } catch (err) {
    console.warn('[Portable] 自动导出异常', err)
  }
}

// 恢复配置（依赖 store，保留在 main.ts）
async function restoreConfigFromPayload(payload: ConfigBackupPayload): Promise<{ settings: boolean; pluginFiles: number }> {
  const files = Array.isArray(payload?.files) ? payload.files : []
  if (!files.length) throw new Error('备份文件为空')
  try {
    if (store) {
      await store.close()
    }
  } catch {}
  store = null
  let pluginFiles = 0
  let hasSettings = false
  let hasAppDataScope = false
  let hasAppLocalScope = false
  for (const entry of files) {
    const normalized = normalizeBackupPath(entry?.path || '')
    if (!normalized) continue
    if (normalized === SETTINGS_FILE_NAME || normalized.startsWith(BACKUP_PREFIX_APPDATA + '/')) hasSettings = true
    if (normalized.startsWith(`${BACKUP_PREFIX_APPLOCAL}/${PLUGINS_DIR}`) || normalized.startsWith('flymd/')) pluginFiles++
    if (normalized.startsWith(BACKUP_PREFIX_APPDATA + '/')) hasAppDataScope = true
    if (normalized.startsWith(BACKUP_PREFIX_APPLOCAL + '/')) hasAppLocalScope = true
  }
  if (hasAppDataScope) {
    await clearDirectory(getSettingsBaseDir(), '')
  }
  if (hasAppLocalScope) {
    await clearAppLocalDataForRestore()
  } else if (pluginFiles > 0) {
    await removeDirRecursive(PLUGINS_DIR)
  }
  for (const entry of files) {
    const info = resolveBackupPath(entry?.path || '')
    if (!info) continue
    const data = base64ToBytes(entry?.data || '')
    await ensureParentDirsForBackup(info)
    await writeFile(info.relPath as any, data, { baseDir: info.baseDir } as any)
  }
  try {
    store = await Store.load(SETTINGS_FILE_NAME)
    await store?.save()
  } catch {}
  return { settings: hasSettings, pluginFiles }
}
let _appLocalDataDirCached: string | null | undefined
async function getAppLocalDataDirCached(): Promise<string | null> {
  if (typeof _appLocalDataDirCached !== 'undefined') return _appLocalDataDirCached
  try {
    const mod: any = await import('@tauri-apps/api/path')
    if (mod && typeof mod.appLocalDataDir === 'function') {
      const dir = await mod.appLocalDataDir()
      if (dir && typeof dir === 'string') {
        _appLocalDataDirCached = dir.replace(/[\\/]+$/, '')
        return _appLocalDataDirCached
      }
    }
  } catch {}
  _appLocalDataDirCached = null
  return _appLocalDataDirCached
}
async function resolvePluginInstallAbsolute(dir: string): Promise<string | null> {
  try {
    const base = await getAppLocalDataDirCached()
    if (!base) return null
    const sep = base.includes('\\') ? '\\' : '/'
    const cleaned = String(dir || '').replace(/^[/\\]+/, '').replace(/[\\/]+/g, '/')
    if (!cleaned) return base
    return base + sep + cleaned.replace(/\//g, sep)
  } catch { return null }
}
function toPluginAssetUrl(absDir: string | null, relPath: string): string {
  try {
    if (!absDir) return ''
    let rel = String(relPath || '').trim()
    if (!rel) return ''
    rel = rel.replace(/^[/\\]+/, '').replace(/[\\/]+/g, '/')
    const sep = absDir.includes('\\') ? '\\' : '/'
    const abs = absDir + sep + rel.replace(/\//g, sep)
    return typeof convertFileSrc === 'function' ? convertFileSrc(abs) : abs
  } catch { return '' }
}
const builtinPlugins: InstalledPlugin[] = [
  { id: 'uploader-s3', name: '图床 (S3/R2)', version: 'builtin', enabled: undefined, dir: '', main: '', builtin: true, description: '粘贴/拖拽图片自动上传，支持 S3/R2 直连，使用设置中的凭据。' },
  { id: 'webdav-sync', name: 'WebDAV 同步', version: 'builtin', enabled: undefined, dir: '', main: '', builtin: true, description: 'F5/启动/关闭前同步，基于修改时间覆盖' }
]
const activePlugins = new Map<string, any>() // id -> module
const pluginMenuAdded = new Map<string, boolean>() // 限制每个插件仅添加一个菜单项
// 插件 API 注册表：namespace -> { pluginId, api }
type PluginAPIRecord = { pluginId: string; api: any }
const pluginAPIRegistry = new Map<string, PluginAPIRecord>()
let _extOverlayEl: HTMLDivElement | null = null
let _extListHost: HTMLDivElement | null = null
let _extInstallInput: HTMLInputElement | null = null
let _extMarketSearchText = ''
let _extLastMarketItems: InstallableItem[] = []
let _extUpdatesOnly = false  // 是否仅显示可更新扩展（已安装区块过滤）
let _extGlobalOrder: Record<string, number> = {} // 扩展卡片的统一排序顺序（与安装状态无关）
let _extOverlayRenderedOnce = false  // 扩展面板是否已完成过首次渲染（用于避免每次打开都全量刷新）
let _extApplyMarketFilter: ((itemsOverride?: InstallableItem[] | null) => Promise<void>) | null = null  // 背景静默更新市场列表时复用的过滤函数

// 插件菜单管理（统一的"插件"下拉菜单）
type PluginMenuItem = { pluginId: string; label: string; onClick?: () => void; children?: any[] }
const pluginsMenuItems = new Map<string, PluginMenuItem>() // 收纳到"插件"菜单的项目
let _pluginsMenuBtn: HTMLDivElement | null = null // "插件"菜单按钮

// 底部抽屉/导航
let _tabManagerRef: {
  getTabs?: () => readonly TabDocument[]
  getActiveTabId?: () => string | null
  switchToTab?: (id: string) => Promise<void>
  closeTab?: (id: string) => Promise<boolean>
  createNewTab?: () => TabDocument
  addEventListener?: (fn: any) => (() => void) | void
} | null = null
let _tabEventsUnsub: (() => void) | null = null
let _tabSheetOverlay: HTMLDivElement | null = null
let _commandsSheetOverlay: HTMLDivElement | null = null
let _bottomBarEl: HTMLDivElement | null = null

// 右键菜单管理
const pluginContextMenuItems: PluginContextMenuItem[] = [] // 所有插件注册的右键菜单项

// 协同/插件增强：选区变化监听与段落装饰（最小侵入）
type PluginSelectionHandler = (sel: { start: number; end: number; text: string }) => void
const pluginSelectionHandlers = new Map<string, PluginSelectionHandler>()

// 插件 Panel 布局管理：侧边/底部 Panel 统一推挤编辑区
type PluginDockSide = 'left' | 'right' | 'bottom'
type PluginDockPanelState = { pluginId: string; panelId: string; side: PluginDockSide; size: number; visible: boolean }
type PluginDockPanelHandle = {
  setVisible: (visible: boolean) => void
  setSide: (side: PluginDockSide) => void
  setSize: (size: number) => void
  update: (opt: { side?: PluginDockSide; size?: number; visible?: boolean }) => void
  dispose: () => void
}
const pluginDockPanels = new Map<string, PluginDockPanelState>()

function getPluginDockKey(pluginId: string, panelId: string): string {
  return `${pluginId}::${panelId || 'default'}`
}

function notifyWorkspaceLayoutChanged(): void {
  try {
    const winAny = window as any
    const fn = winAny && winAny.__onWorkspaceLayoutChanged
    if (typeof fn === 'function') fn()
  } catch {}
}

function updatePluginDockGaps(): void {
  try {
    const container = document.querySelector('.container') as HTMLDivElement | null
    if (!container) return
    let left = 0
    let right = 0
    let bottom = 0
    for (const panel of pluginDockPanels.values()) {
      if (!panel || !panel.visible) continue
      const size = Math.max(0, Number(panel.size) || 0)
      if (!size) continue
      if (panel.side === 'left') left += size
      else if (panel.side === 'right') right += size
      else if (panel.side === 'bottom') bottom += size
    }
    container.style.setProperty('--dock-left-gap', left > 0 ? `${left}px` : '0px')
    container.style.setProperty('--dock-right-gap', right > 0 ? `${right}px` : '0px')
    container.style.setProperty('--dock-bottom-gap', bottom > 0 ? `${bottom}px` : '0px')
    notifyWorkspaceLayoutChanged()
  } catch {}
}

// 右键菜单键盘处理器仅用于文件树右键菜单
let _libCtxKeyHandler: ((e: KeyboardEvent) => void) | null = null // 文件树右键菜单的键盘事件处理器

async function readUploaderEnabledState(): Promise<boolean> {
  try {
    if (!store) return uploaderEnabledSnapshot
    const up = await store.get('uploader')
    if (up && typeof up === 'object') {
      uploaderEnabledSnapshot = !!(up as any).enabled
    }
    return uploaderEnabledSnapshot
  } catch {
    return uploaderEnabledSnapshot
  }
}

async function toggleUploaderEnabledFromMenu(): Promise<boolean> {
  try {
    if (!store) {
      pluginNotice('设置尚未初始化，暂无法切换图床开关', 'err', 2200)
      return uploaderEnabledSnapshot
    }
    const raw = ((await store.get('uploader')) as any) || {}
    const current = !!raw.enabled
    if (!current) {
      if (!raw.accessKeyId || !raw.secretAccessKey || !raw.bucket) {
        pluginNotice('请先在“图床设置”中填写 AccessKey / Secret / Bucket', 'err', 2600)
        return current
      }
    }
    raw.enabled = !current
    await store.set('uploader', raw)
    await store.save()
    uploaderEnabledSnapshot = !!raw.enabled
    pluginNotice(uploaderEnabledSnapshot ? '图床上传已开启' : '图床上传已关闭', 'ok', 1600)
    return uploaderEnabledSnapshot
  } catch (err) {
    console.error('toggle uploader failed', err)
    pluginNotice('切换图床开关失败', 'err', 2000)
    return uploaderEnabledSnapshot
  }
}

async function handleManualSyncFromMenu(): Promise<void> {
  try {
    const result = await webdavSyncNow('manual')
    if (!result) {
      pluginNotice('同步失败', 'err', 2200)
      return
    }
    if (result.skipped) {
      pluginNotice('同步已跳过', 'ok', 1800)
      return
    }
    pluginNotice(`同步完成：上传${result.uploaded}，下载${result.downloaded}`, 'ok', 2200)
  } catch (err) {
    console.error('manual sync failed', err)
    const msg = (err && (err as any).message) ? (err as any).message : String(err || 'unknown')
    pluginNotice('同步失败：' + msg, 'err', 2600)
  }
}

async function handleOpenSyncLogFromMenu(): Promise<void> {
  try {
    await webdavOpenSyncLog()
  } catch (err) {
    console.error('open sync log failed', err)
    pluginNotice('打开同步日志失败', 'err', 2200)
  }
}

function formatBackupTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

async function handleExportConfigFromMenu(): Promise<void> {
  try {
    if (store) {
      try { await store.save() } catch {}
    }
    const { files } = await collectConfigBackupFiles()
    if (!files.length) {
      pluginNotice('没有可导出的配置', 'err', 2200)
      return
    }
    const ts = formatBackupTimestamp(new Date())
    const defaultName = `flymd-config-${ts}.${CONFIG_BACKUP_FILE_EXT}`
    const target = await save({
      defaultPath: defaultName,
      filters: [{ name: 'flyMD 配置备份', extensions: [CONFIG_BACKUP_FILE_EXT, 'json'] }]
    } as any)
    if (!target) return
    const payload: ConfigBackupPayload = {
      version: CONFIG_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      files
    }
    await writeTextFile(target, JSON.stringify(payload, null, 2))
    pluginNotice('配置与日志已完整导出', 'ok', 2200)
  } catch (err) {
    console.error('export config failed', err)
    const msg = (err && (err as any).message) ? (err as any).message : String(err || 'unknown')
    pluginNotice('导出配置失败：' + msg, 'err', 3000)
  }
}

async function handleImportConfigFromMenu(): Promise<void> {
  try {
    const picked = await open({
      filters: [{ name: 'flyMD 配置备份', extensions: [CONFIG_BACKUP_FILE_EXT, 'json'] }]
    } as any)
    const path = Array.isArray(picked) ? (picked[0] || '') : (picked || '')
    if (!path) return
    const text = await readTextFile(path)
    let payload: ConfigBackupPayload | null = null
    try {
      payload = JSON.parse(text) as ConfigBackupPayload
    } catch {
      throw new Error('备份文件损坏或格式不正确')
    }
    if (!payload || typeof payload.version !== 'number' || payload.version < 1 || !Array.isArray(payload.files)) {
      throw new Error('备份文件不兼容')
    }
    const confirmed = await ask('导入配置会清空并覆盖当前所有 flyMD 配置、扩展、日志与缓存数据，并需要重启后生效，是否继续？')
    if (!confirmed) return
    const result = await restoreConfigFromPayload(payload)
    const restoredMsg = result.settings ? '配置/日志已恢复' : '文件已恢复'
    pluginNotice(`${restoredMsg}，请重启应用以确保生效`, 'ok', 2600)
    const restart = await ask('导入完成，是否立即重启应用？')
    if (restart) {
      try { location.reload() } catch {}
    }
  } catch (err) {
    console.error('import config failed', err)
    const msg = (err && (err as any).message) ? (err as any).message : String(err || 'unknown')
    pluginNotice('导入配置失败：' + msg, 'err', 3200)
  }
}

async function togglePortableModeFromMenu(): Promise<void> {
  try {
    const enabled = await isPortableModeEnabled()
    const next = !enabled
    await setPortableModeEnabled(next)
  if (next) {
    await exportPortableBackupSilent()
    pluginNotice(t('portable.enabled') || '便携模式已开启，所有配置写入根目录方便携带', 'ok', 2000)
  } else {
    pluginNotice(t('portable.disabled') || '便携模式已关闭', 'ok', 2000)
  }
  } catch (err) {
    console.error('toggle portable mode failed', err)
    pluginNotice(t('portable.toggleFail') || '切换便携模式失败', 'err', 2200)
  }
}

async function buildBuiltinContextMenuItems(): Promise<ContextMenuItemConfig[]> {
  const items: ContextMenuItemConfig[] = []
  const syncCfg = await (async () => { try { return await getWebdavSyncConfig() } catch { return null as any } })()
  const syncEnabled = !!syncCfg?.enabled
  const syncConfigured = await (async () => { try { return await isWebdavConfiguredForActiveLibrary() } catch { return false } })()
  let syncNote = ''
  if (!syncConfigured) syncNote = '当前库未配置 WebDAV，同步已禁用'
  else if (!syncEnabled) syncNote = '未启用'
  items.push({
    label: t('sync.now') || '立即同步',
    icon: '<i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i>',
    note: syncNote,
    disabled: !syncEnabled || !syncConfigured,
    onClick: async () => { await handleManualSyncFromMenu() }
  })
  items.push({
    label: t('sync.openlog') || '打开同步日志',
    icon: '<i class="fa-solid fa-book-open" aria-hidden="true"></i>',
    onClick: async () => { await handleOpenSyncLogFromMenu() }
  })
  const enabled = await readUploaderEnabledState()
  items.push({
    label: t('menu.uploader') || '图床上传',
    note: enabled ? '已开启' : '未开启',
    icon: '<i class="fa-solid fa-image" aria-hidden="true"></i>',
    onClick: async () => { await toggleUploaderEnabledFromMenu() }
  })
  items.push({ divider: true })
  items.push({
    label: t('menu.exportConfig') || '导出配置',
    icon: '<i class="fa-solid fa-box-archive" aria-hidden="true"></i>',
    onClick: async () => { await handleExportConfigFromMenu() }
  })
  items.push({
    label: t('menu.importConfig') || '导入配置',
    icon: '<i class="fa-solid fa-file-import" aria-hidden="true"></i>',
    onClick: async () => { await handleImportConfigFromMenu() }
  })
  const portableEnabled = await isPortableModeEnabled()
  items.push({
    label: t('menu.portableMode') || '便携模式',
    icon: '<i class="fa-solid fa-briefcase" aria-hidden="true"></i>',
    note: portableEnabled ? (t('portable.enabledShort') || '已开启') : (t('portable.disabledShort') || '未开启'),
    tooltip: t('portable.tooltip') || '开启后将在程序目录写入所有配置，方便在U盘等便携设备上使用',
    onClick: async () => { await togglePortableModeFromMenu() }
  })
  return items
}

// 插件下拉菜单管理
const PLUGIN_DROPDOWN_OVERLAY_ID = 'plugin-dropdown-overlay'
const PLUGIN_DROPDOWN_PANEL_ID = 'plugin-dropdown-panel'
let pluginDropdownKeyHandler: ((e: KeyboardEvent) => void) | null = null

// 移除下拉菜单
function removePluginDropdown() {
  try {
    const overlay = document.getElementById(PLUGIN_DROPDOWN_OVERLAY_ID)
    if (overlay) overlay.remove()
    if (pluginDropdownKeyHandler) {
      document.removeEventListener('keydown', pluginDropdownKeyHandler)
      pluginDropdownKeyHandler = null
    }
  } catch {}
}

// 渲染单个菜单项（支持嵌套子菜单）
function renderPluginMenuItem(item: any, callbacks: Map<string, () => void>, idCounter: { value: number }): string {
  if (!item) return ''

  // 分隔线
  if (item.type === 'divider') {
    return '<div class="plugin-menu-divider"></div>'
  }

  // 分组标题
  if (item.type === 'group') {
    return `<div class="plugin-menu-group-title">${item.label || ''}</div>`
  }

  // 子菜单
  if (item.children && item.children.length > 0) {
    const id = `menu-item-${idCounter.value++}`
    const disabled = item.disabled ? ' disabled' : ''
    const note = item.note ? `<span class="plugin-menu-note">${item.note}</span>` : ''

    let childrenHtml = ''
    for (const child of item.children) {
      childrenHtml += renderPluginMenuItem(child, callbacks, idCounter)
    }

    // 如果子菜单为空，显示提示
    if (!childrenHtml.trim()) {
      childrenHtml = '<div class="plugin-menu-item disabled" style="font-style:italic;opacity:0.6;">暂无可用选项</div>'
    }

    return `
      <div class="plugin-menu-item has-children${disabled}" data-id="${id}">
        <span class="plugin-menu-label">${item.label || ''}</span>${note}
        <span class="plugin-menu-arrow">▸</span>
        <div class="plugin-menu-submenu">${childrenHtml}</div>
      </div>
    `
  }

  // 普通菜单项
  const id = `menu-item-${idCounter.value++}`
  const disabled = item.disabled ? ' disabled' : ''
  const note = item.note ? `<span class="plugin-menu-note">${item.note}</span>` : ''

  // 保存回调
  if (item.onClick && typeof item.onClick === 'function') {
    callbacks.set(id, item.onClick)
  }

  return `<button class="plugin-menu-item" data-id="${id}"${disabled}>${item.label || ''}${note}</button>`
}

// 渲染菜单项列表
function renderPluginMenuItems(items: any[], callbacks: Map<string, () => void>): string {
  const idCounter = { value: 0 }
  const html: string[] = []

  for (const item of items) {
    html.push(renderPluginMenuItem(item, callbacks, idCounter))
  }

  return html.join('')
}

// 定位下拉面板
function positionPluginDropdown(panel: HTMLElement, anchor: HTMLElement) {
  try {
    const anchorRect = anchor.getBoundingClientRect()
    const viewportW = window.innerWidth || 1280
    const viewportH = window.innerHeight || 720
    const padding = 12

    panel.style.opacity = '0'
    panel.style.transform = 'translateY(-4px)'

    requestAnimationFrame(() => {
      const panelRect = panel.getBoundingClientRect()
      const panelW = panelRect.width || 220
      const panelH = panelRect.height || 180

      let left = anchorRect.left
      let top = anchorRect.bottom

      // 防止溢出视口
      if (left + panelW + padding > viewportW) {
        left = viewportW - panelW - padding
      }
      if (left < padding) left = padding
      if (top + panelH + padding > viewportH) {
        top = anchorRect.top - panelH
      }
      if (top < padding) top = padding

      panel.style.left = left + 'px'
      panel.style.top = top + 'px'
      panel.style.opacity = '1'
      panel.style.transform = 'translateY(0)'
    })
  } catch {}
}

// 显示下拉菜单
function showPluginDropdown(anchor: HTMLElement, items: any[]) {
  try {
    removePluginDropdown()

    const overlay = document.createElement('div')
    overlay.id = PLUGIN_DROPDOWN_OVERLAY_ID

    const callbacks = new Map<string, () => void | Promise<void>>()
    const menuHtml = renderPluginMenuItems(items, callbacks)

    overlay.innerHTML = `<div id="${PLUGIN_DROPDOWN_PANEL_ID}">${menuHtml}</div>`
    document.body.appendChild(overlay)

    const panel = document.getElementById(PLUGIN_DROPDOWN_PANEL_ID)
    if (panel) {
      positionPluginDropdown(panel, anchor)

      // 为每个有子菜单的项目添加 mouseenter 事件，动态调整子菜单位置
      panel.querySelectorAll('.plugin-menu-item.has-children').forEach((item) => {
        item.addEventListener('mouseenter', function(this: HTMLElement) {
          const submenu = this.querySelector('.plugin-menu-submenu') as HTMLElement
          if (!submenu) return

          // 使用 requestAnimationFrame 确保在下一帧计算，此时子菜单已经显示
          requestAnimationFrame(() => {
            const itemRect = this.getBoundingClientRect()
            const submenuRect = submenu.getBoundingClientRect()
            const viewportWidth = window.innerWidth

            // 检查子菜单是否会超出右边界
            const wouldOverflowRight = itemRect.right + submenuRect.width > viewportWidth - 10

            if (wouldOverflowRight) {
              // 向左展开
              submenu.classList.add('expand-left')
            } else {
              // 向右展开（默认）
              submenu.classList.remove('expand-left')
            }
          })
        })
      })
    }

    // 点击外部区域关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) removePluginDropdown()
    })

    // 处理菜单项点击（使用事件委托）
    if (panel) {
      panel.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const menuItem = target.closest('[data-id]') as HTMLElement

        if (!menuItem) return
        if (menuItem.classList?.contains('disabled')) return
        if (menuItem.classList?.contains('has-children')) return // 有子菜单的不执行

        const id = menuItem.getAttribute('data-id')
        if (!id) return

        removePluginDropdown()
        const callback = callbacks.get(id)
        if (callback) {
          try { callback() } catch (e) { console.error(e) }
        }
      })
    }

    // ESC 键关闭
    pluginDropdownKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') removePluginDropdown()
    }
    document.addEventListener('keydown', pluginDropdownKeyHandler)
  } catch (e) {
    console.error('显示插件下拉菜单失败', e)
    removePluginDropdown()
  }
}

// 切换下拉菜单
function togglePluginDropdown(anchor: HTMLElement, items: any[]) {
  const overlay = document.getElementById(PLUGIN_DROPDOWN_OVERLAY_ID)
  if (overlay) {
    removePluginDropdown()
  } else {
    showPluginDropdown(anchor, items)
  }
}

// ============ 统一插件菜单系统 ============

// 初始化"插件"菜单按钮
function initPluginsMenu() {
  try {
    const bar = document.querySelector('.menubar')
    if (!bar) return

    // 如果已存在则不重复创建
    if (_pluginsMenuBtn) return

    // 创建"插件"菜单按钮
    const pluginsBtn = document.createElement('div')
    pluginsBtn.className = 'menu-item'
    pluginsBtn.textContent = '插件'
    pluginsBtn.title = '扩展插件菜单'
    pluginsBtn.style.display = 'none' // 默认隐藏，有插件时才显示

    // 点击展开下拉菜单
    pluginsBtn.addEventListener('click', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      try {
        // 构建菜单项列表
        const items = Array.from(pluginsMenuItems.values()).map(item => ({
          label: item.label,
          onClick: item.onClick,
          children: item.children
        }))
        togglePluginDropdown(pluginsBtn, items)
      } catch (e) { console.error(e) }
    })

    // 插入到扩展按钮之前
    const extBtn = Array.from(bar.querySelectorAll('.menu-item')).find(el => el.textContent?.includes('扩展'))
    if (extBtn) {
      bar.insertBefore(pluginsBtn, extBtn)
    } else {
      bar.appendChild(pluginsBtn)
    }

    _pluginsMenuBtn = pluginsBtn
  } catch (e) {
    console.error('初始化插件菜单失败', e)
  }
}

// 添加到插件菜单
function addToPluginsMenu(pluginId: string, config: { label: string; onClick?: () => void; children?: any[] }) {
  pluginsMenuItems.set(pluginId, {
    pluginId,
    label: config.label,
    onClick: config.onClick,
    children: config.children
  })
  updatePluginsMenuButton()
  refreshQuickCommandsSheet()
}

// 从插件菜单移除
function removeFromPluginsMenu(pluginId: string) {
  pluginsMenuItems.delete(pluginId)
  updatePluginsMenuButton()
  refreshQuickCommandsSheet()
}

// 更新插件菜单按钮显示状态
function updatePluginsMenuButton() {
  if (!_pluginsMenuBtn) return

  // 有菜单项时显示，无菜单项时隐藏
  if (pluginsMenuItems.size > 0) {
    _pluginsMenuBtn.style.display = ''
  } else {
    _pluginsMenuBtn.style.display = 'none'
  }
}

// 底部抽屉工具
function attachBottomSheetSwipe(overlay: HTMLElement | null, panel: HTMLElement | null, onClose: () => void): void {
  if (!overlay || !panel) return
  if ((panel as any)._sheetSwipeBound) return

  let startY = 0
  let dragging = false
  let lastDy = 0

  const reset = () => {
    try { panel.style.transition = '' } catch {}
    try { panel.style.transform = '' } catch {}
    try { overlay.style.opacity = '' } catch {}
  }

  const onStart = (e: TouchEvent) => {
    if (!e.touches || e.touches.length !== 1) return
    dragging = true
    startY = e.touches[0].clientY
    lastDy = 0
    try { panel.style.transition = 'none' } catch {}
  }
  const onMove = (e: TouchEvent) => {
    if (!dragging || !e.touches || e.touches.length !== 1) return
    const dy = e.touches[0].clientY - startY
    if (dy < 0) return
    lastDy = dy
    const limited = Math.min(dy, 220)
    try { panel.style.transform = `translateY(${limited}px)` } catch {}
    try {
      const nextOpacity = Math.max(0.25, 1 - limited / 320)
      overlay.style.opacity = `${nextOpacity}`
    } catch {}
  }
  const onEnd = () => {
    const shouldClose = lastDy > 70
    reset()
    if (dragging && shouldClose) onClose()
    dragging = false
    lastDy = 0
  }

  panel.addEventListener('touchstart', onStart, { passive: true })
  panel.addEventListener('touchmove', onMove, { passive: true })
  panel.addEventListener('touchend', onEnd)
  panel.addEventListener('touchcancel', onEnd)
  ;(panel as any)._sheetSwipeBound = true
}

function showSheet(overlay: HTMLElement | null): void {
  if (!overlay) return
  overlay.classList.remove('hidden')
  overlay.classList.add('show')
  try { overlay.setAttribute('aria-hidden', 'false') } catch {}
}

function hideSheet(overlay: HTMLElement | null): void {
  if (!overlay) return
  overlay.classList.remove('show')
  overlay.classList.add('hidden')
  try { overlay.setAttribute('aria-hidden', 'true') } catch {}
}

function ensureSheet(id: string, title: string, icon?: string): { overlay: HTMLDivElement; body: HTMLDivElement | null } | null {
  try {
    let overlay = document.getElementById(id) as HTMLDivElement | null
    if (!overlay) {
      const closeLabel = t('about.close') || '关闭'
      overlay = document.createElement('div')
      overlay.id = id
      overlay.className = 'sheet-overlay hidden'
      overlay.setAttribute('aria-hidden', 'true')
      overlay.innerHTML = `
        <div class="sheet-panel">
          <div class="sheet-header">
            <div class="sheet-title">${icon ? `<i class="${icon}" aria-hidden="true"></i>` : ''}<span class="sheet-title-text">${title}</span></div>
            <button class="sheet-close" type="button" aria-label="${closeLabel}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>
          <div class="sheet-body"></div>
        </div>
      `
      document.body.appendChild(overlay)
      const panel = overlay.querySelector('.sheet-panel') as HTMLDivElement | null
      const closeBtn = overlay.querySelector('.sheet-close') as HTMLButtonElement | null
      const close = () => hideSheet(overlay!)
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close() })
      closeBtn?.addEventListener('click', close)
      attachBottomSheetSwipe(overlay, panel, close)
    }
    const titleEl = overlay.querySelector('.sheet-title-text') as HTMLSpanElement | null
    if (titleEl) titleEl.textContent = title
    const body = overlay.querySelector('.sheet-body') as HTMLDivElement | null
    return { overlay, body }
  } catch { return null }
}

try { (window as any).__attachBottomSheetSwipe = attachBottomSheetSwipe } catch {}

// ============ 右键菜单系统 ============

// 构建右键菜单上下文
function buildContextMenuContext(): ContextMenuContext {
  try {
    const sel = editor.selectionStart || 0
    const end = editor.selectionEnd || 0
    let text = editor.value.slice(Math.min(sel, end), Math.max(sel, end))
    if (wysiwygV2Active) {
      try {
        const wysSel = String(wysiwygV2GetSelectedText() || '')
        text = wysSel
      } catch {}
    }
    return {
      selectedText: text,
      cursorPosition: sel,
      mode: wysiwygV2Active ? 'wysiwyg' : mode,
      filePath: currentFilePath
    }
  } catch {
    return {
      selectedText: '',
      cursorPosition: 0,
      mode: mode,
      filePath: currentFilePath
    }
  }
}

function escapeAttrValue(input: string): string {
  try {
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  } catch {
    return ''
  }
}

// 初始化右键菜单监听
function initContextMenuListener() {
  try {
    // 监听编辑器的右键事件
    editor.addEventListener('contextmenu', (e) => {
      if (pluginContextMenuItems.length > 0 && !e.shiftKey) {
        e.preventDefault()
        const ctx = buildContextMenuContext()
        void showContextMenu(e.clientX, e.clientY, ctx, {
          pluginItems: pluginContextMenuItems,
          buildBuiltinItems: buildBuiltinContextMenuItems,
        })
      }
    })

    // 监听预览区域的右键事件
    const preview = document.querySelector('.preview') as HTMLElement
    if (preview) {
      preview.addEventListener('contextmenu', (e) => {
        if (pluginContextMenuItems.length > 0 && !e.shiftKey) {
          e.preventDefault()
          const ctx = buildContextMenuContext()
          void showContextMenu(e.clientX, e.clientY, ctx, {
            pluginItems: pluginContextMenuItems,
            buildBuiltinItems: buildBuiltinContextMenuItems,
          })
        }
      })
    }

    document.addEventListener('contextmenu', (e) => {
      if (!wysiwygV2Active) return
      if (pluginContextMenuItems.length === 0) return
      if (e.shiftKey) return
      const root = document.getElementById('md-wysiwyg-root') as HTMLElement | null
      if (!root || !root.contains(e.target as Node)) return
      e.preventDefault()
      const ctx = buildContextMenuContext()
      void showContextMenu(e.clientX, e.clientY, ctx, {
        pluginItems: pluginContextMenuItems,
        buildBuiltinItems: buildBuiltinContextMenuItems,
      })
    }, true)
  } catch (err) {
    console.error('初始化右键菜单监听失败:', err)
  }
}

// ============ 右键菜单系统结束 ============

// 获取扩展卡片在统一网格中的排序序号（越小越靠前）
function getPluginOrder(id: string, name?: string, bias = 0): number {
  try {
    const key = id || ''
    if (key && Object.prototype.hasOwnProperty.call(_extGlobalOrder, key)) {
      return _extGlobalOrder[key]
    }
    const base = 50_000 + bias
    const label = String(name || id || '').toLowerCase()
    if (!label) return base
    const ch = label.charCodeAt(0)
    return base + (Number.isFinite(ch) ? ch : 0)
  } catch {
    return 99_999
  }
}

// 文档阅读/编辑位置持久化（最小实现）
type DocPos = {
  pos: number
  end?: number
  scroll: number
  pscroll: number
  mode: Mode | 'wysiwyg'
  ts: number
}
let _docPosSaveTimer: number | null = null
async function getDocPosMap(): Promise<Record<string, DocPos>> {
  try {
    if (!store) return {}
    const m = await store.get('docPos')
    return (m && typeof m === 'object') ? (m as Record<string, DocPos>) : {}
  } catch { return {} }
}
async function saveCurrentDocPosNow() {
  try {
    if (!currentFilePath) return
    const map = await getDocPosMap()
    map[currentFilePath] = {
      pos: editor.selectionStart >>> 0,
      end: editor.selectionEnd >>> 0,
      scroll: editor.scrollTop >>> 0,
      pscroll: preview.scrollTop >>> 0,
      mode: (wysiwyg ? 'wysiwyg' : mode),
      ts: Date.now(),
    }
    if (store) {
      await store.set('docPos', map)
      await store.save()
    }
  } catch {}
}
function scheduleSaveDocPos() {
  try {
    if (_docPosSaveTimer != null) { clearTimeout(_docPosSaveTimer); _docPosSaveTimer = null }
    _docPosSaveTimer = window.setTimeout(() => { void saveCurrentDocPosNow() }, 400)
  } catch {}
}
async function restoreDocPosIfAny(path?: string) {
  try {
    const p = (path || currentFilePath || '') as string
    if (!p) return
    const map = await getDocPosMap()
    const s = map[p]
    if (!s) return
    // 恢复编辑器光标与滚动
    try {
      const st = Math.max(0, Math.min(editor.value.length, s.pos >>> 0))
      const ed = Math.max(0, Math.min(editor.value.length, (s.end ?? st) >>> 0))
      editor.selectionStart = st
      editor.selectionEnd = ed
      editor.scrollTop = Math.max(0, s.scroll >>> 0)
      refreshStatus()
    } catch {}
    // 恢复预览滚动（需在预览渲染后调用）
    try { preview.scrollTop = Math.max(0, s.pscroll >>> 0) } catch {}
  } catch {}
}

// 日志系统（已拆分到 core/logger.ts）
import { appendLog, logInfo, logWarn, logDebug } from './core/logger'

// 统一确认弹框：优先使用 Tauri 原生 ask；浏览器环境回退到 window.confirm
async function confirmNative(message: string, title = '确认') : Promise<boolean> {
  try {
    if (isTauriRuntime() && typeof ask === 'function') {
      try {
        const ok = await ask(message, { title })
        return !!ok
      } catch {}
    }
    // 浏览器环境或 ask 不可用时的降级
    try {
      if (typeof confirm === 'function') return !!confirm(message)
    } catch {}
    // 最安全的默认：不执行破坏性操作
    return false
  } catch {
    return false
  }
}

// 将任意 open() 返回值归一化为可用于 fs API 的字符串路径
function normalizePath(input: unknown): string {
  try {
    if (typeof input === 'string') return input
    if (input && typeof (input as any).path === 'string') return (input as any).path
    if (input && typeof (input as any).filePath === 'string') return (input as any).filePath
    const p: any = (input as any)?.path
    if (p) {
      if (typeof p === 'string') return p
      if (typeof p?.href === 'string') return p.href
      if (typeof p?.toString === 'function') {
        const s = p.toString()
        if (typeof s === 'string' && s) return s
      }
    }
    if (input && typeof (input as any).href === 'string') return (input as any).href
    if (input && typeof (input as any).toString === 'function') {
      const s = (input as any).toString()
      if (typeof s === 'string' && s) return s
    }
    return String(input ?? '')
  } catch {
    return String(input ?? '')
  }
}

// 统一读文件兜底：fs 失败则调用后端命令读取
async function readTextFileAnySafe(p: string): Promise<string> {
  try {
    return await readTextFile(p as any)
  } catch (e) {
    try { return await invoke<string>('read_text_file_any', { path: p }) } catch { throw e }
  }
}

// 统一写文件兜底：fs 失败则调用后端命令写入
async function writeTextFileAnySafe(p: string, content: string): Promise<void> {
  try {
    await writeTextFile(p, content)
  } catch (e) {
    try { await invoke('write_text_file_any', { path: p, content }) } catch { throw e }
  }
}

function showError(msg: string, err?: unknown) {
  void appendLog('ERROR', msg, err)
  // 确保 status 元素存在后才更新
  const statusEl = document.getElementById('status')
  if (statusEl) {
    statusEl.textContent = `错误: ${msg}`
  } else {
    console.error('错误:', msg, err)
  }
  ;(() => {
    try {
      const statusEl2 = document.getElementById('status')
      if (statusEl2) {
        let __text = `错误: ${msg}`
        try {
          const __detail = (err instanceof Error)
            ? err.message
            : (typeof err === 'string' ? err : (err ? JSON.stringify(err) : ''))
          if (__detail) __text += ` - ${__detail}`
        } catch {}
        statusEl2.textContent = __text
      }
    } catch {}
  })()
}

function guard<T extends (...args: any[]) => any>(fn: T) {
  return (...args: Parameters<T>) => {
    try {
      const r = fn(...args)
      if (r && typeof (r as any).then === 'function') {
        ;(r as Promise<any>).catch((e) => showError('处理事件失败', e))
      }
    } catch (e) {
      showError('处理事件异常', e)
    }
  }
}

function setIconButton(el: HTMLElement | null, iconClass: string, label: string): void {
  if (!el) return
  const safeLabel = String(label || '')
  el.innerHTML = ''
  const icon = document.createElement('i')
  icon.className = iconClass
  icon.setAttribute('aria-hidden', 'true')
  el.appendChild(icon)
  const sr = document.createElement('span')
  sr.className = 'sr-only'
  sr.textContent = safeLabel
  el.appendChild(sr)
  el.setAttribute('aria-label', safeLabel)
  el.setAttribute('title', safeLabel)
}

// UI 结构搭建
const app = document.getElementById('app')!
app.innerHTML = `
  <div class="titlebar">
      <button class="mobile-lib-toggle" id="mobile-lib-toggle" aria-label="${t('lib.menu')}"><i class="fa-solid fa-bars" aria-hidden="true"></i><span class="sr-only">${t('lib.menu')}</span></button>
      <div class="menubar">
      <!-- 顶级菜单：文件 / 模式（参考 Windows 文本菜单） -->
      <div class="menu-item" id="btn-open" title="${t('menu.file')}">${t('menu.file')}</div>
      <div class="menu-item" id="btn-mode" title="${t('menu.mode')}">${t('menu.mode')}</div>
      <!-- 旧按钮保留但隐藏，避免破坏现有逻辑引用 -->
      <div class="menu-item" id="btn-new" style="display:none;" title="${t('file.new')} (Ctrl+N)">${t('file.new')}</div>
      <div class="menu-item" id="btn-save" style="display:none;" title="${t('file.save')} (Ctrl+S)">${t('file.save')}</div>
      <div class="menu-item" id="btn-saveas" style="display:none;" title="${t('file.saveas')} (Ctrl+Shift+S)">${t('file.saveas')}</div>
      <div class="menu-item" id="btn-toggle" style="display:none;" title="${t('mode.edit')}/${t('mode.read')} (Ctrl+E)">${t('mode.read')}</div>
      <div class="menu-item" id="btn-theme" title="主题">主题</div>
      <div class="menu-item" id="btn-extensions" title="${t('menu.extensions')}">${t('menu.extensions')}</div>
    </div>
    <div class="filename" id="filename">${t('filename.untitled')}</div>
    <div class="window-controls" id="window-controls">
      <button class="window-btn window-minimize" id="window-minimize" title="最小化">-</button>
      <button class="window-btn window-maximize" id="window-maximize" title="最大化">+</button>
      <button class="window-btn window-close" id="window-close" title="关闭">x</button>
    </div>
  </div>
  <div class="focus-trigger-zone" id="focus-trigger-zone"></div>
  <div class="container">
    <textarea id="editor" class="editor" spellcheck="false" placeholder="${t('editor.placeholder')}"></textarea>
    <div id="preview" class="preview hidden"></div>
    <div class="statusbar" id="status">${fmtStatus(1,1)}</div>
    <div class="notification-container" id="notification-container"></div>
    <div class="status-zoom" id="status-zoom"><span id="zoom-label">100%</span> <button id="zoom-reset" title="重置缩放">重置</button></div>
  </div>
`
try { logInfo('打点:DOM就绪') } catch {}

// 性能标记：DOM 就绪
performance.mark('flymd-dom-ready')

// 初始化平台适配（Android 支持）
initPlatformIntegration().catch((e) => console.error('[Platform] Initialization failed:', e))
// 初始化平台类（用于 CSS 平台适配，Windows 显示窗口控制按钮）
try { initPlatformClass() } catch {}
// 应用已保存主题并挂载主题 UI
try { applySavedTheme() } catch {}
try { initThemeUI() } catch {}
// 初始化专注模式事件
try { initFocusModeEvents() } catch {}
// 初始化窗口拖拽（为 mac / Linux 上的紧凑标题栏补齐拖动支持）
try { initWindowDrag() } catch {}
// 初始化窗口边缘 resize（decorations: false 时提供窗口调整大小功能）
try { initWindowResize() } catch {}
// 恢复专注模式状态（需要等 store 初始化后执行，见下方 store 初始化处）

const editor = document.getElementById('editor') as HTMLTextAreaElement
const preview = document.getElementById('preview') as HTMLDivElement
const filenameLabel = document.getElementById('filename') as HTMLDivElement
try { initMobileBottomBar() } catch {}
// 窗口控制按钮（紧凑标题栏模式使用）
try {
  const minBtn = document.getElementById('window-minimize') as HTMLButtonElement | null
  const maxBtn = document.getElementById('window-maximize') as HTMLButtonElement | null
  const closeBtn = document.getElementById('window-close') as HTMLButtonElement | null
  if (minBtn) {
    minBtn.addEventListener('click', async () => {
      try { await getCurrentWindow().minimize() } catch {}
    })
  }
  if (maxBtn) {
    maxBtn.addEventListener('click', async () => {
      try {
        const win = getCurrentWindow()
        const isMax = await win.isMaximized()
        if (isMax) {
          await win.unmaximize()
          maxBtn.textContent = '+'
          maxBtn.title = '最大化'
        } else {
          await win.maximize()
          maxBtn.textContent = '+'
          maxBtn.title = '还原'
        }
      } catch {}
    })
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', async () => {
      try {
        const win = getCurrentWindow()
        await win.close()
      } catch {}
    })
  }
} catch {}
// 任务列表：扫描与回写（阅读模式）
let _taskMapLast: Array<{ line: number; ch: number }> = []
let _taskEventsBound = false

try {
  // 便签快速待办：编辑框失焦或按下回车后自动返回阅读模式（仅在从阅读模式触发的待办插入场景生效）
  editor.addEventListener('blur', () => {
    if (!stickyNoteMode || !stickyTodoAutoPreview) return
    void maybeAutoReturnStickyPreview()
  })
  editor.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!stickyNoteMode || !stickyTodoAutoPreview) return
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // 不干扰原有回车行为，只在事件后异步切回阅读模式
      setTimeout(() => { void maybeAutoReturnStickyPreview() }, 0)
    }
  })
} catch {}

function scanTaskList(md: string): Array<{ line: number; ch: number }> {
  try {
    const lines = String(md || '').split('\n')
    const out: Array<{ line: number; ch: number }> = []
    let fenceOpen = false
    let fenceCh = ''
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i]
      const mFence = s.match(/^ {0,3}(`{3,}|~{3,})/)
      if (mFence) {
        const ch = mFence[1][0]
        if (!fenceOpen) { fenceOpen = true; fenceCh = ch } else if (ch === fenceCh) { fenceOpen = false; fenceCh = '' }
      }
      if (fenceOpen) continue
      const m = s.match(/^(\s*)(?:[-+*]|\d+[.)])\s+\[( |x|X)\]\s+/)
      if (!m) continue
      const start = m[1].length
      const bpos = s.indexOf('[', start) + 1
      if (bpos <= 0) continue
      out.push({ line: i, ch: bpos })
    }
    return out
  } catch { return [] }
}

function onTaskCheckboxChange(ev: Event) {
  try {
    if (wysiwyg) return
    const el = ev.target as HTMLInputElement | null
    if (!el || el.type !== 'checkbox') return
    if (!(el.classList && el.classList.contains('task-list-item-checkbox'))) return
    const id = Number((el as any).dataset?.taskId ?? -1)
    if (!Number.isFinite(id) || id < 0) return
    const map = _taskMapLast || []
    const m = map[id]
    if (!m) return
    const content = String((editor as HTMLTextAreaElement).value || '')
    const lines = content.split('\n')
    const ln = lines[m.line] || ''
    const idx = m.ch >>> 0
    if (!(idx > 0 && idx < ln.length)) return
    const before = ln.slice(0, idx)
    const after = ln.slice(idx + 1)
    const nextCh = el.checked ? 'x' : ' '
    lines[m.line] = before + nextCh + after
    ;(editor as HTMLTextAreaElement).value = lines.join('\n')
    try { (window as any).dirty = true } catch {}
    try { refreshTitle(); refreshStatus() } catch {}
    // 立即更新删除线样式（无需等待 renderPreview）
    try {
      const listItem = el.closest('li.task-list-item') as HTMLElement | null
      if (listItem) {
        if (el.checked) {
          listItem.style.textDecoration = 'line-through'
          listItem.style.opacity = '0.65'
        } else {
          listItem.style.textDecoration = ''
          listItem.style.opacity = ''
        }
      }
    } catch {}
    try { renderPreview() } catch {}
    try { if (currentFilePath) { void saveFile() } else { void saveAs() } } catch {}
  } catch {}
}
const status = document.getElementById('status') as HTMLDivElement

// 所见模式：输入即渲染 + 覆盖式同窗显示
function syncScrollEditorToPreview() { /* overlay removed */ }

function scheduleWysiwygRender() {
  try {
    if (!wysiwyg || !wysiwygV2Active) return
    if (_wysiwygRaf) cancelAnimationFrame(_wysiwygRaf)
    _wysiwygRaf = requestAnimationFrame(() => {
      _wysiwygRaf = 0
      try {
        const value = String((editor as HTMLTextAreaElement).value || '')
        const { body } = splitYamlFrontMatter(value)
        void wysiwygV2ReplaceAll(body)
      } catch {}
    })
  } catch {}
}

// YAML Front Matter 解析：仅检测文首形如
// ---
// key: value
// ---
// 的块；否则一律视为普通 Markdown，避免误伤旧文档
function splitYamlFrontMatter(raw: string): { frontMatter: string | null; body: string } {
  try {
    if (!raw) return { frontMatter: null, body: '' }
    let text = String(raw)
    // 处理 UTF-8 BOM，保留给正文
    let bom = ''
    if (text.charCodeAt(0) === 0xfeff) {
      bom = '\uFEFF'
      text = text.slice(1)
    }
    const lines = text.split('\n')
    if (lines.length < 3) return { frontMatter: null, body: raw }
    if (lines[0].trim() !== '---') return { frontMatter: null, body: raw }
    let end = -1
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') { end = i; break }
    }
    if (end < 0) return { frontMatter: null, body: raw }
    // 至少有一行看起来像 "key: value" 才认为是 YAML
    let looksYaml = false
    for (let i = 1; i < end; i++) {
      const s = lines[i].trim()
      if (!s || s.startsWith('#')) continue
      if (/^[A-Za-z0-9_.-]+\s*:/.test(s)) { looksYaml = true; break }
    }
    if (!looksYaml) return { frontMatter: null, body: raw }
    const fmLines = lines.slice(0, end + 1)
    const bodyLines = lines.slice(end + 1)
    let fmText = fmLines.join('\n')
    let bodyText = bodyLines.join('\n')
    // 常见写法：头部后空一行，渲染时剥掉这行
    bodyText = bodyText.replace(/^\r?\n/, '')
    if (bom) bodyText = bom + bodyText
    if (!fmText.endsWith('\n')) fmText += '\n'
    return { frontMatter: fmText, body: bodyText }
  } catch {
    return { frontMatter: null, body: raw }
  }
}

// 阅读模式元数据：预览顶部的 Front Matter 简要视图与开关
let previewMetaVisible = true
try {
  const v = localStorage.getItem('flymd:preview:showMeta')
  if (v === '0' || (v && v.toLowerCase() === 'false')) previewMetaVisible = false
} catch {}

function setPreviewMetaVisible(v: boolean) {
  previewMetaVisible = v
  try { localStorage.setItem('flymd:preview:showMeta', v ? '1' : '0') } catch {}
}

function parseFrontMatterMeta(fm: string | null): any | null {
  if (!fm) return null
  try {
    let s = String(fm)
    s = s.replace(/^\uFEFF?---\s*\r?\n?/, '')
    s = s.replace(/\r?\n---\s*$/, '')
    const doc = yamlLoad(s)
    if (!doc || typeof doc !== 'object') return null
    return doc
  } catch {
    return null
  }
}
// 暴露到全局，供所见模式在粘贴 URL 时复用同一套抓取标题逻辑
try { (window as any).flymdFetchPageTitle = fetchPageTitle } catch {}

function injectPreviewMeta(container: HTMLDivElement, meta: any | null) {
  if (!meta || typeof meta !== 'object') return
  const m: any = meta

  const title = (typeof m.title === 'string' && m.title.trim())
    || (currentFilePath ? (currentFilePath.split(/[\\/]+/).pop() || '') : '')
  const cats = Array.isArray(m.categories)
    ? m.categories.map((x: any) => String(x || '').trim()).filter(Boolean)
    : (m.category ? [String(m.category || '').trim()] : [])
  const tags = Array.isArray(m.tags)
    ? m.tags.map((x: any) => String(x || '').trim()).filter(Boolean)
    : []
  const status = typeof m.status === 'string' ? m.status : (m.draft === true ? 'draft' : '')
  const slug = (m.slug || m.typechoSlug) ? String(m.slug || m.typechoSlug || '') : ''
  const id = (m.typechoId || m.id || m.cid) ? String(m.typechoId || m.id || m.cid || '') : ''
  const dateRaw = m.date || m.dateCreated || m.created || m.typechoUpdatedAt || ''
  const source = typeof m.source === 'string' ? m.source : ''

  const metaRoot = document.createElement('div')
  metaRoot.className = 'preview-meta'
  if (!previewMetaVisible) metaRoot.classList.add('collapsed')

  const header = document.createElement('div')
  header.className = 'preview-meta-header'

  const titleEl = document.createElement('div')
  titleEl.className = 'preview-meta-title'
  if (title) titleEl.textContent = title

  const toggleBtn = document.createElement('button')
  toggleBtn.type = 'button'
  toggleBtn.className = 'preview-meta-toggle'
  const syncToggleText = () => {
    toggleBtn.textContent = previewMetaVisible ? '隐藏元数据' : '显示元数据'
  }
  syncToggleText()
  toggleBtn.addEventListener('click', () => {
    const now = !previewMetaVisible
    setPreviewMetaVisible(now)
    if (now) metaRoot.classList.remove('collapsed')
    else metaRoot.classList.add('collapsed')
    syncToggleText()
  })

  header.appendChild(titleEl)
  header.appendChild(toggleBtn)
  metaRoot.appendChild(header)

  const body = document.createElement('div')
  body.className = 'preview-meta-body'

  const addRow = (label: string, value: string | string[]) => {
    if (Array.isArray(value)) {
      if (!value.length) return
    } else {
      if (!value || !String(value).trim()) return
    }
    const row = document.createElement('div')
    row.className = 'preview-meta-row'
    const lab = document.createElement('span')
    lab.className = 'preview-meta-label'
    lab.textContent = label
    row.appendChild(lab)
    const val = document.createElement('span')
    val.className = 'preview-meta-value'
    if (Array.isArray(value)) {
      for (const it of value) {
        const chipText = String(it || '').trim()
        if (!chipText) continue
        const chip = document.createElement('span')
        chip.className = 'preview-meta-chip'
        chip.textContent = chipText
        val.appendChild(chip)
      }
    } else {
      val.textContent = String(value)
    }
    row.appendChild(val)
    body.appendChild(row)
  }

  if (cats.length) addRow('分类', cats)
  if (tags.length) addRow('标签', tags)
  if (status) addRow('状态', status)
  if (slug) addRow('Slug', slug)
  if (id) addRow('ID', id)
  if (dateRaw) addRow('时间', String(dateRaw))
  if (source) addRow('来源', source)

  if (body.children.length > 0) {
    metaRoot.appendChild(body)
  }

  container.insertBefore(metaRoot, container.firstChild)
}

// 轻渲染：仅生成安全的 HTML，不执行 Mermaid/代码高亮等重块
async function renderPreviewLight() {
  await ensureRenderer()
  let raw = editor.value
  try {
    if (wysiwyg && mode !== 'preview') {
      const st = editor.selectionStart >>> 0
      const before = raw.slice(0, st)
      const after = raw.slice(st)
      const lineStart = before.lastIndexOf('\n') + 1
      const curLine = before.slice(lineStart)
      const fenceRE = /^ {0,3}(```+|~~~+)/
      const preText = raw.slice(0, lineStart)
      const preLines = preText.split('\n')
      let insideFence = false
      let fenceCh = ''
      for (const ln of preLines) {
        const m = ln.match(fenceRE)
        if (m) {
          const ch = m[1][0]
          if (!insideFence) { insideFence = true; fenceCh = ch }
          else if (ch === fenceCh) { insideFence = false; fenceCh = '' }
        }
      }
      const isFenceLine = fenceRE.test(curLine)
      let injectAt = st
      if (st === lineStart) {
        const mBQ = curLine.match(/^ {0,3}> ?/)
        const mH = curLine.match(/^ {0,3}#{1,6} +/)
        const mUL = curLine.match(/^ {0,3}[-*+] +/)
        const mOL = curLine.match(/^ {0,3}\d+\. +/)
        const prefixLen = (mBQ?.[0]?.length || mH?.[0]?.length || mUL?.[0]?.length || mOL?.[0]?.length || 0)
        if (prefixLen > 0) injectAt = lineStart + prefixLen
      }
      if (isFenceLine) {
        const m = curLine.match(fenceRE)
        if (m) {
          const ch = m[1][0]
          if (!insideFence) { injectAt = lineStart + m[0].length }
          else if (ch === fenceCh) { injectAt = -1 }
        }
      }
      if (injectAt >= 0) {
        const dotStr = insideFence && !isFenceLine ? '_' : '<span class="caret-dot">_</span>'
        raw = raw.slice(0, injectAt) + dotStr + raw.slice(injectAt)
      }
      try {
        const lines = raw.split('\n')
        // 对未闭合 fenced 与单 $ 进行最小阻断，避免即时渲染抖动
        let openFenceIdx = -1
        let openFenceChar = ''
        for (let i = 0; i < lines.length; i++) {
          const m = lines[i].match(/^ {0,3}(`{3,}|~{3,})/)
          if (m) {
            const ch = m[1][0]
            if (openFenceIdx < 0) { openFenceIdx = i; openFenceChar = ch }
            else if (ch === openFenceChar) { openFenceIdx = -1; openFenceChar = '' }
          }
        }
        if (openFenceIdx >= 0) {
          lines[openFenceIdx] = lines[openFenceIdx].replace(/^(\s*)(`{3,}|~{3,})/, (_all, s: string, fence: string) => s + fence[0] + '\u200B' + fence.slice(1))
        }
        const curIdx = (() => { try { return before.split('\n').length - 1 } catch { return -1 } })()
        if (curIdx >= 0 && curIdx < lines.length) {
          const line = lines[curIdx]
          const singlePos: number[] = []
          for (let i = 0; i < line.length; i++) {
            if (line[i] !== '$') continue
            if (i + 1 < line.length && line[i + 1] === '$') { i++; continue }
            let bs = 0
            for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) bs++
            if ((bs & 1) === 1) continue
            singlePos.push(i)
          }
          if ((singlePos.length & 1) === 1) {
            const idx = singlePos[singlePos.length - 1]
            lines[curIdx] = line.slice(0, idx + 1) + '\u200B' + line.slice(idx + 1)
          }
        }
        raw = lines.join('\n')
      } catch {}
    }
  } catch {}
  // 轻渲染预览：只渲染正文部分，忽略 YAML Front Matter
  try {
    const { body } = splitYamlFrontMatter(raw)
    raw = body
  } catch {}
  const html = md!.render(raw)
  // 方案 A：占位符机制不需要 DOMPurify
  // KaTeX 占位符（data-math 属性）是安全的，后续会用 KaTeX.render() 替换
  const safe = html
  // 渲染 .md-math-* 占位符为 KaTeX
  try {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = safe
    try {
      const mathNodes = Array.from(tempDiv.querySelectorAll('.md-math-inline, .md-math-block')) as HTMLElement[]
      if (mathNodes.length > 0) {
        // 使用所见模式的导入方式
        const katex = await import('katex')

        if (!katexCssLoaded) {
          await import('katex/dist/katex.min.css')
          katexCssLoaded = true

          // 手动注入关键 CSS 规则（同阅读模式）
          const criticalStyle = document.createElement('style')
          criticalStyle.textContent = `
            /* KaTeX critical styles for production build */
            .katex { font-size: 1em; text-indent: 0; text-rendering: auto; }
            .katex svg { display: inline-block; position: relative; width: 100%; height: 100%; }
            .katex svg path { fill: currentColor; }
            .katex .hide-tail { overflow: hidden; }
            .md-math-inline .katex { display: inline-block; }
            .md-math-block .katex { display: block; text-align: center; }
          `
          document.head.appendChild(criticalStyle)
        }

        // 渲染每个数学节点
        for (const el of mathNodes) {
          try {
            const value = el.getAttribute('data-math') || ''
            const displayMode = el.classList.contains('md-math-block')

            // 清空元素
            el.innerHTML = ''

            // 使用 katex.default.render()（与所见模式相同）
            katex.default.render(value, el, {
              throwOnError: false,
              displayMode: displayMode,
            })
          } catch (e) {
            console.error('[KaTeX 导出] 渲染单个公式失败:', e)
            el.textContent = el.getAttribute('data-math') || ''
          }
        }
      }
    } catch (mainErr) {
      console.error('[KaTeX 导出] 主流程崩溃:', mainErr)
    }
    try { preview.innerHTML = `<div class="preview-body">${tempDiv.innerHTML}</div>` } catch {}
  } catch {
    // 回退：如果 KaTeX 渲染失败，使用原始 HTML
    try { preview.innerHTML = `<div class="preview-body">${safe}</div>` } catch {}
  }
  // 轻渲染后也生成锚点，提升滚动同步体验
  // 旧所见模式移除：不再重建锚点表
}

// 供所见 V2 调用：将粘贴/拖拽的图片保存到本地，并返回可写入 Markdown 的路径（自动生成不重复文件名）
async function saveImageToLocalAndGetPath(file: File, fname: string): Promise<string | null> {
  console.log('[saveImageToLocal] 被调用, fname:', fname, 'file.size:', file.size)
  try {
    const alwaysLocal = await getAlwaysSaveLocalImages()
    const upCfg = await getUploaderConfig()
    console.log('[saveImageToLocal] alwaysLocal:', alwaysLocal, 'upCfg:', upCfg)

    // 判断是否需要保存到本地：
    // 1. 未启用图床（upCfg 不存在或未启用）
    // 2. 启用了图床但勾选了"总是保存到本地"
    const uploaderEnabled = upCfg && upCfg.enabled
    const shouldSaveLocal = !uploaderEnabled || alwaysLocal
    console.log('[saveImageToLocal] uploaderEnabled:', uploaderEnabled, 'shouldSaveLocal:', shouldSaveLocal)

    if (!shouldSaveLocal) {
      console.log('[saveImageToLocal] 不需要保存到本地，返回 null')
      return null
    }

    // 统一处理：是否对本地保存也转 WebP
    const { saveLocalAsWebp, webpQuality } = await getTranscodePrefs()
    let blobForSave: Blob = file
    let nameForSave: string = fname
    try {
      if (saveLocalAsWebp) {
        const r = await transcodeToWebpIfNeeded(file, fname, webpQuality, { skipAnimated: true })
        blobForSave = r.blob
        nameForSave = r.fileName
      }
    } catch {}

    // 生成不重复文件名：pasted-YYYYMMDD-HHmmss-rand.ext
    const guessExt = (): string => {
      try {
        const byName = (nameForSave || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
        if (byName) return byName
        const t = (blobForSave.type || '').toLowerCase()
        if (t.includes('webp')) return 'webp'
        if (t.includes('png')) return 'png'
        if (t.includes('jpeg')) return 'jpg'
        if (t.includes('jpg')) return 'jpg'
        if (t.includes('gif')) return 'gif'
        if (t.includes('bmp')) return 'bmp'
        if (t.includes('avif')) return 'avif'
        if (t.includes('svg')) return 'svg'
        return 'png'
      } catch { return 'png' }
    }
    const two = (n: number) => (n < 10 ? '0' + n : '' + n)
    const makeName = () => {
      const d = new Date()
      const ts = `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`
      const rand = Math.random().toString(36).slice(2, 6)
      return `pasted-${ts}-${rand}.${guessExt()}`
    }
    const ensureUniquePath = async (dir: string): Promise<string> => {
      const sep = dir.includes('\\') ? '\\' : '/'
      for (let i = 0; i < 50; i++) {
        const name = makeName()
        const full = dir.replace(/[\\/]+$/, '') + sep + name
        try { if (!(await exists(full as any))) return full } catch {}
      }
      // 极端情况下回退：使用时间戳毫秒
      const d = Date.now()
      return dir.replace(/[\\/]+$/, '') + (dir.includes('\\') ? '\\' : '/') + `pasted-${d}.png`
    }

    const writeTo = async (targetDir: string): Promise<string> => {
      try { await ensureDir(targetDir) } catch {}
      const dst = await ensureUniquePath(targetDir)
      const buf = new Uint8Array(await blobForSave.arrayBuffer())
      await writeFile(dst as any, buf as any)
      return dst
    }

    if (isTauriRuntime() && currentFilePath) {
      const base = currentFilePath.replace(/[\\/][^\\/]*$/, '')
      const sep = base.includes('\\') ? '\\' : '/'
      const imgDir = base + sep + 'images'
      console.log('[saveImageToLocal] 使用文档同目录 images 文件夹:', imgDir)
      const result = await writeTo(imgDir)
      console.log('[saveImageToLocal] 保存成功:', result)
      return result
    }
    if (isTauriRuntime() && !currentFilePath) {
      const baseDir = await getDefaultPasteDir()
      console.log('[saveImageToLocal] 使用默认粘贴目录:', baseDir)
      if (baseDir) {
        const base2 = baseDir.replace(/[\\/]+$/, '')
        const result = await writeTo(base2)
        console.log('[saveImageToLocal] 保存成功:', result)
        return result
      }
    }
    console.log('[saveImageToLocal] 没有合适的保存路径，返回 null')
    return null
  } catch (e) {
    console.error('[saveImageToLocal] 异常:', e)
    return null
  }
}

async function setWysiwygEnabled(enable: boolean) {
  try {
    if (wysiwyg === enable) return
    saveScrollPosition()  // 保存当前滚动位置到全局缓存
    wysiwyg = enable
    const container = document.querySelector('.container') as HTMLDivElement | null
    // 旧所见模式已移除：不要再添加 .wysiwyg，否则容器会被隐藏
    if (container) container.classList.remove('wysiwyg')
    // 先进入 loading 状态：不隐藏编辑器，避免空白期
    if (container && wysiwyg) { mode = 'edit'; container.classList.add('wysiwyg-v2'); container.classList.add('wysiwyg-v2-loading') }
    if (container && !wysiwyg) { container.classList.remove('wysiwyg-v2-loading'); container.classList.remove('wysiwyg-v2') }
  if (wysiwyg) {
      // 优先启用 V2：真实所见编辑视图
      try {
        console.log('[WYSIWYG] Enabling V2, editor.value length:', (editor.value || '').length)
        let root = document.getElementById('md-wysiwyg-root') as HTMLDivElement | null
        if (!root) {
          root = document.createElement('div')
          root.id = 'md-wysiwyg-root'
          const host = document.querySelector('.container') as HTMLDivElement | null
          if (host) host.appendChild(root)
        }
        // 确保 .scrollView 滚动容器存在（所见模式的实际滚动宿主）
        let scrollView = root.querySelector('.scrollView') as HTMLDivElement | null
        if (!scrollView) {
          scrollView = document.createElement('div')
          scrollView.className = 'scrollView'
          // 清空 root 并添加 scrollView
          root.innerHTML = ''
          root.appendChild(scrollView)
        }
        // 给 scrollView 一个占位提示，避免用户误以为空白
        try { if (scrollView) scrollView.textContent = '正在加载所见编辑器…' } catch {}
        // 调用 enableWysiwygV2 来创建/更新编辑器（会自动处理清理和重建）
        const __st = (editor as HTMLTextAreaElement).selectionStart >>> 0
        let __mdInit = (editor as HTMLTextAreaElement).value
        // 保留原有换行补两个空格的逻辑（行首/行尾软换行处理）
        try {
          if (__st > 0 && __mdInit[__st - 1] === '\n' && (__st < 2 || __mdInit[__st - 2] !== '\n')) {
            const before = __mdInit.slice(0, __st - 1)
            const after = __mdInit.slice(__st - 1)
            if (!/  $/.test(before)) { __mdInit = before + '  ' + after }
          }
        } catch {}
        // 剥离 YAML Front Matter：所见模式只编辑正文，但保存时拼回头部，保证文件内容零破坏
        const fmSplit = splitYamlFrontMatter(__mdInit)
        currentFrontMatter = fmSplit.frontMatter
        const __mdInitBody = fmSplit.body
        await enableWysiwygV2(scrollView!, __mdInitBody, (mdNext) => {
          try {
            const bodyNext = String(mdNext || '').replace(/\u2003/g, '&emsp;')
            const fm = currentFrontMatter || ''
            const combined = fm ? fm + bodyNext : bodyNext
            if (combined !== editor.value) {
              editor.value = combined
              dirty = true
              refreshTitle()
              refreshStatus()
            }
          } catch {}
        })
        wysiwygV2Active = true
        if (container) { container.classList.remove('wysiwyg-v2-loading'); container.classList.add('wysiwyg-v2'); }
        // 所见模式启用后应用当前缩放
        try { applyUiZoom() } catch {}
        // 更新外圈UI颜色（标题栏、侧栏等）跟随所见模式背景
        try { updateChromeColorsForMode('wysiwyg') } catch {}
        try { if (root) (root as HTMLElement).style.display = 'block' } catch {}
        try { preview.classList.add('hidden') } catch {}
        // 根据“库是否固定”应用布局：WYSIWYG V2 在固定库时仍占满全宽
        try { applyLibraryLayout() } catch {}
        // 移除旧滚轮处理器
        try { if (_wheelHandlerRef) { container?.removeEventListener('wheel', _wheelHandlerRef as any); _wheelHandlerRef = null } } catch {}
        // 取消右下角提示信息，避免遮挡与视觉噪声
        // 确保富文本视图获得焦点
        setTimeout(() => {
          try {
            const pm = root!.querySelector('.ProseMirror') as HTMLElement | null
            pm?.focus()
          } catch {}
        }, 0)
        // 若大纲面板当前可见，切换到所见模式后立即刷新大纲，并绑定观察/滚动
        try {
          const outline = document.getElementById('lib-outline') as HTMLDivElement | null
          if (outline && !outline.classList.contains('hidden')) {
            _outlineLastSignature = ''
            renderOutlinePanel()
            ensureOutlineObserverBound()
            bindOutlineScrollSync()
          }
        } catch {}
        restoreScrollPosition(3, 100)  // 带重试机制恢复滚动位置
        // 重新扫描滚动容器（确保 WYSIWYG 的 .scrollView 滚动监听器生效）
        try { rescanScrollContainers() } catch {}
        return
      } catch (e) {
        console.error('启用所见V2失败，将回退到旧模式', e)
        wysiwygV2Active = false
        // 若 V2 启动失败，需确保 loading 态与 v2 类被清理，避免根容器保持隐藏导致“空白/不可编辑”
        try {
          const container2 = document.querySelector('.container') as HTMLDivElement | null
          container2?.classList.remove('wysiwyg-v2-loading')
          container2?.classList.remove('wysiwyg-v2')
        } catch {}
      }
      // 进入所见模式时，清理一次延迟标记，避免历史状态影响
      wysiwygHoldInlineDollarUntilEnter = false
      wysiwygHoldFenceUntilEnter = false
      // 使用点状光标替代系统竖线光标
      try { if (container) container.classList.add('no-caret') } catch {}
      try { preview.classList.remove('hidden') } catch {}
      try { if (wysiwygStatusEl) wysiwygStatusEl.classList.add('show') } catch {}
      await renderPreview()
      try { updateWysiwygVirtualPadding() } catch {}
      syncScrollEditorToPreview()
      updateWysiwygLineHighlight(); updateWysiwygCaretDot(); startDotBlink()
    } else {
      if (wysiwygV2Active) {
        try { await disableWysiwygV2() } catch {}
        wysiwygV2Active = false
        if (container) container.classList.remove('wysiwyg-v2')
        // 右下角提示已取消，无需移除
      }
      try { applyLibraryLayout() } catch {}
      // 更新外圈UI颜色（标题栏、侧栏等）跟随当前模式背景
      try { updateChromeColorsForMode(mode === 'preview' ? 'preview' : 'edit') } catch {}
      if (mode !== 'preview') { try { preview.classList.add('hidden') } catch {} } else { try { preview.classList.remove('hidden') } catch {} }
      try { if (container) container.classList.remove('no-caret') } catch {}
      try { if (wysiwygStatusEl) wysiwygStatusEl.classList.remove('show') } catch {}
      // 退出所见后确保编辑器可编辑并聚焦
      try { (editor as HTMLTextAreaElement).disabled = false; (editor as HTMLTextAreaElement).style.pointerEvents = 'auto'; (editor as HTMLTextAreaElement).focus() } catch {}
      if (wysiwygLineEl) wysiwygLineEl.classList.remove('show')
      if (wysiwygCaretEl) wysiwygCaretEl.classList.remove('show')
      // 退出所见模式时清理延迟标记
      wysiwygHoldInlineDollarUntilEnter = false
      wysiwygHoldFenceUntilEnter = false
      stopDotBlink()
      // 若大纲面板当前可见，退出所见模式后也立即刷新大纲并绑定预览滚动同步
      try {
        const outline = document.getElementById('lib-outline') as HTMLDivElement | null
        if (outline && !outline.classList.contains('hidden')) {
          _outlineLastSignature = ''
          // 预览渲染可能稍后完成，延迟一次以确保提取到标题
          setTimeout(() => { try { renderOutlinePanel(); bindOutlineScrollSync() } catch {} }, 0)
        }
      } catch {}
      try { (editor as any).style.paddingBottom = '40px' } catch {}
      restoreScrollPosition(2, 50)  // 带重试机制恢复滚动位置
    }
    // 更新按钮提示（统一为简单说明，移除无用快捷键提示）
    try {
      const b = document.getElementById('btn-wysiwyg') as HTMLDivElement | null
      if (b) b.title = (wysiwyg ? '\u9000\u51fa' : '\u5f00\u542f') + '\u6240\u89c1\u6a21\u5f0f (Ctrl+W)'
    } catch {}
    // 触发模式变更事件（专注模式侧栏背景跟随）
    try { window.dispatchEvent(new CustomEvent('flymd:mode:changed', { detail: { wysiwyg } })) } catch {}
  } catch {}
}

async function toggleWysiwyg() {
  await setWysiwygEnabled(!wysiwyg)
  try { notifyModeChange() } catch {}
}

function updateWysiwygLineHighlight() {
  try {
    if (!wysiwyg || !wysiwygLineEl) return
    const st = editor.selectionStart >>> 0
    const before = editor.value.slice(0, st)
    const lineIdx = before.split('\n').length - 1
    _wysiwygCaretLineIndex = lineIdx
    const style = window.getComputedStyle(editor)
    let lh = parseFloat(style.lineHeight || '')
    if (!lh || Number.isNaN(lh)) {
      const fs = parseFloat(style.fontSize || '14') || 14
      lh = fs * 1.6
    }
    const padTop = parseFloat(style.paddingTop || '0') || 0
    const top = Math.max(0, Math.round(padTop + lineIdx * lh - editor.scrollTop))
    wysiwygLineEl.style.top = `${top}px`
    wysiwygLineEl.style.height = `${lh}px`
    // 不再显示高亮行，只更新位置（如需恢复，改为添加 show 类）
  } catch {}
}

function measureCharWidth(): number {
  try {
    const style = window.getComputedStyle(editor)
    const font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} / ${style.lineHeight} ${style.fontFamily}`
    if (_caretCharWidth > 0 && _caretFontKey === font) return _caretCharWidth
    const canvas = (measureCharWidth as any)._c || document.createElement('canvas')
    ;(measureCharWidth as any)._c = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return _caretCharWidth || 8
    ctx.font = font
    // 使用 '0' 作为等宽参考字符
    const w = ctx.measureText('0').width
    if (w && w > 0) { _caretCharWidth = w; _caretFontKey = font }
    return _caretCharWidth || 8
  } catch { return _caretCharWidth || 8 }
}

// ����ģʽ������Ҫ�����滬���ƶ���꣬�������ƶ����еļ�����λ���ĳߴ硣
function advanceVisualColumn(column: number, code: number): number {
  if (code === 13 /* \r */) return column
  if (code === 9 /* \t */) {
    const modulo = column % 4
    const step = modulo === 0 ? 4 : 4 - modulo
    return column + step
  }
  return column + 1
}

function calcVisualColumn(segment: string): number {
  let col = 0
  for (let i = 0; i < segment.length; i++) {
    col = advanceVisualColumn(col, segment.charCodeAt(i))
  }
  return col
}

function offsetForVisualColumn(line: string, column: number): number {
  if (!Number.isFinite(column) || column <= 0) return 0
  let col = 0
  for (let i = 0; i < line.length; i++) {
    const code = line.charCodeAt(i)
    const next = advanceVisualColumn(col, code)
    if (next >= column) return i + 1
    col = next
  }
  return line.length
}

function moveWysiwygCaretByLines(deltaLines: number, preferredColumn?: number): number {
  try {
    if (!wysiwyg) return 0
    if (!Number.isFinite(deltaLines) || deltaLines === 0) return 0
    if (editor.selectionStart !== editor.selectionEnd) return 0
    const value = editor.value
    if (!value) return 0
    const len = value.length
    let pos = editor.selectionStart >>> 0
    let lineStart = pos
    while (lineStart > 0 && value.charCodeAt(lineStart - 1) !== 10) lineStart--
    const currentSegment = value.slice(lineStart, pos)
    let column = Number.isFinite(preferredColumn) ? Number(preferredColumn) : calcVisualColumn(currentSegment)
    if (!Number.isFinite(column) || column < 0) column = 0
    const steps = deltaLines > 0 ? Math.floor(deltaLines) : Math.ceil(deltaLines)
    if (steps === 0) return 0
    let moved = 0
    if (steps > 0) {
      let remaining = steps
      while (remaining > 0) {
        const nextNl = value.indexOf('\n', lineStart)
        if (nextNl < 0) { lineStart = len; break }
        lineStart = nextNl + 1
        moved++
        remaining--
      }
    } else {
      let remaining = steps
      while (remaining < 0) {
        if (lineStart <= 0) { lineStart = 0; break }
        const prevNl = value.lastIndexOf('\n', Math.max(0, lineStart - 2))
        lineStart = prevNl >= 0 ? prevNl + 1 : 0
        moved--
        remaining++
      }
    }
    if (moved === 0) return 0
    let lineEnd = value.indexOf('\n', lineStart)
    if (lineEnd < 0) lineEnd = len
    const targetLine = value.slice(lineStart, lineEnd)
    const offset = offsetForVisualColumn(targetLine, column)
    const newPos = lineStart + offset
    editor.selectionStart = editor.selectionEnd = newPos
    return moved
  } catch { return 0 }
}

function updateWysiwygCaretDot() {
  try {
    if (!wysiwyg || !wysiwygCaretEl) return
    // 方案A：使用原生系统光标，禁用自定义覆盖光标
    try { wysiwygCaretEl.classList.remove('show') } catch {}
    const st = editor.selectionStart >>> 0
    const before = editor.value.slice(0, st)
    const style = window.getComputedStyle(editor)
    // 行高
    let lh = parseFloat(style.lineHeight || '')
    if (!lh || Number.isNaN(lh)) { const fs = parseFloat(style.fontSize || '14') || 14; lh = fs * 1.6 }
    const padTop = parseFloat(style.paddingTop || '0') || 0
    const padLeft = parseFloat(style.paddingLeft || '0') || 0
    // 计算当前行与列
    const lastNl = before.lastIndexOf('\n')
    const colStr = lastNl >= 0 ? before.slice(lastNl + 1) : before
    const lineIdx = before.split('\n').length - 1
    // 制表符按 4 个空格估算
    const tab4 = (s: string) => s.replace(/\t/g, '    ')
    const colLen = tab4(colStr).length
    _wysiwygCaretVisualColumn = colLen
    const ch = measureCharWidth()
    const top = Math.max(0, Math.round(padTop + lineIdx * lh - editor.scrollTop))
    const left = Math.max(0, Math.round(padLeft + colLen * ch - editor.scrollLeft))
    // 将光标放在当前行底部，并略微向下微调
    const caretH = (() => { try { return parseFloat(window.getComputedStyle(wysiwygCaretEl).height || '2') || 2 } catch { return 2 } })()
    const baseNudge = 1 // 像素级微调，使光标更贴近底部
    wysiwygCaretEl.style.top = `${Math.max(0, Math.round(top + lh - caretH + baseNudge))}px`
    wysiwygCaretEl.style.left = `${left}px`
    wysiwygCaretEl.classList.add('show')
  } catch {}
}

function updateWysiwygVirtualPadding() {
  try {
    const base = 40 // 与 CSS 中 editor 底部 padding 对齐
    if (!wysiwyg) { try { (editor as any).style.paddingBottom = base + "px" } catch {} ; return }
    const er = Math.max(0, editor.scrollHeight - editor.clientHeight)
    const pr = Math.max(0, preview.scrollHeight - preview.clientHeight)
    const need = Math.max(0, pr - er)
    const pb = Math.min(100000, Math.round(base + need))
    try { (editor as any).style.paddingBottom = pb + "px" } catch {}
  } catch {}
}


// 所见模式：输入 ``` 后自动补一个换行，避免预览代码块遮挡模拟光标
// WYSIWYG 
// 在所见模式下，确保预览中的“模拟光标 _”可见
function ensureWysiwygCaretDotInView() {
  try {
    if (!wysiwyg) return
    const dot = preview.querySelector('.caret-dot') as HTMLElement | null
    if (!dot) return
    const pv = preview.getBoundingClientRect()
    const dr = dot.getBoundingClientRect()
    const margin = 10
    if (dr.top < pv.top + margin) {
      preview.scrollTop += dr.top - (pv.top + margin)
    } else if (dr.bottom > pv.bottom - margin) {
      preview.scrollTop += dr.bottom - (pv.bottom - margin)
    }
  } catch {}
}

function autoNewlineAfterBackticksInWysiwyg() {
  try {
    if (!wysiwyg) return
    const pos = editor.selectionStart >>> 0
    if (pos < 3) return
    const last3 = editor.value.slice(pos - 3, pos)
    if (last3 === '```' || last3 === '~~~') {
      const v = editor.value
      // 判断是否为“闭合围栏”：需要位于行首（至多 3 个空格）并且之前处于围栏内部，且围栏字符一致
      const before = v.slice(0, pos)
      const lineStart = before.lastIndexOf('\n') + 1
      const curLine = before.slice(lineStart)
      const fenceRE = /^ {0,3}(```+|~~~+)/
      const preText = v.slice(0, lineStart)
      const preLines = preText.split('\n')
      let insideFence = false
      let fenceCh = ''
      for (const ln of preLines) {
        const m = ln.match(fenceRE)
        if (m) {
          const ch = m[1][0]
          if (!insideFence) { insideFence = true; fenceCh = ch }
          else if (ch === fenceCh) { insideFence = false; fenceCh = '' }
        }
      }
      const m2 = curLine.match(fenceRE)
      const isClosing = !!(m2 && insideFence && m2[1][0] === last3[0])

      // 在光标处插入换行，但将光标保持在换行前，便于继续输入语言标识（如 ```js\n）
      editor.value = v.slice(0, pos) + '\n' + v.slice(pos)
      editor.selectionStart = editor.selectionEnd = pos
      dirty = true
      refreshTitle()

      // 若检测到闭合，则开启“需回车再渲染”的围栏延迟
      if (isClosing) {
        wysiwygHoldFenceUntilEnter = true
      }
    }
  } catch {}
}

// 所见模式：行内数学 $...$ 闭合后，自动在光标处后插入至少 2 个换行，避免新内容与公式渲染重叠
function autoNewlineAfterInlineDollarInWysiwyg() {
  try {
    if (!wysiwyg) return
    const pos = editor.selectionStart >>> 0
    if (pos < 1) return
    const v = editor.value
    // 仅在最新输入字符为 $ 时判定
    if (v[pos - 1] !== '$') return
    // 若是 $$（块级），不处理
    if (pos >= 2 && v[pos - 2] === '$') return

    // 判断是否在代码围栏内，是则不处理
    const before = v.slice(0, pos)
    const lineStart = before.lastIndexOf('\n') + 1
    const fenceRE = /^ {0,3}(```+|~~~+)/
    const preText = v.slice(0, lineStart)
    const preLines = preText.split('\n')
    let insideFence = false
    let fenceCh = ''
    for (const ln of preLines) {
      const m = ln.match(fenceRE)
      if (m) {
        const ch = m[1][0]
        if (!insideFence) { insideFence = true; fenceCh = ch }
        else if (ch === fenceCh) { insideFence = false; fenceCh = '' }
      }
    }
    if (insideFence) return

    // 当前整行（用于检测行内 $ 奇偶）
    const lineEnd = (() => { const i = v.indexOf('\n', lineStart); return i < 0 ? v.length : i })()
    const line = v.slice(lineStart, lineEnd)
    const upto = v.slice(lineStart, pos) // 行首到光标（含刚输入的 $）

    // 统计“未被转义、且不是 $$ 的单个 $”数量
    let singles = 0
    let lastIdx = -1
    for (let i = 0; i < upto.length; i++) {
      if (upto[i] !== '$') continue
      // 跳过 $$（块级）
      if (i + 1 < upto.length && upto[i + 1] === '$') { i++; continue }
      // 跳过转义 \$（奇数个反斜杠）
      let bs = 0
      for (let j = i - 1; j >= 0 && upto[j] === '\\'; j--) bs++
      if ((bs & 1) === 1) continue
      singles++
      lastIdx = i
    }

    // 若刚好闭合（奇->偶）且最后一个单 $ 就是刚输入的这个
    if (singles % 2 === 0 && lastIdx === upto.length - 1) {
      // 行内数学已闭合：延迟渲染，待用户按下回车键后再渲染
      wysiwygHoldInlineDollarUntilEnter = true
      // 仅在当前位置之后补足至少 2 个换行
      let have = 0
      for (let i = pos; i < v.length && i < pos + 3; i++) { if (v[i] === '\n') have++; else break }
      const need = Math.max(0, 3 - have)
      if (need > 0) {
        const ins = '\n'.repeat(need)
        editor.value = v.slice(0, pos) + ins + v.slice(pos)
        const newPos = pos + ins.length
        editor.selectionStart = editor.selectionEnd = newPos
        dirty = true
        refreshTitle()
        refreshStatus()
      }
    }
  } catch {}
}

// 动态添加菜单栏补充项（库 / 关于 / 语言等）
const menubar = document.querySelector('.menubar') as HTMLDivElement
if (menubar) {
  // 顶级“文件”按钮文案统一走 i18n
  const btnOpen0 = document.getElementById('btn-open') as HTMLDivElement | null
  if (btnOpen0) { btnOpen0.textContent = t('menu.file'); btnOpen0.title = t('menu.file') }

  // 扩展按钮（如未在首屏模板中渲染，则此处补充）
  try {
    const exists = document.getElementById('btn-extensions') as HTMLDivElement | null
    if (!exists) {
      const extBtn = document.createElement('div')
      extBtn.id = 'btn-extensions'
      extBtn.className = 'menu-item'
      extBtn.title = t('menu.extensions')
      extBtn.textContent = t('menu.extensions')
      menubar.appendChild(extBtn)
    }
  } catch {}

  // “库”按钮：插入到“文件”按钮左侧
  const libBtn = document.createElement('div')
  libBtn.id = 'btn-library'
  libBtn.className = 'menu-item'
  libBtn.title = t('lib.menu')
  libBtn.textContent = t('lib.menu')
  const openBtnRef = document.getElementById('btn-open') as HTMLDivElement | null
  if (openBtnRef && openBtnRef.parentElement === menubar) {
    menubar.insertBefore(libBtn, openBtnRef)
  } else {
    menubar.insertBefore(libBtn, menubar.firstChild)
  }

  // 确保“新建”按钮紧随库按钮之后
  try {
    const newBtnRef = document.getElementById('btn-new') as HTMLDivElement | null
    if (newBtnRef && newBtnRef.parentElement === menubar) {
      menubar.insertBefore(newBtnRef, libBtn.nextSibling)
    }
  } catch {}

  // 关于 / 更新按钮
  const aboutBtn = document.createElement('div')
  aboutBtn.id = 'btn-about'
  aboutBtn.className = 'menu-item'
  aboutBtn.title = t('menu.about')
  aboutBtn.textContent = t('menu.about')
  const updBtn = document.createElement('div')
  updBtn.id = 'btn-update'
  updBtn.className = 'menu-item'
  updBtn.title = t('menu.update')
  updBtn.textContent = t('menu.update')
  menubar.appendChild(updBtn)
  menubar.appendChild(aboutBtn)

  // 语言切换按钮：移动到标题栏右侧（紧随文件名之后）
  const langBtn = document.createElement('div')
  langBtn.id = 'btn-lang'
  langBtn.className = 'menu-item'
  langBtn.title = t('menu.language')
  try { setIconButton(langBtn, 'fa-solid fa-globe', t('menu.language')) } catch { langBtn.textContent = 'Lang' }
  try {
    const titlebar = document.querySelector('.titlebar') as HTMLDivElement | null
    const extBtn = document.getElementById('btn-extensions') as HTMLDivElement | null
    const themeBtn = document.getElementById('btn-theme') as HTMLDivElement | null
    const fileNameEl = document.querySelector('.titlebar .filename') as HTMLDivElement | null
    if (titlebar && extBtn) {
      try { extBtn.remove() } catch {}
      if (themeBtn) { try { themeBtn.remove() } catch {} }
      if (fileNameEl && fileNameEl.parentElement === titlebar) {
        // 顺序：主题 | 扩展 | 语言
        titlebar.insertBefore(extBtn, fileNameEl.nextSibling)
        if (themeBtn) titlebar.insertBefore(themeBtn, extBtn)
        titlebar.insertBefore(langBtn, extBtn.nextSibling)
      } else {
        if (themeBtn) titlebar.appendChild(themeBtn)
        titlebar.appendChild(extBtn)
        titlebar.appendChild(langBtn)
      }
    } else if (titlebar) {
      // 兜底：找不到扩展按钮时，将语言图标与主题放在文件名后
      if (fileNameEl && fileNameEl.parentElement === titlebar) {
        if (themeBtn) titlebar.insertBefore(themeBtn, fileNameEl.nextSibling)
        titlebar.insertBefore(langBtn, (themeBtn || fileNameEl).nextSibling)
      } else {
        if (themeBtn) titlebar.appendChild(themeBtn)
        titlebar.appendChild(langBtn)
      }
    } else {
      // 再兜底：仍未获取到 titlebar，则临时放回 menubar 末尾
      if (themeBtn) menubar.appendChild(themeBtn)
      menubar.appendChild(langBtn)
    }
  } catch {}
}
const containerEl = document.querySelector('.container') as HTMLDivElement
// Ctrl/Cmd + 滚轮：缩放/放大编辑、预览、所见模式字号；Shift + 滚轮：调整阅读宽度
try {
  const wheelZoom = (e: WheelEvent) => {
    try {
      const dyRaw = e.deltaY
      const dxRaw = e.deltaX
      const dy = (Math.abs(dyRaw) >= Math.abs(dxRaw) ? dyRaw : dxRaw) || 0
      // Ctrl/Cmd + 滚轮：优先处理，避免与其他组合键冲突
      if (e.ctrlKey || e.metaKey) {
        if (!dy) return
        e.preventDefault()
        if (dy < 0) zoomIn(); else if (dy > 0) zoomOut()
        showZoomBubble()
        return
      }
      // Shift + 滚轮：调整阅读/所见最大宽度（部分系统下 Shift 会把滚轮映射为横向滚动，需要兼容 deltaX）
      if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (!dy) return
        e.preventDefault()
        const cur = getPreviewWidth()
        const delta = dy < 0 ? PREVIEW_WIDTH_STEP : -PREVIEW_WIDTH_STEP
        setPreviewWidth(cur + delta)
        showWidthBubble()
        return
      }
    } catch {}
  }
  // 容器上监听，passive: false 以便阻止默认行为（浏览器页面缩放）
  if (containerEl) containerEl.addEventListener('wheel', wheelZoom, { passive: false })
  // 绑定“重置缩放”按钮
  try {
    const btn = document.getElementById('zoom-reset') as HTMLButtonElement | null
    if (btn) btn.addEventListener('click', () => { try { zoomReset() } catch {} })
  } catch {}
} catch {}

// 初始化应用缩放：读取已保存缩放并应用到编辑/预览/WYSIWYG
try { applyUiZoom() } catch {}
// 初始化阅读/所见宽度：读取已保存宽度并应用到预览/所见容器
try { applyPreviewWidth() } catch {}

// ===== 缩放气泡（类似 Edge） =====
let _zoomBubbleTimer: number | null = null
function ensureZoomBubble(): HTMLDivElement | null {
  try {
    let el = document.getElementById('zoom-bubble') as HTMLDivElement | null
    if (!el) {
      el = document.createElement('div')
      el.id = 'zoom-bubble'
      el.className = 'zoom-bubble hidden'
      el.innerHTML = `
        <span id="zoom-bubble-label">100%</span>
        <button id="zoom-bubble-reset" class="zoom-reset-btn" title="重置缩放" aria-label="重置缩放">⟲ 重置</button>
      `
      document.body.appendChild(el)
      const btn = el.querySelector('#zoom-bubble-reset') as HTMLButtonElement | null
      if (btn) btn.addEventListener('click', () => { try { zoomReset(); showZoomBubble() } catch {} })
    }
    return el
  } catch { return null }
}
function showZoomBubble(): void {
  try {
    const el = ensureZoomBubble(); if (!el) return
    const label = el.querySelector('#zoom-bubble-label') as HTMLSpanElement | null
    if (label) label.textContent = Math.round(getUiZoom() * 100) + '%'
    el.classList.remove('hidden')
    el.classList.add('show')
    if (_zoomBubbleTimer != null) { window.clearTimeout(_zoomBubbleTimer); _zoomBubbleTimer = null }
      _zoomBubbleTimer = window.setTimeout(() => {
      try { el!.classList.remove('show'); el!.classList.add('hidden') } catch {}
      _zoomBubbleTimer = null
    }, 1000)
  } catch {}
}

// 阅读宽度气泡：Shift+滚轮调整时提示并提供重置按钮
let _widthBubbleTimer: number | null = null
function ensureWidthBubble(): HTMLDivElement | null {
  try {
    let el = document.getElementById('width-bubble') as HTMLDivElement | null
    if (!el) {
      el = document.createElement('div')
      el.id = 'width-bubble'
      el.className = 'zoom-bubble width-bubble hidden'
      el.innerHTML = `
        <span id="width-bubble-label">860px</span>
        <button id="width-bubble-reset" class="zoom-reset-btn" title="重置阅读宽度" aria-label="重置阅读宽度">重置</button>
      `
      document.body.appendChild(el)
      const btn = el.querySelector('#width-bubble-reset') as HTMLButtonElement | null
      if (btn) btn.addEventListener('click', () => { try { resetPreviewWidth(); showWidthBubble() } catch {} })
    }
    return el
  } catch { return null }
}
function showWidthBubble(): void {
  try {
    const el = ensureWidthBubble(); if (!el) return
    const label = el.querySelector('#width-bubble-label') as HTMLSpanElement | null
    if (label) label.textContent = Math.round(getPreviewWidth()) + 'px'
    el.classList.remove('hidden')
    el.classList.add('show')
    if (_widthBubbleTimer != null) { window.clearTimeout(_widthBubbleTimer); _widthBubbleTimer = null }
    _widthBubbleTimer = window.setTimeout(() => {
      try { el!.classList.remove('show'); el!.classList.add('hidden') } catch {}
      _widthBubbleTimer = null
    }, 2000)
  } catch {}
}

// ===== 通知系统（支持多消息堆叠显示） =====
type NotificationType =
  | 'sync'
  | 'extension'
  | 'appUpdate'
  | 'plugin-success'
  | 'plugin-error'
  | 'mode-edit'
  | 'mode-preview'
  | 'mode-wysiwyg'

interface NotificationConfig {
  icon: string
  bgColor: string
  duration: number
  clickable?: boolean
}

interface NotificationItem {
  id: string
  type: NotificationType
  message: string
  element: HTMLDivElement
  timer: number | null
  onClick?: () => void
}

class NotificationManager {
  private static container: HTMLDivElement | null = null
  private static notifications: Map<string, NotificationItem> = new Map()
  private static idCounter = 0

  private static readonly configs: Record<NotificationType, NotificationConfig> = {
    sync: {
      icon: '<i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i>',
      bgColor: 'rgba(127,127,127,0.08)',
      duration: 5000
    },
    extension: {
      icon: '<i class="fa-solid fa-bell" aria-hidden="true"></i>',
      bgColor: 'rgba(34,197,94,0.12)',
      duration: 5000
    },
    appUpdate: {
      icon: '<i class="fa-solid fa-circle-up" aria-hidden="true"></i>',
      bgColor: 'rgba(59,130,246,0.12)',
      duration: 10000,
      clickable: true
    },
    'plugin-success': {
      icon: '<i class="fa-solid fa-circle-check" aria-hidden="true"></i>',
      bgColor: 'rgba(34,197,94,0.12)', // 浅绿色
      duration: 2000
    },
    'plugin-error': {
      icon: '<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>',
      bgColor: 'rgba(239,68,68,0.12)', // 浅红色（red-500）
      duration: 3000
    },
    'mode-edit': {
      icon: '<i class="fa-solid fa-pen" aria-hidden="true"></i>',
      bgColor: 'rgba(59,130,246,0.14)', // 源码模式：偏蓝
      duration: 1600
    },
    'mode-preview': {
      icon: '<i class="fa-solid fa-book-open" aria-hidden="true"></i>',
      bgColor: 'rgba(245,158,11,0.16)', // 阅读模式：偏暖
      duration: 1600
    },
    'mode-wysiwyg': {
      icon: '<i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>',
      bgColor: 'rgba(139,92,246,0.16)', // 所见模式：偏紫
      duration: 1600
    }
  }

  private static ensureContainer(): HTMLDivElement {
    if (this.container && document.body.contains(this.container)) {
      return this.container
    }

    // 查找已存在的容器（兼容旧的 sync-status）
    let el = document.getElementById('notification-container') as HTMLDivElement | null
    if (!el) {
      el = document.getElementById('sync-status') as HTMLDivElement | null
      if (el) {
        el.id = 'notification-container'
        el.className = 'notification-container'
        el.innerHTML = ''
      }
    }

    if (!el) {
      el = document.createElement('div')
      el.id = 'notification-container'
      el.className = 'notification-container'
      document.body.appendChild(el)
    }

    this.container = el
    return el
  }

  static show(type: NotificationType, message: string, duration?: number, onClick?: () => void): string {
    try {
      const container = this.ensureContainer()
      const config = this.configs[type]
      const id = `notification-${++this.idCounter}`

      // 创建通知元素
      const item = document.createElement('div')
      item.className = 'notification-item' + (config.clickable ? ' clickable' : '')
      item.style.backgroundColor = config.bgColor
      item.innerHTML = `<span class="notification-icon">${config.icon}</span> <span class="notification-text">${message}</span>`

      // 点击事件
      if (onClick) {
        item.addEventListener('click', () => {
          onClick()
          this.hide(id)
        })
      }

      // 添加到容器
      container.appendChild(item)

      // 设置自动清除定时器
      const finalDuration = duration !== undefined ? duration : config.duration
      const timer = finalDuration > 0 ? window.setTimeout(() => {
        this.hide(id)
      }, finalDuration) : null

      // 保存通知信息
      this.notifications.set(id, {
        id,
        type,
        message,
        element: item,
        timer,
        onClick
      })

      return id
    } catch (e) {
      console.error('[Notification] 显示通知失败', e)
      return ''
    }
  }

  static hide(id: string): void {
    try {
      const notification = this.notifications.get(id)
      if (!notification) return

      // 清除定时器
      if (notification.timer !== null) {
        window.clearTimeout(notification.timer)
      }

      // 淡出动画
      notification.element.style.opacity = '0'
      setTimeout(() => {
        try {
          notification.element.remove()
        } catch {}
      }, 200)

      this.notifications.delete(id)
    } catch (e) {
      console.error('[Notification] 隐藏通知失败', e)
    }
  }

  static hideAll(): void {
    try {
      this.notifications.forEach((_, id) => this.hide(id))
    } catch {}
  }

  static updateMessage(id: string, message: string): void {
    try {
      const notification = this.notifications.get(id)
      if (!notification) return

      const textEl = notification.element.querySelector('.notification-text')
      if (textEl) {
        textEl.textContent = message
        notification.message = message
      }
    } catch {}
  }
}

// 模式切换提示：在右下角通知区域显示当前模式
function notifyModeChange(): void {
  try {
    const isWys = !!wysiwyg
    const curMode = mode
    let type: NotificationType
    let msg: string
    if (isWys) {
      type = 'mode-wysiwyg'
      msg = '所见模式'
    } else if (curMode === 'preview') {
      type = 'mode-preview'
      msg = '阅读模式'
    } else {
      type = 'mode-edit'
      msg = '源码模式'
    }
    NotificationManager.show(type, msg, 1600)
  } catch {}
}

// 向后兼容：保留旧的 sync-status 接口
function updateSyncStatus(msg: string): void {
  // 直接使用新的通知系统
  NotificationManager.show('sync', msg)
}

let _wheelHandlerRef: ((e: WheelEvent)=>void) | null = null
  if (containerEl) {
  // 修复在所见模式中滚轮无法滚动编辑区的问题：
  // 在容器层捕获 wheel 事件，直接驱动 textarea 的滚动并同步预览
  // 旧所见模式移除：不再绑定容器层滚轮处理器
  // 所见模式：当前行高亮覆盖层
  try {
    wysiwygLineEl = document.createElement('div') as HTMLDivElement
    wysiwygLineEl.id = 'wysiwyg-line'
    wysiwygLineEl.className = 'wysiwyg-line'
    containerEl.appendChild(wysiwygLineEl)
    wysiwygCaretEl = document.createElement('div') as HTMLDivElement
wysiwygCaretEl.id = 'wysiwyg-caret'
    wysiwygCaretEl.className = 'wysiwyg-caret'
    containerEl.appendChild(wysiwygCaretEl)
    // 旧所见模式移除：不再创建覆盖部件
  } catch {}
  const panel = document.createElement('div')
  panel.id = 'recent-panel'
  panel.className = 'recent-panel hidden'
  containerEl.appendChild(panel)

  // �ĵ��ⲿ(�ⲿ)
    const library = document.createElement('div')
  library.id = 'library'
  library.className = 'library hidden side-left'
  library.innerHTML = `
    <div class="lib-header">
      <div class="lib-title-row">
        <button class="lib-choose-btn" id="lib-choose">${t('lib.choose')}</button>
        <div class="lib-name" id="lib-path"></div>
        <button class="lib-settings-btn" id="lib-settings" title="${t('ext.settings')}"><i class="fa-solid fa-gear" aria-hidden="true"></i><span class="sr-only">${t('ext.settings')}</span></button>
        <button class="lib-toggle-btn" id="lib-toggle"><i class="fa-solid fa-angles-left" aria-hidden="true"></i><span class="sr-only">收起侧栏</span></button>
      </div>
        <div class="lib-actions">
          <button class="lib-action-btn active" id="lib-tab-files">${t('tab.files')}</button>
          <button class="lib-action-btn" id="lib-tab-outline">${t('tab.outline')}</button>
          <button class="lib-action-btn" id="lib-refresh">${t('lib.refresh')}</button>
          <button class="lib-action-btn" id="lib-side">${t('lib.side.left')}</button>
          <button class="lib-action-btn" id="lib-pin">${t('lib.pin.auto')}</button>
        </div>
      </div>
      <div class="lib-tree" id="lib-tree"></div>
    <div class="lib-outline hidden" id="lib-outline"></div>
  `
  containerEl.appendChild(library)
  try { initLibrarySwipeGesture() } catch {}
  // 创建边缘唤醒热区（默认隐藏）
  try {
    _libEdgeEl = document.createElement('div') as HTMLDivElement
    _libEdgeEl.id = 'lib-edge'
    _libEdgeEl.style.position = 'absolute'
    _libEdgeEl.style.left = '0'
    _libEdgeEl.style.top = '0'
    _libEdgeEl.style.bottom = '0'
    _libEdgeEl.style.width = '6px' // 热区宽度
    _libEdgeEl.style.zIndex = '14'
    _libEdgeEl.style.pointerEvents = 'auto'
    _libEdgeEl.style.background = 'transparent'
    _libEdgeEl.style.display = 'none'
    _libEdgeEl.addEventListener('mouseenter', () => { try { if (!libraryDocked) showLibrary(true, false) } catch {} })
    containerEl.appendChild(_libEdgeEl)
  } catch {}
  try {
    const elPath = library.querySelector('#lib-path') as HTMLDivElement | null
    // 去除"未选择库目录"默认提示，保持为空，避免长期提示误导
    if (elPath) elPath.textContent = ''
    // 初次渲染尝试同步库路径显示（若已存在旧配置）
    try { void refreshLibraryUiAndTree(false) } catch {}
    // 绑定标签页切换：目录 / 大纲
      const tabFiles = library.querySelector('#lib-tab-files') as HTMLButtonElement | null
      const tabOutline = library.querySelector('#lib-tab-outline') as HTMLButtonElement | null
      const treeEl = library.querySelector('#lib-tree') as HTMLDivElement | null
      const outlineEl = document.getElementById('lib-outline') as HTMLDivElement | null
      function activateLibTab(kind: 'files' | 'outline') {
        try {
          tabFiles?.classList.toggle('active', kind === 'files')
          tabOutline?.classList.toggle('active', kind === 'outline')
          if (treeEl) {
            const hideTree = (outlineLayout === 'embedded') && (kind !== 'files')
            treeEl.classList.toggle('hidden', hideTree)
          }
          if (outlineEl) {
            const hideOutline = (outlineLayout === 'embedded') && (kind !== 'outline')
            outlineEl.classList.toggle('hidden', hideOutline)
          }
          if (kind === 'outline') { try { renderOutlinePanel() } catch {} }
        } catch {}
      }
      tabFiles?.addEventListener('click', () => activateLibTab('files'))
      tabOutline?.addEventListener('click', () => activateLibTab('outline'))
      // 大纲标签右键菜单：选择“嵌入 / 剥离 / 右侧”三种布局
      tabOutline?.addEventListener('contextmenu', (ev) => {
        try { ev.preventDefault() } catch {}
        try { showOutlineLayoutMenu(ev.clientX, ev.clientY) } catch {}
      })
    // 绑定固定/自动切换按钮
      const elPin = library.querySelector('#lib-pin') as HTMLButtonElement | null
    if (elPin) {
      ;(async () => {
        try {
          libraryDocked = await getLibraryDocked()
          setIconButton(elPin, 'fa-solid fa-thumbtack', libraryDocked ? t('lib.pin.auto') : t('lib.pin.fixed'))
          applyLibraryLayout()
        } catch {}
      })()
      elPin.addEventListener('click', () => { void setLibraryDocked(!libraryDocked) })
    }
      const elSide = library.querySelector('#lib-side') as HTMLButtonElement | null
    if (elSide) {
      updateLibrarySideButton()
      elSide.addEventListener('click', () => {
        void setLibrarySide(librarySide === 'left' ? 'right' : 'left')
      })
    }
      const settingsBtn = library.querySelector('#lib-settings') as HTMLButtonElement | null
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => { void openSettingsOverlay() })
      }
        // 绑定侧栏收起/展开按钮
        const elToggle = library.querySelector('#lib-toggle') as HTMLButtonElement | null
        if (elToggle) {
          elToggle.addEventListener('click', () => {
            try {
              showLibrary(false)
            } catch {}
          })
        }
    } catch {}
  // 创建浮动展开按钮（侧栏隐藏时显示，仅在专注模式）
  try {
    const floatToggle = document.createElement('button')
    floatToggle.id = 'lib-float-toggle'
    floatToggle.className = 'lib-float-toggle side-left'
    setIconButton(floatToggle, 'fa-solid fa-angles-right', t('lib.menu'))
    floatToggle.addEventListener('click', () => {
      try {
        showLibrary(true, false)
      } catch {}
    })
    containerEl.appendChild(floatToggle)
    _libFloatToggleEl = floatToggle
    // 初始化状态：如果侧栏此刻是隐藏的，直接显示展开按钮
    try {
      const isHidden = library.classList.contains('hidden')
      floatToggle.classList.toggle('show', isHidden)
    } catch {}
    // 监听侧栏显示/隐藏状态，切换浮动按钮显示
    const observer = new MutationObserver(() => {
      try {
        const isHidden = library.classList.contains('hidden')
        floatToggle.classList.toggle('show', isHidden)
      } catch {}
    })
    observer.observe(library, { attributes: true, attributeFilter: ['class'] })
  } catch {}
  // 恢复库侧栏上次的可见状态
  ;(async () => {
    try {
      const visible = await getLibraryVisible()
      libraryVisible = visible
      showLibrary(visible, false)
    } catch {
      showLibrary(libraryVisible, false)
    }
  })()
        // 重新创建关于对话框并挂载
        const about = document.createElement('div')
        about.id = 'about-overlay'
        about.className = 'about-overlay sheet-overlay hidden'
        about.setAttribute('aria-hidden', 'true')
        about.innerHTML = `
          <div class="about-dialog sheet-panel" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <div class="about-header">
              <div id="about-title">${t('about.title')}  v${APP_VERSION}</div>
              <button id="about-close" class="about-close" title="${t('about.close')}">×</button>
            </div>
            <div class="about-body">
              <p>${t('about.tagline')}</p>
            </div>
          </div>
        `
        containerEl.appendChild(about)
        try {
          const dialog = about.querySelector('.about-dialog') as HTMLDivElement | null
          attachBottomSheetSwipe(about, dialog, () => showAbout(false))
        } catch {}
        try {
          const aboutBody = about.querySelector('.about-body') as HTMLDivElement | null
          if (aboutBody) {
            aboutBody.innerHTML = `
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <img src="${goodImgUrl}" alt="flyMD" style="width:72px;height:72px;border-radius:8px;object-fit:cover;"/>
                <div>
                  <p>一款跨平台、轻量稳定好用的 Markdown 编辑与PDF阅读工具。</p>
                  <p style="margin:6px 0 0;color:var(--muted);font-size:12px;">开源协议：非商业开源（NC 1.0）。商业使用需授权。</p>
                  <p style="margin:4px 0 0;"><a href="https://github.com/flyhunterl/flymd/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">查看完整许可文本</a></p>
                  
                </div>
              </div>
            `
          }
          const aboutTitle = about.querySelector('#about-title') as HTMLDivElement | null
          if (aboutTitle) aboutTitle.textContent = `${t('about.title')} FlyMD v${APP_VERSION}`
          const aboutClose = about.querySelector('#about-close') as HTMLButtonElement | null
          if (aboutClose) { aboutClose.textContent = '×'; aboutClose.title = t('about.close') }
          // 覆盖关于内容：移除快捷键，加入离线二维码与许可说明
          try {
            const bodyEl = about.querySelector('.about-body') as HTMLDivElement | null
            if (bodyEl) {
              bodyEl.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
                  <p>${t('about.tagline')}</p>
                  <img src="${goodImgUrl}" alt="二维码" style="width:320px;height:320px;border-radius:0;object-fit:contain;"/>
                  <div style="text-align:center;">
                    <p style="margin:6px 0 0;color:var(--muted);font-size:12px;">${t('about.license.brief')}</p>
                    <p style="margin:4px 0 0;"><a href="https://github.com/flyhunterl/flymd/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">${t('about.license.link')}</a></p>
                    
                  </div>
                </div>
              `
            }
          } catch {}
        } catch {}
    try {
    const overlay = document.getElementById('about-overlay') as HTMLDivElement | null
    const dialog = overlay?.querySelector('.about-dialog') as HTMLDivElement | null
    if (dialog) {
      const footer = document.createElement('div')
      footer.className = 'about-footer'
      footer.innerHTML = '<div class="about-footer-links">\
<a href="https://flymd.llingfei.com/" target="_blank" rel="noopener noreferrer">\
  <img class="favicon" src="https://icons.duckduckgo.com/ip3/flymd.llingfei.com.ico" alt="" referrerpolicy="no-referrer"/>官方网站\
</a><span class="sep">&nbsp;&nbsp;</span>\
<a href="https://www.llingfei.com" target="_blank" rel="noopener noreferrer">\
  <img class="favicon" src="https://icons.duckduckgo.com/ip3/www.llingfei.com.ico" alt="" referrerpolicy="no-referrer"/>博客\
</a><span class="sep">&nbsp;&nbsp;</span>\
<a href="https://github.com/flyhunterl/flymd" target="_blank" rel="noopener noreferrer">\
  <img class="favicon" src="https://icons.duckduckgo.com/ip3/github.com.ico" alt="" referrerpolicy="no-referrer"/>GitHub\
</a></div><span id="about-version"></span>'
      dialog.appendChild(footer)
      const verEl = footer.querySelector('#about-version') as HTMLSpanElement | null
      if (verEl) verEl.textContent = `v${APP_VERSION}`
    }
    } catch {}

  // 插入链接对话框：初始化并挂载到容器
  const link = document.createElement('div')
  link.id = 'link-overlay'
    link.className = 'link-overlay sheet-overlay hidden'
  link.innerHTML = `
      <div class="link-dialog sheet-panel" role="dialog" aria-modal="true" aria-labelledby="link-title">
        <div class="link-header">
          <div id="link-title">${t('dlg.link')}</div>
          <button id="link-close" class="about-close" title="${t('about.close')}">×</button>
        </div>
        <form class="link-body" id="link-form">
          <label class="link-field">
            <span>${t('dlg.text')}</span>
            <input id="link-text" type="text" placeholder="${t('dlg.link.text.ph')}" />
          </label>
          <label class="link-field">
            <span>${t('dlg.url')}</span>
            <input id="link-url" type="text" placeholder="${t('dlg.url.ph')}" />
          </label>
          <div class="link-actions">
            <button type="button" id="link-cancel">${t('dlg.cancel')}</button>
            <button type="submit" id="link-ok">${t('dlg.insert')}</button>
          </div>
        </form>
    </div>
  `
  containerEl.appendChild(link)
  try {
    const dlg = link.querySelector('.link-dialog') as HTMLDivElement | null
    attachBottomSheetSwipe(link, dlg, () => showLinkOverlay(false))
  } catch {}

  // 重命名对话框（样式复用“插入链接”对话框风格）
  const rename = document.createElement('div')
  rename.id = 'rename-overlay'
  rename.className = 'link-overlay sheet-overlay hidden'
  rename.innerHTML = `
      <div class="link-dialog sheet-panel" role="dialog" aria-modal="true" aria-labelledby="rename-title">
        <div class="link-header">
          <div id="rename-title">${t('dlg.rename')}</div>
          <button id="rename-close" class="about-close" title="${t('about.close')}">×</button>
        </div>
        <form class="link-body" id="rename-form">
          <label class="link-field">
            <span>${t('dlg.name')}</span>
            <input id="rename-text" type="text" placeholder="${t('dlg.name.ph')}" />
          </label>
          <label class="link-field">
            <span>${t('dlg.ext')}</span>
            <input id="rename-ext" type="text" disabled />
          </label>
          <div class="link-actions">
            <button type="button" id="rename-cancel">${t('dlg.cancel')}</button>
            <button type="submit" id="rename-ok">${t('dlg.ok')}</button>
          </div>
        </form>
    </div>
  `
  containerEl.appendChild(rename)
  try {
    const dlg = rename.querySelector('.link-dialog') as HTMLDivElement | null
    attachBottomSheetSwipe(rename, dlg, () => hideSheet(rename))
  } catch {}

  // 图床设置对话框
  const upl = document.createElement('div')
  upl.id = 'uploader-overlay'
  upl.className = 'upl-overlay sheet-overlay hidden'
  upl.setAttribute('aria-hidden', 'true')
  upl.innerHTML = `
    <div class="upl-dialog sheet-panel" role="dialog" aria-modal="true" aria-labelledby="upl-title">
      <div class="upl-header">
        <div id="upl-title">${t('upl.title')}</div>
        <button id="upl-close" class="about-close" title="${t('about.close')}">×</button>
      </div>
      <div class="upl-desc">${t('upl.desc')}</div>
      <form class="upl-body" id="upl-form">
        <div class="upl-grid">
          <div class="upl-section-title">${t('upl.section.basic')}</div>
          <label for="upl-enabled">${t('upl.enable')}</label>
          <div class="upl-field">
            <label class="switch">
              <input id="upl-enabled" type="checkbox" />
              <span class="trk"></span><span class="kn"></span>
            </label>
          </div>
          <label for="upl-always-local">${t('upl.alwaysLocal')}</label>
          <div class="upl-field">
            <label class="switch">
              <input id="upl-always-local" type="checkbox" />
              <span class="trk"></span><span class="kn"></span>
            </label>
            <div class="upl-hint">${t('upl.hint.alwaysLocal')}</div>
          </div>
          <label for="upl-ak">${t('upl.ak')}</label>
          <div class="upl-field"><input id="upl-ak" type="text" placeholder="${t('upl.ak.ph')}" /></div>
          <label for="upl-sk">${t('upl.sk')}</label>
          <div class="upl-field"><input id="upl-sk" type="password" placeholder="${t('upl.sk.ph')}" /></div>
          <label for="upl-bucket">${t('upl.bucket')}</label>
          <div class="upl-field"><input id="upl-bucket" type="text" placeholder="${t('upl.bucket.ph')}" /></div>
          <label for="upl-endpoint">${t('upl.endpoint')}</label>
          <div class="upl-field">
            <input id="upl-endpoint" type="url" placeholder="${t('upl.endpoint.ph')}" />
            <div class="upl-hint">${t('upl.endpoint.hint')}</div>
          </div>
          <label for="upl-region">${t('upl.region')}</label>
          <div class="upl-field"><input id="upl-region" type="text" placeholder="${t('upl.region.ph')}" /></div>
          <div class="upl-section-title">${t('upl.section.access')}</div>
          <label for="upl-domain">${t('upl.domain')}</label>
          <div class="upl-field">
            <input id="upl-domain" type="url" placeholder="${t('upl.domain.ph')}" />
            <div class="upl-hint">${t('upl.domain.hint')}</div>
          </div>
          <label for="upl-template">${t('upl.template')}</label>
          <div class="upl-field">
            <input id="upl-template" type="text" placeholder="${t('upl.template.ph')}" />
            <div class="upl-hint">${t('upl.template.hint')}</div>
          </div>
          <div class="upl-section-title">${t('upl.section.advanced')}</div>
          <label for="upl-pathstyle">${t('upl.pathstyle')}</label>
          <div class="upl-field"><input id="upl-pathstyle" type="checkbox" /></div>
          <label for="upl-acl">${t('upl.acl')}</label>
          <div class="upl-field"><input id="upl-acl" type="checkbox" checked /></div>
          <label for="upl-webp-enable">${t('upl.webp.enable')}</label>
          <div class="upl-field">
            <label class="switch">
              <input id="upl-webp-enable" type="checkbox" />
              <span class="trk"></span><span class="kn"></span>
            </label>
          </div>
          <label for="upl-webp-quality">${t('upl.webp.quality')}</label>
          <div class="upl-field">
            <div style="display:flex;align-items:center;gap:8px;min-width:220px;">
              <input id="upl-webp-quality" type="range" min="0.6" max="0.95" step="0.01" value="0.85" />
              <span id="upl-webp-quality-val">0.85</span>
            </div>
            <div class="upl-hint" id="upl-webp-quality-hint">${t('upl.webp.quality.hint')}</div>
          </div>
          <label for="upl-webp-local">${t('upl.webp.local')}</label>
          <div class="upl-field">
            <label class="switch">
              <input id="upl-webp-local" type="checkbox" />
              <span class="trk"></span><span class="kn"></span>
            </label>
          </div>
        </div>
        <div class="upl-actions">
          <div id="upl-test-result"></div>
          <button type="button" id="upl-test" class="btn-secondary">${t('dlg.test')}</button>
          <button type="button" id="upl-cancel" class="btn-secondary">${t('dlg.cancel')}</button>
          <button type="submit" id="upl-save" class="btn-primary">${t('file.save')}</button>
        </div>
      </form>
    </div>
  `
  containerEl.appendChild(upl)
  try {
    const dialog = upl.querySelector('.upl-dialog') as HTMLDivElement | null
    attachBottomSheetSwipe(upl, dialog, () => showUploaderOverlay(false))
  } catch {}
  }

// 打开“插入链接”对话框的 Promise 控制器
let linkDialogResolver: ((result: { label: string; url: string } | null) => void) | null = null

function showLinkOverlay(show: boolean) {
  const overlay = document.getElementById('link-overlay') as HTMLDivElement | null
  if (!overlay) return
  if (show) showSheet(overlay)
  else hideSheet(overlay)
}

async function openRenameDialog(stem: string, ext: string): Promise<string | null> {
  try {
    const overlay = document.getElementById('rename-overlay') as HTMLDivElement | null
    const form = overlay?.querySelector('#rename-form') as HTMLFormElement | null
    const inputText = overlay?.querySelector('#rename-text') as HTMLInputElement | null
    const inputExt = overlay?.querySelector('#rename-ext') as HTMLInputElement | null
    const btnCancel = overlay?.querySelector('#rename-cancel') as HTMLButtonElement | null
    const btnClose = overlay?.querySelector('#rename-close') as HTMLButtonElement | null
    if (!overlay || !form || !inputText || !inputExt) {
      const v = prompt('重命名为（不含后缀）：', stem) || ''
      return v.trim() || null
    }
    inputText.value = stem
    inputExt.value = ext
    return await new Promise<string | null>((resolve) => {
      const onSubmit = (e: Event) => { e.preventDefault(); const v = (inputText.value || '').trim(); resolve(v || null); cleanup() }
      const onCancel = () => { resolve(null); cleanup() }
      const onOverlay = (e: MouseEvent) => { if (e.target === overlay) onCancel() }
      function cleanup() {
        hideSheet(overlay)
        try { form.removeEventListener('submit', onSubmit); btnCancel?.removeEventListener('click', onCancel); btnClose?.removeEventListener('click', onCancel); overlay.removeEventListener('click', onOverlay) } catch {}
      }
      form.addEventListener('submit', onSubmit)
      btnCancel?.addEventListener('click', onCancel)
      btnClose?.addEventListener('click', onCancel)
      overlay.addEventListener('click', onOverlay)
      showSheet(overlay)
      setTimeout(() => inputText.focus(), 0)
    })
  } catch { return null }
}
async function openLinkDialog(presetLabel: string, presetUrl = 'https://'): Promise<{ label: string; url: string } | null> {
  const overlay = document.getElementById('link-overlay') as HTMLDivElement | null
  const form = overlay?.querySelector('#link-form') as HTMLFormElement | null
  const inputText = overlay?.querySelector('#link-text') as HTMLInputElement | null
  const inputUrl = overlay?.querySelector('#link-url') as HTMLInputElement | null
  const btnCancel = overlay?.querySelector('#link-cancel') as HTMLButtonElement | null
  const btnClose = overlay?.querySelector('#link-close') as HTMLButtonElement | null

  // 如果没有自定义对话框，降级使用 prompt（保持功能可用）
  if (!overlay || !form || !inputText || !inputUrl) {
    const url = prompt('输入链接 URL：', presetUrl) || ''
    if (!url) return null
    const label = presetLabel || '链接文本'
    return { label, url }
  }

  inputText.value = presetLabel || '链接文本'
  inputUrl.value = presetUrl

  return new Promise((resolve) => {
    // 清理并设置 resolver
    linkDialogResolver = (result) => {
      showLinkOverlay(false)
      // 解除事件绑定（一次性）
      try {
        form.removeEventListener('submit', onSubmit)
        btnCancel?.removeEventListener('click', onCancel)
        btnClose?.removeEventListener('click', onCancel)
        overlay.removeEventListener('click', onOverlayClick)
      } catch {}
      resolve(result)
      linkDialogResolver = null
    }

    function onSubmit(e: Event) {
      e.preventDefault()
      const label = (inputText.value || '').trim() || '链接文本'
      const url = (inputUrl.value || '').trim()
      if (!url) { inputUrl.focus(); return }
      linkDialogResolver && linkDialogResolver({ label, url })
    }
    function onCancel() { linkDialogResolver && linkDialogResolver(null) }
    function onOverlayClick(e: MouseEvent) { if (e.target === overlay) onCancel() }

    form.addEventListener('submit', onSubmit)
    btnCancel?.addEventListener('click', onCancel)
    btnClose?.addEventListener('click', onCancel)
    overlay.addEventListener('click', onOverlayClick)
    // 测试连接事件
    showLinkOverlay(true)
    // 聚焦并选中 URL 输入框内容，方便直接粘贴覆盖
    setTimeout(() => { try { inputUrl.focus(); inputUrl.select() } catch {} }, 0)
  })
}
// 更新标题和未保存标记
function refreshTitle() {
  // 以文件名为主；未保存附加 *；悬浮显示完整路径；同步 OS 窗口标题
  const full = currentFilePath || ''
  const name = full ? (full.split(/[/\\]/).pop() || t('filename.untitled')) : t('filename.untitled')
  const label = name + (dirty ? ' *' : '')
  filenameLabel.textContent = label
  try { filenameLabel.title = full || name } catch {}
  document.title = label
  const osTitle = `${label} - 飞速MarkDown`
  try { void getCurrentWindow().setTitle(osTitle).catch(() => {}) } catch {}
  // 内容变化时刷新大纲（包括所见模式）
  try { scheduleOutlineUpdate() } catch {}
}

// 更新状态栏（行列字）
function refreshStatus() {
  const pos = editor.selectionStart
  const until = editor.value.slice(0, pos)
  const lines = until.split(/\n/)
  const row = lines.length
  const col = (lines[lines.length - 1] || '').length + 1
  const chars = editor.value.length
  status.textContent = fmtStatus(row, col) + `, 字 ${chars}`
}

// 初始化存储（Tauri Store），失败则退化为内存模式
async function initStore() {
  try {
    console.log('初始化应用存储...')
    // Tauri v2 使用 Store.load，在应用数据目录下持久化
    store = await Store.load('flymd-settings.json')
    console.log('存储初始化成功')
    void logInfo('应用存储初始化成功')
    return true
  } catch (error) {
    console.error('存储初始化失败:', error)
    console.warn('将以无持久化（内存）模式运行')
    void logWarn('存储初始化失败：使用内存模式', error)
    return false
  }
}

// 延迟加载高亮库并创建 markdown-it
// 任务列表（阅读模式）：将 "- [ ]" / "- [x]" 渲染为复选框
function applyMdTaskListPlugin(md: any) {
  try {
    md.core.ruler.after('inline', 'task-list', function (state: any) {
      try {
        const tokens = state.tokens || []
        const TokenCtor = state.Token
        for (let i = 0; i < tokens.length; i++) {
          const tInline = tokens[i]
          if (!tInline || tInline.type !== 'inline') continue
          // 寻找前置 list_item_open（兼容是否有 paragraph_open）
          let liIdx = -1
          const tPrev = tokens[i - 1]
          const tPrev2 = tokens[i - 2]
          if (tPrev && tPrev.type === 'paragraph_open' && tPrev2 && tPrev2.type === 'list_item_open') liIdx = i - 2
          else if (tPrev && tPrev.type === 'list_item_open') liIdx = i - 1
          if (liIdx < 0) continue
          const tLiOpen = tokens[liIdx]
          const children = (tInline.children || [])
          if (children.length === 0) continue
          const first = children[0]
          if (!first || first.type !== 'text') continue
          const m = (first.content || '').match(/^(\s*)\[( |x|X)\]\s+/)
          if (!m) continue
          try { tLiOpen.attrJoin('class', 'task-list-item') } catch {}
          try {
            const level = tLiOpen.level - 1
            for (let j = liIdx - 1; j >= 0; j--) {
              const tj = tokens[j]
              if (!tj) continue
              if ((tj.type === 'bullet_list_open' || tj.type === 'ordered_list_open') && tj.level === level) { try { tj.attrJoin('class', 'task-list') } catch {}; break }
            }
          } catch {}
          try {
            first.content = (first.content || '').replace(/^(\s*)\[(?: |x|X)\]\s+/, '')
            const box = new TokenCtor('html_inline', '', 0)
            const checked = (m[2] || '').toLowerCase() === 'x'
            box.content = `<input class="task-list-item-checkbox" type="checkbox"${checked ? ' checked' : ''}>`
            children.unshift(box)
            tInline.children = children
          } catch {}
        }
      } catch {}
      return false
    })
  } catch {}
}
async function ensureRenderer() {
  if (md) return
  if (!hljsLoaded) {
    // 按需加载 markdown-it 与 highlight.js
    const [{ default: MarkdownItCtor }, hljs] = await Promise.all([
      import('markdown-it'),
      import('highlight.js')
    ])
    hljsLoaded = true
    md = new MarkdownItCtor({
      html: true,
      linkify: true,
      breaks: true, // 单个换行渲染为 <br>，与所见模式的“回车即提行”保持一致
      highlight(code, lang) {
        // Mermaid 代码块保留为占位容器，稍后由 mermaid 渲染
        if (lang && lang.toLowerCase() === 'mermaid') {
          const esc = code.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]!))
          return `<pre class="mermaid">${esc}</pre>`
        }
        try {
          if (lang && hljs.default.getLanguage(lang)) {
            const r = hljs.default.highlight(code, { language: lang, ignoreIllegals: true })
            return `<pre><code class="hljs language-${lang}">${r.value}</code></pre>`
          }
        } catch {}
        const esc = code.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]!))
        return `<pre><code class="hljs">${esc}</code></pre>`
      }
    })
    // 启用 KaTeX 支持（$...$ / $$...$$）
    try {
      const katexPlugin = (await import('./plugins/markdownItKatex')).default as any
      if (typeof katexPlugin === 'function') md.use(katexPlugin)
      try { applyMdTaskListPlugin(md) } catch {}
    } catch (e) {
      console.warn('markdown-it-katex 加载失败：', e)
    }
  }
}

// 渲染预览（带安全消毒）
async function renderPreview() {
  console.log('=== 开始渲染预览 ===')
  // 首次预览开始打点
  try { if (!(renderPreview as any)._firstLogged) { (renderPreview as any)._firstLogged = true; logInfo('打点:首次预览开始') } } catch {}
  await ensureRenderer()
  let raw = editor.value
  // 所见模式：用一个“.”标记插入点，优先不破坏 Markdown 结构
  try {
    if (wysiwyg && mode !== 'preview') {
      const st = editor.selectionStart >>> 0
      const before = raw.slice(0, st)
      const after = raw.slice(st)
      const lineStart = before.lastIndexOf('\n') + 1
      const curLine = before.slice(lineStart)
      const fenceRE = /^ {0,3}(```+|~~~+)/
      // 计算在光标之前是否处于围栏代码块内
      const preText = raw.slice(0, lineStart)
      const preLines = preText.split('\n')
      let insideFence = false
      let fenceCh = ''
      for (const ln of preLines) {
        const m = ln.match(fenceRE)
        if (m) {
          const ch = m[1][0]
          if (!insideFence) { insideFence = true; fenceCh = ch }
          else if (ch === fenceCh) { insideFence = false; fenceCh = '' }
        }
      }
      const isFenceLine = fenceRE.test(curLine)
      let injectAt = st
      // 行首：将点放在不破坏语法的前缀之后
      if (st === lineStart) {
        const mBQ = curLine.match(/^ {0,3}> ?/)
        const mH = curLine.match(/^ {0,3}#{1,6} +/)
        const mUL = curLine.match(/^ {0,3}[-*+] +/)
        const mOL = curLine.match(/^ {0,3}\d+\. +/)
        const prefixLen = (mBQ?.[0]?.length || mH?.[0]?.length || mUL?.[0]?.length || mOL?.[0]?.length || 0)
        if (prefixLen > 0) injectAt = lineStart + prefixLen
      }
      // 围栏行：开围栏行→围栏符之后；关围栏行→跳过
      if (isFenceLine) {
        const m = curLine.match(fenceRE)
        if (m) {
          const ch = m[1][0]
          if (!insideFence) {
            injectAt = lineStart + m[0].length
          } else if (ch === fenceCh) {
            injectAt = -1
          }
        }
      }
      if (injectAt >= 0) {
        // 使用下划线 '_' 作为可见“光标”；代码块中用纯 '_'，其他位置用 span 包裹以实现闪烁
        const dotStr = insideFence && !isFenceLine ? '_' : '<span class="caret-dot">_</span>'
        raw = raw.slice(0, injectAt) + dotStr + raw.slice(injectAt)
      }
      try {
        const lines = raw.split('\n')
        let openFenceIdx = -1
        let openFenceChar = ''
        for (let i = 0; i < lines.length; i++) {
          const m = lines[i].match(/^ {0,3}(`{3,}|~{3,})/)
          if (m) {
            const ch = m[1][0]
            if (openFenceIdx < 0) { openFenceIdx = i; openFenceChar = ch }
            else if (ch === openFenceChar) { openFenceIdx = -1; openFenceChar = '' }
          }
        }
        if (openFenceIdx >= 0) {
          lines[openFenceIdx] = lines[openFenceIdx].replace(/^(\s*)(`{3,}|~{3,})/, (_all, s: string, fence: string) => {
            return s + fence[0] + '\u200B' + fence.slice(1)
          })
        }
        let openMathIdx = -1
        for (let i = 0; i < lines.length; i++) {
          if (/^ {0,3}\$\$/.test(lines[i])) {
            if (openMathIdx < 0) openMathIdx = i
            else openMathIdx = -1
          }
        }
        if (openMathIdx >= 0) {
          lines[openMathIdx] = lines[openMathIdx].replace(/^(\s*)\$\$/, (_all, s: string) => s + '$\u200B$')
        }

        // 3) 当前行：未闭合的单个 $（行内数学）
        try {
          if (!insideFence && !isFenceLine) {
            const curIdx = (() => { try { return before.split('\n').length - 1 } catch { return -1 } })()
            if (curIdx >= 0 && curIdx < lines.length) {
              const line = lines[curIdx]
              const singlePos: number[] = []
              for (let i = 0; i < line.length; i++) {
                if (line[i] !== '$') continue
                // 跳过 $$（块级）
                if (i + 1 < line.length && line[i + 1] === '$') { i++; continue }
                // 跳过转义 \$（奇数个反斜杠）
                let bs = 0
                for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) bs++
                if ((bs & 1) === 1) continue
                singlePos.push(i)
              }
              if ((singlePos.length & 1) === 1) {
                const idx = singlePos[singlePos.length - 1]
                // 在单个 $ 后插入零宽字符，阻断 markdown-it-katex 的行内渲染识别
                lines[curIdx] = line.slice(0, idx + 1) + '\u200B' + line.slice(idx + 1)
              }
            }
          }
        } catch {}
        raw = lines.join('\n')
      } catch {}
    }
  } catch {}
  // 阅读模式/所见模式预览：渲染时剥离 YAML Front Matter，仅显示正文；若存在 Front Matter，则解析用于预览元数据条
  let previewMeta: any | null = null
  try {
    const r = splitYamlFrontMatter(raw)
    previewMeta = parseFrontMatterMeta(r.frontMatter)
    raw = r.body
  } catch {}
  const html = md!.render(raw)
  // 按需加载 KaTeX 样式：检测渲染结果是否包含 katex 片段
  try {
    if (!katexCssLoaded && /katex/.test(html)) {
      await import('katex/dist/katex.min.css')
      katexCssLoaded = true
    }
  } catch {}
  console.log('Markdown 渲染后的 HTML 片段:', html.substring(0, 500))

  // 方案 A：占位符机制不需要 DOMPurify
  // KaTeX 占位符（data-math 属性）是安全的，后续会用 KaTeX.render() 替换
  const safe = html
  // WYSIWYG 防闪烁：使用离屏容器完成 Mermaid 替换后一次性提交
  try {
    preview.classList.add('rendering')
    const buf = document.createElement('div') as HTMLDivElement
    buf.className = 'preview-body'
    buf.innerHTML = safe
    // 与所见模式一致：在消毒之后，用 KaTeX 对占位元素进行实际渲染
    // 添加可视化调试面板
    // 【方案：使用与所见模式完全相同的方式】
    // 所见模式工作正常，直接复制其成功方案
    // 渲染 KaTeX 数学公式（阅读模式）
    try {
      const mathNodes = Array.from(buf.querySelectorAll('.md-math-inline, .md-math-block')) as HTMLElement[]

      if (mathNodes.length > 0) {
        // 使用所见模式的导入方式
        const katex = await import('katex')

        // 加载 CSS（只加载一次）
        if (!katexCssLoaded) {
          await import('katex/dist/katex.min.css')
          katexCssLoaded = true

          // 手动注入关键 CSS 规则以确保根号等符号正确显示
          // 这是必需的，因为在 Tauri 生产构建中动态 CSS 可能无法完全应用
          const criticalStyle = document.createElement('style')
          criticalStyle.textContent = `
            /* KaTeX critical styles for production build */
            .katex {
              font-size: 1em;
              text-indent: 0;
              text-rendering: auto;
            }
            .katex svg {
              display: inline-block;
              position: relative;
              width: 100%;
              height: 100%;
            }
            .katex svg path {
              fill: currentColor;
            }
            .katex .hide-tail {
              overflow: hidden;
            }
            .md-math-inline .katex {
              display: inline-block;
            }
            .md-math-block .katex {
              display: block;
              text-align: center;
            }
          `
          document.head.appendChild(criticalStyle)
        }

        // 渲染每个数学节点
        for (const el of mathNodes) {
          try {
            const value = el.getAttribute('data-math') || ''
            const displayMode = el.classList.contains('md-math-block')

            // 清空元素
            el.innerHTML = ''

            // 使用 katex.default.render()（与所见模式相同）
            katex.default.render(value, el, {
              throwOnError: false,
              displayMode: displayMode,
            })
          } catch (e) {
            // 渲染失败时回退到纯文本
            el.textContent = el.getAttribute('data-math') || ''
          }
        }
      }
    } catch (mainErr) {
      console.error('[KaTeX 阅读模式] 渲染失败:', mainErr)
    }
    // 任务列表映射与事件绑定（仅阅读模式）
    try {
      if (!wysiwyg) {
        const _rawForTasks = (editor as HTMLTextAreaElement).value
        const taskMapNow = scanTaskList(_rawForTasks)
        const boxes = Array.from(buf.querySelectorAll('input.task-list-item-checkbox')) as HTMLInputElement[]
        boxes.forEach((el, i) => { try { (el as HTMLInputElement).setAttribute('type','checkbox') } catch {}; try { (el as any).dataset.taskId = String(i) } catch {} })
        _taskMapLast = taskMapNow
        if (!_taskEventsBound) { try { preview.addEventListener('click', onTaskCheckboxChange as any, true); preview.addEventListener('change', onTaskCheckboxChange, true) } catch {} ; _taskEventsBound = true }
      }
    } catch {}
    try {
      const codeBlocks = buf.querySelectorAll('pre > code.language-mermaid') as NodeListOf<HTMLElement>
      try { console.log('[预处理] language-mermaid 代码块数量:', codeBlocks.length) } catch {}
      codeBlocks.forEach((code) => {
        try {
          const pre = code.parentElement as HTMLElement
          const text = code.textContent || ''
          const div = document.createElement('div')
          div.className = 'mermaid'
          div.textContent = text
          pre.replaceWith(div)
        } catch {}
      })
    } catch {}
    try {
      const preMermaid = buf.querySelectorAll('pre.mermaid')
      try { console.log('[预处理] pre.mermaid 元素数量:', preMermaid.length) } catch {}
      preMermaid.forEach((pre) => {
        try {
          const text = pre.textContent || ''
          const div = document.createElement('div')
          div.className = 'mermaid'
          div.textContent = text
          pre.replaceWith(div)
        } catch {}
      })
    } catch {}
    try {
      const nodes = Array.from(buf.querySelectorAll('.mermaid')) as HTMLElement[]
      try { console.log('[预处理] 准备渲染 Mermaid 节点:', nodes.length) } catch {}
      if (nodes.length > 0) {
        let mermaid: any
        try { mermaid = (await import('mermaid')).default } catch (e1) { try { mermaid = (await import('mermaid/dist/mermaid.esm.mjs')).default } catch (e2) { throw e2 } }
        if (!mermaidReady) {
          mermaid.initialize(getMermaidConfig());
          mermaidReady = true
        }
        for (let i = 0; i < nodes.length; i++) {
          const el = nodes[i]
          const code = el.textContent || ''
          const hash = hashMermaidCode(code)
          const desiredId = `${hash}-${mermaidSvgCacheVersion}-${i}`
          try {
            let svgMarkup = getCachedMermaidSvg(code, desiredId)
            if (!svgMarkup) {
              const renderId = `${hash}-${Date.now()}-${i}`
              const { svg } = await mermaid.render(renderId, code)
              cacheMermaidSvg(code, svg, renderId)
              svgMarkup = svg.split(renderId).join(desiredId)
            }
            const wrap = document.createElement('div')
            wrap.innerHTML = svgMarkup || ''
            const svgEl = wrap.firstElementChild as SVGElement | null
            if (svgEl) {
              try { normalizeMermaidSvg(svgEl) } catch {}
              if (!svgEl.id) svgEl.id = desiredId
              const fig = document.createElement('div')
              fig.className = 'mmd-figure'
              fig.appendChild(svgEl)
              try { fig.appendChild(createMermaidToolsFor(svgEl)) } catch {}
              el.replaceWith(fig)
              try { postAttachMermaidSvgAdjust(svgEl) } catch {}
            }
          } catch {}
        }
      }
    } catch {}
    // 一次性替换预览 DOM
    try {
      try { injectPreviewMeta(buf, previewMeta) } catch {}
      preview.innerHTML = ''
      preview.appendChild(buf)
      try { decorateCodeBlocks(preview) } catch {}
      // 便签模式：为待办项添加推送和提醒按钮，并自动调整窗口高度
      try { if (stickyNoteMode) { addStickyTodoButtons(); scheduleAdjustStickyHeight() } } catch {}
      // 预览更新后自动刷新大纲（节流由内部逻辑与渲染频率保障）
      try { renderOutlinePanel() } catch {}
    } catch {}
  } catch {} finally { try { preview.classList.remove('rendering') } catch {} }
  // 重新计算所见模式锚点表
  try { if (wysiwyg) { _wysiwygAnchors = buildAnchors(preview) } } catch {}
  // 所见模式下，确保“模拟光标 _”在预览区可见
  // 旧所见模式移除：不再调整模拟光标
  // 外链安全属性
  preview.querySelectorAll('a[href]').forEach((a) => {
    const el = a as HTMLAnchorElement
    el.target = '_blank'
    el.rel = 'noopener noreferrer'
  })
  // 处理本地图片路径为 asset: URL，确保在 Tauri 中可显示
  try {
    const base = currentFilePath ? currentFilePath.replace(/[\\/][^\\/]*$/, '') : null
    preview.querySelectorAll('img[src]').forEach((img) => {
      // WYSIWYG: nudge caret after image render when editor has no scroll space
      try {
        const el = img as HTMLImageElement
        const maybeNudge = () => {
          try { updateWysiwygVirtualPadding() } catch {}
          try { if (_nudgedCaretForThisRender) return; if (!wysiwyg) return } catch { return }
          try {
            const er = Math.max(0, editor.scrollHeight - editor.clientHeight)
            const pr = Math.max(0, preview.scrollHeight - preview.clientHeight)
            if (er <= 0 && pr > 0 && editor.selectionStart === editor.selectionEnd) {
              const st = window.getComputedStyle(editor)
              const fs = parseFloat(st.fontSize || '14') || 14
              const v = parseFloat(st.lineHeight || '')
              const lh = (Number.isFinite(v) && v > 0 ? v : fs * 1.6)
              const approx = Math.round(((el.clientHeight || 0) / (lh || 16)) * 0.3)
              const lines = Math.max(4, Math.min(12, approx || 0))
              const moved = moveWysiwygCaretByLines(lines, _wysiwygCaretVisualColumn)
              if (moved !== 0) { _nudgedCaretForThisRender = true; updateWysiwygLineHighlight(); updateWysiwygCaretDot(); startDotBlink(); try { ensureWysiwygCaretDotInView() } catch {} }
            }
          } catch {}
        }
        if (el.complete) { setTimeout(maybeNudge, 0) } else { el.addEventListener('load', () => setTimeout(maybeNudge, 0), { once: true }) }
      } catch {}
      try {
        const el = img as HTMLImageElement
        const src = el.getAttribute('src') || ''
        let srcDec = src
        try {
          // 尽力解码 URL 编码的反斜杠（%5C）与其它字符，便于后续本地路径识别
          srcDec = decodeURIComponent(src)
        } catch {}
        // 跳过已可用的协议
        if (/^(data:|blob:|asset:|https?:)/i.test(src)) return
        const isWinDrive = /^[a-zA-Z]:/.test(srcDec)
        const isUNC = /^\\\\/.test(srcDec)
        const isUnixAbs = /^\//.test(srcDec)
        // base 不存在且既不是绝对路径、UNC、Windows 盘符，也不是 file: 时，直接忽略
        if (!base && !(isWinDrive || isUNC || isUnixAbs || /^file:/i.test(src) || /^(?:%5[cC]){2}/.test(src))) return
        let abs: string
        if (isWinDrive || isUNC || isUnixAbs) {
          abs = srcDec
          if (isWinDrive) {
            // 统一 Windows 盘符路径分隔符
            abs = abs.replace(/\//g, '\\')
          }
          if (isUNC) {
            // 确保 UNC 使用反斜杠
            abs = abs.replace(/\//g, '\\')
          }
        } else if (/^(?:%5[cC]){2}/.test(src)) {
          // 处理被编码的 UNC：%5C%5Cserver%5Cshare%5C...
          try {
            const unc = decodeURIComponent(src)
            abs = unc.replace(/\//g, '\\')
          } catch { abs = src.replace(/%5[cC]/g, '\\') }
        } else if (/^file:/i.test(src)) {
          // 处理 file:// 形式，本地文件 URI 转为本地系统路径
          try {
            const u = new URL(src)
            let p = u.pathname || ''
            // Windows 场景：/D:/path => D:/path
            if (/^\/[a-zA-Z]:\//.test(p)) p = p.slice(1)
            p = decodeURIComponent(p)
            // 统一为 Windows 反斜杠，交由 convertFileSrc 处理
            if (/^[a-zA-Z]:\//.test(p)) p = p.replace(/\//g, '\\')
            abs = p
          } catch {
            abs = src.replace(/^file:\/\//i, '')
          }
        } else {
          const sep = base.includes('\\') ? '\\' : '/'
          const parts = (base + sep + src).split(/[\\/]+/)
          const stack: string[] = []
          for (const p of parts) {
            if (!p || p === '.') continue
            if (p === '..') { stack.pop(); continue }
            stack.push(p)
          }
          abs = base.includes('\\') ? stack.join('\\') : '/' + stack.join('/')
        }
        // 先监听错误，若 asset: 加载失败则回退为 data: URL
        let triedFallback = false
        const onError = async () => {
          if (triedFallback) return
          triedFallback = true
          try {
            if (typeof readFile !== 'function') return
            const bytes = await readFile(abs as any)
            // 通过 Blob+FileReader 转 data URL，避免手写 base64
            const mime = (() => {
              const m = (abs || '').toLowerCase().match(/\.([a-z0-9]+)$/)
              switch (m?.[1]) {
                case 'jpg':
                case 'jpeg': return 'image/jpeg'
                case 'png': return 'image/png'
                case 'gif': return 'image/gif'
                case 'webp': return 'image/webp'
                case 'bmp': return 'image/bmp'
                case 'avif': return 'image/avif'
                case 'ico': return 'image/x-icon'
                case 'svg': return 'image/svg+xml'
                default: return 'application/octet-stream'
              }
            })()
            const blob = new Blob([bytes], { type: mime })
            const dataUrl = await new Promise<string>((resolve, reject) => {
              try {
                const fr = new FileReader()
                fr.onerror = () => reject(fr.error || new Error('读取图片失败'))
                fr.onload = () => resolve(String(fr.result || ''))
                fr.readAsDataURL(blob)
              } catch (e) { reject(e as any) }
            })
            el.src = dataUrl
          } catch {}
        }
        el.addEventListener('error', onError, { once: true })

        const url = typeof convertFileSrc === 'function' ? convertFileSrc(abs) : abs
          try { (el as any).setAttribute('data-abs-path', abs) } catch {}
          try { if (typeof src === 'string') (el as any).setAttribute('data-raw-src', src) } catch {}
        el.src = url
      } catch {}
    })
  } catch {}

  // Mermaid 渲染：标准化为 <div class="mermaid"> 后逐个渲染为 SVG
  try {
    console.log('=== 开始 Mermaid 渲染流程 ===')
    // 情况1：<pre><code class="language-mermaid">...</code></pre>
    const codeBlocks = preview.querySelectorAll('pre > code.language-mermaid')
    console.log('找到 language-mermaid 代码块数量:', codeBlocks.length)
    codeBlocks.forEach((code) => {
      try {
        const pre = code.parentElement as HTMLElement
        const text = code.textContent || ''
        const div = document.createElement('div')
        div.className = 'mermaid'
        div.textContent = text
        pre.replaceWith(div)
      } catch {}
    })

    // 情况2：<pre class="mermaid">...</pre>
    const preMermaid = preview.querySelectorAll('pre.mermaid')
    console.log('找到 pre.mermaid 元素数量:', preMermaid.length)
    preMermaid.forEach((pre) => {
      try {
        const text = pre.textContent || ''
        const div = document.createElement('div')
        div.className = 'mermaid'
        div.textContent = text
        pre.replaceWith(div)
      } catch {}
    })

    const nodes = Array.from(preview.querySelectorAll('.mermaid')) as HTMLElement[]
    console.log(`找到 ${nodes.length} 个 Mermaid 节点`)
    if (nodes.length > 0) {
      let mermaid: any
      try {
        mermaid = (await import('mermaid')).default
      } catch (e1) {
        if (!wysiwyg) console.warn('加载 mermaid 失败，尝试 ESM 备用路径...', e1)
        try {
          mermaid = (await import('mermaid/dist/mermaid.esm.mjs')).default
        } catch (e2) {
          console.error('mermaid ESM 备用路径也加载失败', e2)
          throw e2
        }
      }
      // 所见模式下，进一步静默 mermaid 的 parseError 回调，避免控制台噪音
      try {
        if (wysiwyg) {
          try { (mermaid as any).parseError = () => {} } catch {}
          try { if ((mermaid as any).mermaidAPI) (mermaid as any).mermaidAPI.parseError = () => {} } catch {}
        }
      } catch {}
      if (!mermaidReady) {
        // 初始化 Mermaid；所见模式下降低日志级别，避免错误信息干扰输入体验
        mermaid.initialize(getMermaidConfig())
        mermaidReady = true
        console.log('Mermaid 已初始化')
        try { decorateCodeBlocks(preview) } catch {}
      } else {
        // 已初始化时，动态调整主题（切换所见/预览模式或夜间模式时生效）
        try {
          mermaid.initialize(getMermaidConfig())
        } catch {}
      }
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i]
        const code = el.textContent || ''
        const hash = hashMermaidCode(code)
        const desiredId = `${hash}-${mermaidSvgCacheVersion}-${i}`
        console.log(`渲染 Mermaid 图表 ${i + 1}:`, code.substring(0, 50))
        try {
          let svgMarkup = getCachedMermaidSvg(code, desiredId)
          let cacheHit = false
          if (svgMarkup) {
            cacheHit = true
            console.log(`Mermaid 图表 ${i + 1} 使用缓存，ID: ${desiredId}`)
          } else {
            const renderId = `${hash}-${Date.now()}-${i}`
            const { svg } = await mermaid.render(renderId, code)
            cacheMermaidSvg(code, svg, renderId)
            svgMarkup = svg.split(renderId).join(desiredId)
            console.log(`Mermaid 图表 ${i + 1} 首次渲染完成，缓存已更新`)
          }
          const wrap = document.createElement('div')
          wrap.innerHTML = svgMarkup || ''
          const svgEl = wrap.firstElementChild as SVGElement | null
          console.log(`Mermaid 图表 ${i + 1} SVG 元素:`, svgEl?.tagName, svgEl?.getAttribute('viewBox'))
          if (svgEl) { try { normalizeMermaidSvg(svgEl) } catch {}
            svgEl.setAttribute('data-mmd-hash', hash)
            svgEl.setAttribute('data-mmd-cache', cacheHit ? 'hit' : 'miss')
            if (!svgEl.id) svgEl.id = desiredId
            const fig = document.createElement('div')
            fig.className = 'mmd-figure'
            fig.appendChild(svgEl)
            try { fig.appendChild(createMermaidToolsFor(svgEl)) } catch {}
            el.replaceWith(fig)
            try { postAttachMermaidSvgAdjust(svgEl) } catch {}
            console.log(`Mermaid 图表 ${i + 1} 已插入 DOM（${cacheHit ? '缓存命中' : '新渲染'}）`)
            setTimeout(() => {
              const check = document.querySelector(`#${svgEl.id}`)
              console.log(`Mermaid 图表 ${i + 1} 检查 DOM 中是否存在:`, check ? '存在' : '不存在')
            }, 100)
          } else {
            throw new Error('生成的 SVG 节点为空')
          }
        } catch (err) {
          // 所见模式：完全静默；预览模式保留错误提示
          if (!wysiwyg) {
            console.error('Mermaid 单图渲染失败：', err)
            el.innerHTML = `<div style=\"color: red; border: 1px solid red; padding: 10px;\">Mermaid 渲染错误: ${err}</div>`
          }
        }
      }
    }
  } catch (e) {
    // 所见模式：完全静默；预览模式保留错误日志
    if (!wysiwyg) console.error('Mermaid 渲染失败：', e)
  // 代码块装饰：委托到统一的 decorateCodeBlocks，避免重复实现导致行为不一致
  try { decorateCodeBlocks(preview) } catch {}

  // 首次预览完成打点
  try { if (!(renderPreview as any)._firstDone) { (renderPreview as any)._firstDone = true; logInfo('打点:首次预览完成') } } catch {}
}
}

// 拖拽支持：
function extIsImage(name: string): boolean {
  return /\.(png|jpe?g|gif|svg|webp|bmp|avif)$/i.test(name)
}

function insertAtCursor(text: string) {
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const val = editor.value
  editor.value = val.slice(0, start) + text + val.slice(end)
  const pos = start + text.length
  editor.selectionStart = editor.selectionEnd = pos
  dirty = true
  refreshTitle()
  refreshStatus()
}

// 文本格式化与插入工具
function wrapSelection(before: string, after: string, placeholder = '') {
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const val = editor.value
  const selected = val.slice(start, end) || placeholder
  const insert = `${before}${selected}${after}`
  editor.value = val.slice(0, start) + insert + val.slice(end)
  const selStart = start + before.length
  const selEnd = selStart + selected.length
  editor.selectionStart = selStart
  editor.selectionEnd = selEnd
  dirty = true
  refreshTitle()
  refreshStatus()
}

async function formatBold() {
  if (wysiwygV2Active) {
    try {
      // 所见模式 V2：直接在 Milkdown 内部对选区应用加粗命令，避免重置整个文档导致光标跳转
      await wysiwygV2ToggleBold()
      return
    } catch {}
  }
  wrapSelection('**', '**', '加粗文本')
}
async function formatItalic() {
  if (wysiwygV2Active) {
    try {
      // 所见模式 V2：直接在 Milkdown 内部对选区应用斜体命令
      await wysiwygV2ToggleItalic()
      return
    } catch {}
  }
  wrapSelection('*', '*', '斜体文本')
}
async function insertLink() {
  if (wysiwygV2Active) {
    const selectedText = wysiwygV2GetSelectedText()
    const preset = selectedText || '链接文本'
    const result = await openLinkDialog(preset, 'https://')
    if (!result || !result.url) return
    // 所见模式：传入 label，让内部根据“是否有选区”决定是覆盖选区还是插入一段新文本
    await wysiwygV2ApplyLink(result.url, result.label)
    return
  }
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const val = editor.value
  const labelPreset = val.slice(start, end) || '链接文本'
  const result = await openLinkDialog(labelPreset, 'https://')
  if (!result || !result.url) return
  const insert = `[${result.label}](${result.url})`
  editor.value = val.slice(0, start) + insert + val.slice(end)
  const pos = start + insert.length
  editor.selectionStart = editor.selectionEnd = pos
  dirty = true
  refreshTitle()
  refreshStatus()
}

async function fileToDataUrl(file: File): Promise<string> {
  // 使用 FileReader 生成 data URL，避免手动拼接带来的内存与性能问题
  return await new Promise<string>((resolve, reject) => {
    try {
      const fr = new FileReader()
      fr.onerror = () => reject(fr.error || new Error('读取文件失败'))
      fr.onload = () => resolve(String(fr.result || ''))
      fr.readAsDataURL(file)
    } catch (e) {
      reject(e as any)
    }
  })
}

// 粘贴/拖拽上传核心模块包装
const _imageUploader = createImageUploader({
  getEditorValue: () => editor.value,
  setEditorValue: (v: string) => { editor.value = v },
  getMode: () => mode,
  isWysiwyg: () => !!wysiwyg,
  renderPreview: () => { void renderPreview() },
  scheduleWysiwygRender: () => { try { scheduleWysiwygRender() } catch {} },
  markDirtyAndRefresh: () => {
    dirty = true
    refreshTitle()
    refreshStatus()
  },
  insertAtCursor: (text: string) => insertAtCursor(text),
  getCurrentFilePath: () => currentFilePath,
  isTauriRuntime: () => isTauriRuntime(),
  ensureDir: async (dir: string) => { try { await ensureDir(dir) } catch {} },
  getDefaultPasteDir: () => getDefaultPasteDir(),
  getUserPicturesDir: () => getUserPicturesDir(),
  getAlwaysSaveLocalImages: () => getAlwaysSaveLocalImages(),
  getUploaderConfig: () => getUploaderConfig(),
  getTranscodePrefs: () => getTranscodePrefs(),
  writeBinaryFile: async (path: string, bytes: Uint8Array) => { await writeFile(path as any, bytes as any) },
  fileToDataUrl: (f: File) => fileToDataUrl(f),
  transcodeToWebpIfNeeded: (blob, fname, quality, opts) => transcodeToWebpIfNeeded(blob, fname, quality, opts),
})

// 运行时环境检测（是否在 Tauri 中）
function isTauriRuntime(): boolean {
  try {
    // Tauri v1/v2 均可通过以下全局标记判断
    // @ts-ignore
    return typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__)
  } catch { return false }
}

// 更新检测：类型声明（仅用于提示，不强制）
type UpdateAssetInfo = {
  name: string
  size: number
  directUrl: string
  proxyUrl: string
}
type CheckUpdateResp = {
  hasUpdate: boolean
  current: string
  latest: string
  releaseName: string
  notes: string
  htmlUrl: string
  assetWin?: UpdateAssetInfo | null
  assetLinuxAppimage?: UpdateAssetInfo | null
  assetLinuxDeb?: UpdateAssetInfo | null
  assetMacosX64?: UpdateAssetInfo | null
  assetMacosArm?: UpdateAssetInfo | null
}

// 可选的“额外信息”注入：位于 public/update-extra.json，由运维/作者按需维护
type UpdateExtra = {
  html?: string
  links?: { text: string; href: string }[]
}

async function openInBrowser(url: string) {
  try {
    if (isTauriRuntime()) { await openUrl(url) }
    else { window.open(url, '_blank', 'noopener,noreferrer') }
  } catch {
    try { window.open(url, '_blank', 'noopener,noreferrer') } catch {}
  }
}

function upMsg(s: string) {
  try { status.textContent = s } catch {}
  try { logInfo('[更新] ' + s) } catch {}
}

function setUpdateBadge(on: boolean, tip?: string) {
  try {
    const btn = document.getElementById('btn-update') as HTMLDivElement | null
    if (!btn) return
    if (on) {
      btn.classList.add('has-update')
      if (tip) btn.title = tip
    } else {
      btn.classList.remove('has-update')
    }
  } catch {}
}

function ensureUpdateOverlay(): HTMLDivElement {
  const id = 'update-overlay'
  let ov = document.getElementById(id) as HTMLDivElement | null
  if (ov) return ov
  const div = document.createElement('div')
  div.id = id
  div.className = 'link-overlay sheet-overlay hidden'
  div.setAttribute('aria-hidden', 'true')
  div.innerHTML = `
    <div class="link-dialog sheet-panel" role="dialog" aria-modal="true" aria-labelledby="update-title">
      <div class="link-header">
        <div id="update-title">检查更新</div>
        <button id="update-close" class="about-close" title="关闭">×</button>
      </div>
      <div class="link-body" id="update-body"></div>
      <div class="link-actions" id="update-actions"></div>
    </div>
  `
  const container = document.querySelector('.container') as HTMLDivElement | null
  if (container) container.appendChild(div)
  const btn = div.querySelector('#update-close') as HTMLButtonElement | null
  if (btn) btn.addEventListener('click', () => hideSheet(div))
  div.addEventListener('click', (e) => { if (e.target === div) hideSheet(div) })
  try {
    const dlg = div.querySelector('.link-dialog') as HTMLDivElement | null
    attachBottomSheetSwipe(div, dlg, () => hideSheet(div))
  } catch {}
  return div
}

async function showUpdateOverlayLinux(resp: CheckUpdateResp) {

function showUpdateDownloadedOverlay(savePath: string, resp: CheckUpdateResp) {
  const ov = ensureUpdateOverlay()
  const body = ov.querySelector('#update-body') as HTMLDivElement
  const act = ov.querySelector('#update-actions') as HTMLDivElement
  const esc = (s: string) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  body.innerHTML = `
    <div style="margin-bottom:8px;">已下载新版本 <b>v${resp.latest}</b>（当前 v${resp.current}）</div>
    <div>保存位置：<code>${esc(savePath)}</code></div>
  `
  act.innerHTML = ''
  const mkBtn = (label: string, onClick: () => void) => {
    const b = document.createElement('button')
    b.textContent = label
    b.addEventListener('click', onClick)
    act.appendChild(b)
    return b
  }
  const dir = savePath.replace(/[\/\\][^\/\\]+$/, '')
  mkBtn('直接运行安装包', () => { void openPath(savePath) })
  mkBtn('打开所在文件夹', () => { if (dir) void openPath(dir) })
  mkBtn('前往发布页', () => { void openInBrowser(resp.htmlUrl) })
  mkBtn('关闭', () => hideSheet(ov))
  showSheet(ov)
}
  const ov = ensureUpdateOverlay()
  const body = ov.querySelector('#update-body') as HTMLDivElement
  const act = ov.querySelector('#update-actions') as HTMLDivElement
  try {
    const extra = await loadUpdateExtra().catch(() => null)
    body.innerHTML = await renderUpdateDetailsHTML(resp, extra)
  } catch {
    body.innerHTML = `
      <div style="margin-bottom:8px;">发现新版本：<b>v${resp.latest}</b>（当前：v${resp.current}）</div>
      <div style="white-space:pre-wrap;max-height:240px;overflow:auto;border:1px solid var(--fg-muted);padding:8px;border-radius:6px;">${(resp.notes||'').replace(/</g,'&lt;')}</div>
    `
  }
  act.innerHTML = ''
  const mkBtn = (label: string, onClick: () => void) => {
    const b = document.createElement('button')
    b.textContent = label
    b.addEventListener('click', onClick)
    act.appendChild(b)
    return b
  }
  if (resp.assetLinuxAppimage) {
    mkBtn('下载 AppImage（直连）', () => { void openInBrowser(resp.assetLinuxAppimage!.directUrl) })
    mkBtn('下载 AppImage（代理）', () => { void openInBrowser('https://gh-proxy.com/' + resp.assetLinuxAppimage!.directUrl) })
  }
  if (resp.assetLinuxDeb) {
    mkBtn('下载 DEB（直连）', () => { void openInBrowser(resp.assetLinuxDeb!.directUrl) })
    mkBtn('下载 DEB（代理）', () => { void openInBrowser('https://gh-proxy.com/' + resp.assetLinuxDeb!.directUrl) })
  }
  mkBtn('前往发布页', () => { void openInBrowser(resp.htmlUrl) })
  mkBtn('关闭', () => hideSheet(ov))
  showSheet(ov)
}

async function checkUpdateInteractive() {
  try {
    // 使用通知系统显示检查进度
    const checkingId = NotificationManager.show('appUpdate', '正在检查更新…', 0)
    const resp = await invoke('check_update', { force: true, include_prerelease: false }) as any as CheckUpdateResp

    // 隐藏检查中的通知
    NotificationManager.hide(checkingId)

    if (!resp || !resp.hasUpdate) {
      setUpdateBadge(false)
      // 显示"已是最新版本"通知（5秒后消失）
      NotificationManager.show('appUpdate', `已是最新版本 v${APP_VERSION}`, 5000)
      return
    }

    setUpdateBadge(true, `发现新版本 v${resp.latest}`)
    const USE_OVERLAY_UPDATE = true; if (USE_OVERLAY_UPDATE) { await showUpdateOverlay(resp); return }
    // Windows：自动下载并运行；Linux：展示两个下载链接（依据后端返回的资产类型判断）
    if (resp.assetWin) {
      if (!resp.assetWin) {
        NotificationManager.show('appUpdate', '发现新版本，但未找到 Windows 安装包', 5000)
        await openInBrowser(resp.htmlUrl)
        return
      }
      const ok = await confirmNative(`发现新版本 v${resp.latest}（当前 v${resp.current}）\n是否立即下载并安装？`, '更新')
      if (!ok) {
        NotificationManager.show('appUpdate', '已取消更新', 3000)
        return
      }
      try {
        const downloadId = NotificationManager.show('appUpdate', '正在下载安装包…', 0)
        let savePath = ''
        {
          const direct = resp.assetWin.directUrl
          // 优先直连，其次备用代理
          const urls = [
            direct,
            'https://ghfast.top/' + direct,
            'https://gh-proxy.com/' + direct,
            'https://cdn.gh-proxy.com/' + direct,
            'https://edgeone.gh-proxy.com/' + direct,
          ]
          let ok = false
          for (const u of urls) {
            try {
              // 传 useProxy: false，避免后端二次拼接代理
              savePath = await invoke('download_file', { url: u, useProxy: false }) as any as string
              ok = true
              break
            } catch {}
          }
          if (!ok) throw new Error('all proxies failed')
        }
        NotificationManager.hide(downloadId)
        NotificationManager.show('appUpdate', '下载完成，正在启动安装…', 5000)
        try {
          await invoke('run_installer', { path: savePath })
          NotificationManager.show('appUpdate', '已启动安装程序，即将关闭…', 3000)
          setTimeout(() => { try { void getCurrentWindow().destroy() } catch {} }, 800)
        } catch (e) {
          showUpdateDownloadedOverlay(savePath, resp)
        }
      } catch (e) {
        NotificationManager.show('appUpdate', '下载或启动安装失败，将打开发布页', 5000)
        await openInBrowser(resp.htmlUrl)
      }
      return
    }
    // macOS：自动下载并打开（根据返回的双资产选择）
    if (resp.assetMacosArm || resp.assetMacosX64) {
      const a = (resp.assetMacosArm || resp.assetMacosX64) as UpdateAssetInfo
      const ok = await confirmNative(`发现新版本 v${resp.latest}（当前 v${resp.current}）\n是否立即下载并安装？`, '更新')
      if (!ok) {
        NotificationManager.show('appUpdate', '已取消更新', 3000)
        return
      }
      try {
        const downloadId = NotificationManager.show('appUpdate', '正在下载安装包…', 0)
        let savePath = ''
        {
          const direct = a.directUrl
          const urls = [
            direct,
            'https://ghfast.top/' + direct,
            'https://gh-proxy.com/' + direct,
            'https://cdn.gh-proxy.com/' + direct,
            'https://edgeone.gh-proxy.com/' + direct,
          ]
          let ok = false
          for (const u of urls) {
            try {
              savePath = await invoke('download_file', { url: u, useProxy: false }) as any as string
              ok = true
              break
            } catch {}
          }
          if (!ok) throw new Error('all proxies failed')
        }
        NotificationManager.hide(downloadId)
        NotificationManager.show('appUpdate', '下载完成，正在打开…', 5000)
        try {
          await openPath(savePath)
        } catch {
          showUpdateDownloadedOverlay(savePath, resp as any)
        }
      } catch (e) {
        NotificationManager.show('appUpdate', '下载或打开失败，将打开发布页', 5000)
        await openInBrowser(resp.htmlUrl)
      }
      return
    }

    // Linux：展示选择
    showUpdateOverlayLinux(resp)
  } catch (e) {
    upMsg('检查更新失败')
  }
}

// 读取可选的额外信息（不存在则返回 null）
async function loadUpdateExtra(): Promise<UpdateExtra | null> {
  try {
    const url = '/update-extra.json?ts=' + Date.now()
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const raw = await res.json()
    const out: UpdateExtra = {}
    if (raw && typeof raw.html === 'string') out.html = String(raw.html)
    if (raw && Array.isArray(raw.links)) {
      out.links = []
      for (const it of raw.links) {
        const text = (it && typeof it.text === 'string') ? String(it.text) : ''
        const href = (it && typeof it.href === 'string') ? String(it.href) : ''
        if (!text || !href) continue
        // 仅允许 http/https 链接，其他协议忽略
        if (!/^https?:\/\//i.test(href)) continue
        out.links.push({ text, href })
      }
      if (out.links.length === 0) delete (out as any).links
    }
    if (!out.html && !out.links) return null
    return out
  } catch { return null }
}

// 渲染更新详情（含版本与 notes），使用 markdown-it + DOMPurify 做安全渲染；支持注入 extra
async function renderUpdateDetailsHTML(resp: CheckUpdateResp, extra?: UpdateExtra | null): Promise<string> {
  try { await ensureRenderer() } catch {}
  try {
    if (!sanitizeHtml) {
      try { const mod: any = await import('dompurify'); const DOMPurify = mod?.default || mod; sanitizeHtml = (h: string, cfg?: any) => DOMPurify.sanitize(h, cfg) } catch { sanitizeHtml = (h: string) => h }
    }
  } catch {}
  let html = ''
  try { html = md ? md.render(resp.notes || '') : (resp.notes || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>') } catch { html = (resp.notes || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>') }
  const safe = sanitizeHtml!(html)
  const head = `<div class="update-title">发现新版本 <b>v${resp.latest}</b>（当前 v${resp.current}）</div>`
  const box = `<div class="update-notes" style="max-height:260px;overflow:auto;border:1px solid var(--fg-muted);padding:8px;border-radius:6px;">${safe}</div>`
  let extraHtml = ''
  if (extra && extra.html) {
    try { extraHtml += `<div class="update-extra" style="margin-top:8px;">${sanitizeHtml!(extra.html)}</div>` } catch {}
  }
  if (extra && extra.links && extra.links.length) {
    const items = extra.links.map(it => {
      const txt = (it.text || '').replace(/</g,'&lt;').replace(/&/g,'&amp;')
      // href 已经在 loadUpdateExtra 中做过协议白名单校验
      const href = it.href
      return `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${txt}</a></li>`
    }).join('')
    extraHtml += `<ul class="update-links" style="margin-top:8px;padding-left:18px;">${items}</ul>`
  }
  return head + box + extraHtml
}

// 安装失败提示窗口：提示“自动安装失败，请手动安装”，提供“打开下载目录”与“发布页”
function showInstallFailedOverlay(savePath: string, resp: CheckUpdateResp) {
  const ov = ensureUpdateOverlay()
  const body = ov.querySelector('#update-body') as HTMLDivElement
  const act = ov.querySelector('#update-actions') as HTMLDivElement
  const esc = (s: string) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  const dir = savePath.replace(/[\\/][^\\/]+$/, '')
  body.innerHTML = `
    <div style="margin-bottom:8px;color:var(--warn-color, #d33);">自动安装失败，请手动安装</div>
    <div>保存位置：<code>${esc(savePath)}</code></div>
  `
  act.innerHTML = ''
  const mkBtn = (label: string, onClick: () => void) => { const b = document.createElement('button'); b.textContent = label; b.addEventListener('click', onClick); act.appendChild(b); return b }
  mkBtn('打开下载目录', () => { if (dir) void openPath(dir) })
  mkBtn('前往发布页', () => { void openInBrowser(resp.htmlUrl) })
  mkBtn('关闭', () => hideSheet(ov))
  showSheet(ov)
}

// Windows：下载并尝试安装（直连/代理轮试），失败时弹出失败提示
async function downloadAndInstallWin(asset: UpdateAssetInfo, resp: CheckUpdateResp) {
  try {
    upMsg('正在下载安装包…')
    let savePath = ''
    const direct = asset.directUrl
    const urls = [
      direct,
      'https://ghfast.top/' + direct,
      'https://gh-proxy.com/' + direct,
      'https://cdn.gh-proxy.com/' + direct,
      'https://edgeone.gh-proxy.com/' + direct,
    ]
    let ok = false
    for (const u of urls) {
      try {
        // 传 useProxy: false，避免后端二次拼接代理
        savePath = await (invoke as any)('download_file', { url: u, useProxy: false }) as string
        ok = true
        break
      } catch {}
    }
    if (!ok) throw new Error('all proxies failed')
    upMsg('下载完成，正在启动安装…')
    try {
      await (invoke as any)('run_installer', { path: savePath })
      upMsg('已启动安装程序，即将关闭…')
      try { setTimeout(() => { try { void getCurrentWindow().destroy() } catch {} }, 800) } catch {}
    } catch (e) {
      // 安装启动失败 → 弹失败窗口
      showInstallFailedOverlay(savePath, resp)
    }
  } catch (e) {
    upMsg('下载或启动安装失败，将打开发布页')
    try { await openInBrowser(resp.htmlUrl) } catch {}
  }
}

// 统一的更新弹窗：展示 notes，并按平台提供操作按钮
async function showUpdateOverlay(resp: CheckUpdateResp) {
  const ov = ensureUpdateOverlay()
  const body = ov.querySelector('#update-body') as HTMLDivElement
  const act = ov.querySelector('#update-actions') as HTMLDivElement
  const extra = await loadUpdateExtra().catch(() => null)
  body.innerHTML = await renderUpdateDetailsHTML(resp, extra)
  act.innerHTML = ''
  const mkBtn = (label: string, onClick: () => void) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', onClick); act.appendChild(b); return b }

  // Windows：立即更新 + 发布页
  if (resp.assetWin) {
    { const b = mkBtn('立即更新', () => { hideSheet(ov); void downloadAndInstallWin(resp.assetWin!, resp) }); try { b.classList.add('btn-primary') } catch {} }
    { const b = mkBtn('发布页', () => { hideSheet(ov); void openInBrowser(resp.htmlUrl) }); try { b.classList.add('btn-secondary') } catch {} }
    showSheet(ov)
    return
  }
  // macOS：若提供资产，直接下载后 open；否则仅发布页
  if (resp.assetMacosArm || resp.assetMacosX64) {
    const a = (resp.assetMacosArm || resp.assetMacosX64) as UpdateAssetInfo
    { const b = mkBtn('立即更新', async () => {
      hideSheet(ov)
      try {
        upMsg('正在下载安装包…')
        let savePath = ''
        const direct = a.directUrl
        const urls = [direct, 'https://ghfast.top/' + direct, 'https://gh-proxy.com/' + direct, 'https://cdn.gh-proxy.com/' + direct, 'https://edgeone.gh-proxy.com/' + direct]
        let ok = false
        for (const u of urls) { try { savePath = await (invoke as any)('download_file', { url: u, useProxy: false }) as string; ok = true; break } catch {} }
        if (!ok) throw new Error('all proxies failed')
        upMsg('下载完成，正在打开…')
        try { await openPath(savePath) } catch { showInstallFailedOverlay(savePath, resp) }
      } catch { try { await openInBrowser(resp.htmlUrl) } catch {} }
    }); try { b.classList.add('btn-primary') } catch {} }
    { const b = mkBtn('发布页', () => { hideSheet(ov); void openInBrowser(resp.htmlUrl) }); try { b.classList.add('btn-secondary') } catch {} }
    showSheet(ov)
    return
  }
  // Linux：沿用现有按钮组
  return showUpdateOverlayLinux(resp)
}

function checkUpdateSilentOnceAfterStartup() {
  try {
    setTimeout(async () => {
      try {
        const resp = await invoke('check_update', { force: false, include_prerelease: false }) as any as CheckUpdateResp
        if (resp && resp.hasUpdate) {
          setUpdateBadge(true, `发现新版本 v${resp.latest}`)
          // 显示应用更新通知（10秒后自动消失，点击打开更新对话框）
          NotificationManager.show('appUpdate', `发现新版本 v${resp.latest}，点击查看详情`, 10000, () => {
            showUpdateOverlay(resp)
          })
        }
      } catch {
        // 静默失败不提示
      }
    }, 5000)
  } catch {}
}

// 获取当前模式的滚动百分比
function getScrollPercent(): number {
  try {
    if (wysiwyg) {
      const el = (document.querySelector('#md-wysiwyg-root .scrollView') || document.getElementById('md-wysiwyg-root')) as HTMLElement | null
      if (!el) return 0
      const max = el.scrollHeight - el.clientHeight
      return max > 0 ? el.scrollTop / max : 0
    }
    if (mode === 'preview') {
      const max = preview.scrollHeight - preview.clientHeight
      return max > 0 ? preview.scrollTop / max : 0
    }
    const max = editor.scrollHeight - editor.clientHeight
    return max > 0 ? editor.scrollTop / max : 0
  } catch {
    return 0
  }
}

// 设置当前模式的滚动百分比
function setScrollPercent(percent: number) {
  try {
    const p = Math.max(0, Math.min(1, percent))
    if (wysiwyg) {
      const el = (document.querySelector('#md-wysiwyg-root .scrollView') || document.getElementById('md-wysiwyg-root')) as HTMLElement | null
      if (el) el.scrollTop = p * (el.scrollHeight - el.clientHeight)
    } else if (mode === 'preview') {
      preview.scrollTop = p * (preview.scrollHeight - preview.clientHeight)
    } else {
      editor.scrollTop = p * (editor.scrollHeight - editor.clientHeight)
    }
    // 防御性修复：确保页面本身不会被滚动（长文本时可能出现异常）
    try { document.documentElement.scrollTop = 0 } catch {}
    try { document.body.scrollTop = 0 } catch {}
  } catch {}
}

// 保存当前滚动位置到全局缓存
function saveScrollPosition() {
  lastScrollPercent = getScrollPercent()
}

// 恢复滚动位置（带重试机制确保DOM就绪）
function restoreScrollPosition(retries = 3, delay = 50) {
  const apply = () => setScrollPercent(lastScrollPercent)
  apply()  // 立即尝试一次
  if (retries > 0) {
    // 延迟重试，应对DOM未完全就绪的情况
    setTimeout(() => apply(), delay)
    if (retries > 1) setTimeout(() => apply(), delay * 2)
    if (retries > 2) setTimeout(() => apply(), delay * 4)
  }
}

// 切换模式
async function toggleMode() {
  saveScrollPosition()  // 保存当前滚动位置到全局缓存
  mode = mode === 'edit' ? 'preview' : 'edit'
  if (mode === 'preview') {
    try { updateWysiwygVirtualPadding() } catch {}
    try { preview.classList.remove('hidden') } catch {}
    try { await renderPreview() } catch {}
    restoreScrollPosition(2, 50)  // 带重试机制恢复滚动位置
  } else {
    if (!wysiwyg) try { preview.classList.add('hidden') } catch {}
    try { editor.focus() } catch {}
    restoreScrollPosition()  // 带重试机制恢复滚动位置
  }
  ;(document.getElementById('btn-toggle') as HTMLButtonElement).textContent = mode === 'edit' ? '阅读' : '源码'
  // 模式切换后，如大纲面板可见，强制按当前模式重建一次大纲
  try {
    const outline = document.getElementById('lib-outline') as HTMLDivElement | null
    if (outline && !outline.classList.contains('hidden')) {
      _outlineLastSignature = ''
      renderOutlinePanel()
      if (mode !== 'edit') bindOutlineScrollSync()
    }
  } catch {}
  // 触发模式变更事件（专注模式侧栏背景跟随）
  try { window.dispatchEvent(new CustomEvent('flymd:mode:changed', { detail: { mode } })) } catch {}
  try { notifyModeChange() } catch {}
}

// 提取 Ctrl+E 的切换逻辑，供快捷键和其它入口共用
async function handleToggleModeShortcut() {
  if (wysiwyg) {
    try { await setWysiwygEnabled(false) } catch {}
    try { notifyModeChange() } catch {}
    // 更新专注模式侧栏背景色
    setTimeout(() => updateFocusSidebarBg(), 100)
    return
  }
  await toggleMode()
  // 更新专注模式侧栏背景色
  setTimeout(() => updateFocusSidebarBg(), 100)
}

// 打开文件
async function openFile(preset?: string) {
  try {
    // 切换前不再在未选择目标时询问，改在明确了目标文件后判断是否需要保存

    if (!preset) {
      // 检查 Tauri API 是否可用
      if (typeof open !== 'function') {
        alert('文件打开功能需要在 Tauri 应用中使用')
        return
      }
    }

    // 兼容 macOS 场景：部分环境下 multiple:false 仍可能返回数组；若为数组取首个
     let selected: any = preset ?? (await open({ multiple: false, filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }] }))
    if (!selected) return
    if (Array.isArray(selected)) {
      if (selected.length < 1) return
      selected = selected[0]
    }
    const selectedPath = (typeof selected === 'string')
      ? selected
      : ((selected as any)?.path ?? (selected as any)?.filePath ?? String(selected))






    logInfo('���ļ�', { path: selectedPath })
    // 读取文件内容：优先使用 fs 插件；若因路径权限受限（forbidden path）则回退到自定义后端命令
    let content: string
    try {
      content = await readTextFileAnySafe(selectedPath as any)
    } catch (e: any) {
      const msg = (e && (e.message || e.toString?.())) ? String(e.message || e.toString()) : ''
      if (/forbidden\s*path/i.test(msg) || /not\s*allowed/i.test(msg)) {
        try {
          content = await invoke<string>('read_text_file_any', { path: selectedPath })
        } catch (e2) {
          throw e2
        }
      } else {
        throw e
      }
    }
    editor.value = content
    currentFilePath = selectedPath
    dirty = false
    refreshTitle()
    refreshStatus()
    await switchToPreviewAfterOpen()
    // 打开后恢复上次阅读/编辑位置
    await restoreDocPosIfAny(selectedPath)
    await pushRecent(currentFilePath)
    await renderRecentPanel(false)
    logInfo('�ļ����سɹ�', { path: selectedPath, size: content.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('invoke') || msg.includes('Tauri')) {
      alert('此功能需要在 Tauri 桌面应用中使用\n当前运行在浏览器环境')
    }
    showError('打开文件失败', error)
  }
}

// 全新的文件打开实现（避免历史遗留的路径处理问题）
async function openFile2(preset?: unknown) {
  try {
    // 如果是事件对象（点击/键盘），忽略它，相当于未传入预设路径
    if (preset && typeof preset === 'object') {
      const evt = preset as any
      if ('isTrusted' in evt || 'target' in evt || typeof evt?.preventDefault === 'function') {
        preset = undefined
      }
    }

    if (!preset && dirty) {
      const confirmed = await confirmNative('当前文件尚未保存，是否放弃更改并继续打开？', '打开文件')
      if (!confirmed) { logDebug('用户取消打开文件操作（未保存）'); return }
    }

    if (!preset) {
      if (typeof open !== 'function') {
        alert('文件打开功能需要在 Tauri 应用中使用')
        return
      }
    }

    // 兼容 macOS 场景：部分环境下 multiple:false 仍可能返回数组；若为数组取首个
    let selected: any = (typeof preset === 'string')
      ? preset
      : (await open({ multiple: false, filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
        { name: 'PDF', extensions: ['pdf'] },
      ] }))
    if (!selected) return
    if (Array.isArray(selected)) { if (selected.length < 1) return; selected = selected[0] }

    const selectedPath = normalizePath(selected)
    // 同一文件且当前存在未保存内容时，避免误覆盖编辑态
    const currentPathNormalized = currentFilePath ? normalizePath(currentFilePath) : ''
    const reopeningSameFile = !!currentPathNormalized && currentPathNormalized === selectedPath
    if (reopeningSameFile && dirty) {
      const shouldReload = await confirmNative('当前文档存在未保存的更改，重新加载将放弃这些内容，是否继续？', '重新加载文档')
      if (!shouldReload) {
        logDebug('openFile2.skipSameFileReload', { selectedPath })
        return
      }
    }
    logDebug('openFile2.selected', { typeof: typeof selected, selected })
    logDebug('openFile2.normalizedPath', { typeof: typeof selectedPath, selectedPath })

    // 记录当前是否处于所见模式，以便在打开新文档后按需恢复
    const wasWysiwyg = !!wysiwyg

    // 若当前有未保存更改，且目标文件不同，则先询问是否保存
    if (dirty && selectedPath && selectedPath !== currentFilePath) {
      const doSave = await confirmNative('当前文档已修改，是否保存后再切换？', '切换文档')
      if (doSave) {
        await saveFile()
      }
      // 选择“否”时直接继续切换；取消由 confirmNative 返回 false 的语义中无法区分“否/取消”，因此默认视为不保存继续
    }

    // PDF 预览分支：在读取文本前拦截处理
    try {
      const ext = (selectedPath.split(/\./).pop() || '').toLowerCase()
      if (ext === 'pdf') {
        currentFilePath = selectedPath as any
        dirty = false
        refreshTitle()
        try { (editor as HTMLTextAreaElement).value = '' } catch {}
        // 首选 convertFileSrc 以便 WebView 内置 PDF 查看器接管
        let srcUrl: string = typeof convertFileSrc === 'function' ? convertFileSrc(selectedPath) : (selectedPath as any)
        _currentPdfSrcUrl = srcUrl
        preview.innerHTML = `
          <div class="pdf-preview" style="width:100%;height:100%;">
            <iframe src="${srcUrl}" title="PDF 预览" style="width:100%;height:100%;border:0;" allow="fullscreen"></iframe>
          </div>
        `
        // 若当前处于所见模式，关闭所见，确保 PDF 预览正常显示
        try { if (wysiwyg) { await setWysiwygEnabled(false) } } catch {}
        mode = 'preview'
        try { preview.classList.remove('hidden') } catch {}
        try { syncToggleButton() } catch {}
        try { notifyModeChange() } catch {}
        await pushRecent(currentFilePath)
        await renderRecentPanel(false)
        logInfo('PDF 预览就绪', { path: selectedPath })
        return
      }
    } catch {}

    // 读取文件内容：优先使用 fs 插件；若因路径权限受限（forbidden path / not allowed）回退到后端命令
    _currentPdfSrcUrl = null
    let content: string
    try {
      content = await readTextFileAnySafe(selectedPath as any)
    } catch (e: any) {
      const msg = (e && (e.message || (e.toString?.()))) ? String(e.message || e.toString()) : ''
      const isForbidden = /forbidden\s*path/i.test(msg) || /not\s*allowed/i.test(msg) || /EACCES|EPERM|Access\s*Denied/i.test(msg)
      if (isForbidden && typeof invoke === 'function') {
        // 使用后端无范围限制的读取作为兜底
        content = await invoke<string>('read_text_file_any', { path: selectedPath })
      } else {
        throw e
      }
    }
    editor.value = content
    currentFilePath = selectedPath
    dirty = false
    refreshTitle()
    refreshStatus()

    // 若之前处于所见模式，先关闭所见（包括 V2），避免跨文档复用同一 Milkdown 实例导致状态错乱
    if (wasWysiwyg) {
      try { await setWysiwygEnabled(false) } catch {}
    }

    // 打开后默认进入预览模式
    await switchToPreviewAfterOpen()

    // 检查“默认所见模式”设置，并结合之前是否处于所见模式，决定是否自动重新启用
    try {
      const WYSIWYG_DEFAULT_KEY = 'flymd:wysiwyg:default'
      const wysiwygDefault = localStorage.getItem(WYSIWYG_DEFAULT_KEY) === 'true'
      const shouldEnableWysiwyg = wysiwygDefault || wasWysiwyg
      if (shouldEnableWysiwyg && !wysiwyg) {
        // 延迟一小段时间，确保预览已渲染，再切换到所见 V2
        setTimeout(async () => {
          try {
            await setWysiwygEnabled(true)
            console.log('[WYSIWYG] 打开文档后自动启用所见模式', { wysiwygDefault, wasWysiwyg })
          } catch (e) {
            console.error('[WYSIWYG] 打开文档后启用所见模式失败:', e)
          }
        }, 100)
      }
    } catch (e) {
      console.error('[WYSIWYG] 检查默认所见模式设置失败:', e)
    }

    // 恢复上次阅读/编辑位置（编辑器光标/滚动与预览滚动）
    await restoreDocPosIfAny(selectedPath)
    await pushRecent(currentFilePath)
    await renderRecentPanel(false)
    logInfo('文件打开成功', { path: selectedPath, size: content.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('invoke') || msg.includes('Tauri')) {
      alert('此功能需要在 Tauri 桌面应用中使用\n当前运行在浏览器环境')
    }
    showError('打开文件失败', error)
  }
}

// 保存文件
async function saveFile() {
  try {
    if (!currentFilePath) {
      await saveAs()
      return
    }

    // 检查 Tauri API
    if (typeof writeTextFile !== 'function') {
      alert('文件保存功能需要在 Tauri 应用中使用')
      return
    }

    logInfo('保存文件', { path: currentFilePath })
    try {
      await writeTextFileAnySafe(currentFilePath, editor.value)
    } catch (e: any) {
      const msg = (e && (e.message || (e.toString?.()))) ? String(e.message || e.toString()) : ''
      const isForbidden = /forbidden\s*path/i.test(msg) || /not\s*allowed/i.test(msg) || /EACCES|EPERM|Access\s*Denied/i.test(msg)
      if (isForbidden && typeof invoke === 'function') {
        await invoke('write_text_file_any', { path: currentFilePath, content: editor.value })
      } else {
        throw e
      }
    }
    dirty = false
    refreshTitle()
    // 通知标签系统文件已保存
    window.dispatchEvent(new CustomEvent('flymd-file-saved'))
    await pushRecent(currentFilePath)
    await renderRecentPanel(false)
    logInfo('文件保存成功', { path: currentFilePath, size: editor.value.length })
    status.textContent = '文件已保存'
    setTimeout(() => refreshStatus(), 2000)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('invoke') || msg.includes('Tauri')) {
      alert('此功能需要在 Tauri 桌面应用中使用\n当前运行在浏览器环境')
    }
    showError('保存文件失败', error)
  }
}

async function exportCurrentDocToPdf(target: string): Promise<void> {
  const out = String(target || '').trim()
  if (!out) throw new Error('导出 PDF 目标路径为空')
  if (typeof writeFile !== 'function') {
    alert('导出 PDF 功能需要在 Tauri 应用中使用')
    throw new Error('writeFile not available')
  }
  status.textContent = '正在导出 PDF...'
  await renderPreview()
  const el = preview.querySelector('.preview-body') as HTMLElement | null
  if (!el) throw new Error('未找到预览内容容器')
  const { exportPdf } = await import('./exporters/pdf')
  const bytes = await exportPdf(el, {})
  await writeFile(out as any, bytes as any)
  status.textContent = '已导出'
  setTimeout(() => refreshStatus(), 2000)
}

// 另存为
async function saveAs() {
  try {
    // 检查 Tauri API
    if (typeof save !== 'function') {
      alert('文件保存功能需要在 Tauri 应用中使用')
      return
    }

    const target = await save({ filters: [ { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }, { name: 'PDF', extensions: ['pdf'] }, { name: 'Word (DOCX)', extensions: ['docx'] }, { name: 'WPS', extensions: ['wps'] } ] })
    if (!target) {
      logDebug('用户取消另存为操作')
      return
    }
    logInfo('另存为文件', { path: target })
    // 导出分支：根据扩展名处理 PDF/DOCX/WPS
    const ext = (() => { const m = String(target).toLowerCase().match(/\.([a-z0-9]+)$/); return m ? m[1] : ''; })();
    if (ext === 'pdf' || ext === 'docx' || ext === 'wps') {
      try {
        if (ext === 'pdf') {
          status.textContent = '正在导出 PDF...';
          await renderPreview();
          const el = preview.querySelector('.preview-body') as HTMLElement | null;
          if (!el) throw new Error('未找到预览内容容器');
          const { exportPdf } = await import('./exporters/pdf');
          const bytes = await exportPdf(el, {});
          await writeFile(target as any, bytes as any);
        } else {
          status.textContent = '正在导出 ' + ext.toUpperCase() + '...';
          await renderPreview();
          const el = preview.querySelector('.preview-body') as HTMLElement | null;
          if (!el) throw new Error('未找到预览内容容器');
          const html = el.outerHTML;
          if (ext === 'docx') {
            const { exportDocx } = await import('./exporters/docx');
            const bytes = await exportDocx(el as any, {});
            await writeFile(target as any, bytes as any);
          } else {
            const { exportWps } = await import('./exporters/wps');
            const bytes = await exportWps(html as any, {});
            await writeFile(target as any, bytes as any);
          }
        }
        currentFilePath = target;
        dirty = false;
        refreshTitle();
        await pushRecent(currentFilePath);
        await renderRecentPanel(false);
        logInfo('文件导出成功', { path: target, ext });
        status.textContent = '已导出';
        setTimeout(() => refreshStatus(), 2000);
        return;
      } catch (e) {
        showError('导出失败', e);
        return;
      }
    }
    try {
      await writeTextFileAnySafe(target, editor.value)
    } catch (e: any) {
      const msg = (e && (e.message || (e.toString?.()))) ? String(e.message || e.toString()) : ''
      const isForbidden = /forbidden\s*path/i.test(msg) || /not\s*allowed/i.test(msg) || /EACCES|EPERM|Access\s*Denied/i.test(msg)
      if (isForbidden && typeof invoke === 'function') {
        await invoke('write_text_file_any', { path: target, content: editor.value })
      } else {
        throw e
      }
    }
    currentFilePath = target
    dirty = false
    refreshTitle()
    await pushRecent(currentFilePath)
    await renderRecentPanel(false)
    logInfo('文件另存为成功', { path: target, size: editor.value.length })
    status.textContent = '文件已保存'
    setTimeout(() => refreshStatus(), 2000)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('invoke') || msg.includes('Tauri')) {
      alert('此功能需要在 Tauri 桌面应用中使用\n当前运行在浏览器环境')
    }
    showError('另存为失败', error)
  }
}

// 新建
async function newFile() {
  if (dirty) {
    const saveIt = await confirmNative('当前文档已修改，是否保存后再新建？', '新建文件')
    if (saveIt) { await saveFile() }
    // 选择否/取消：继续新建但不保存（confirmNative 无法区分，按否处理）
  }
  editor.value = ''
  currentFilePath = null
  dirty = false
  refreshTitle()
  refreshStatus()
  if (mode === 'preview') {
          await renderPreview()
  } else if (wysiwyg) {
    scheduleWysiwygRender()
  }
}

// 最近文件管理
async function getRecent(): Promise<string[]> {
  if (!store) return []
  try {
    const value = (await store.get('recent')) as string[] | undefined
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

async function pushRecent(path: string) {
  if (!store) return
  try {
    const list = await getRecent()
    const filtered = [path, ...list.filter((p) => p !== path)].slice(0, RECENT_MAX)
    await store.set('recent', filtered)
    await store.save()
  } catch (e) {
    console.warn('保存最近文件失败:', e)
  }
}

// 渲染/切换 最近文件 面板
async function renderRecentPanel(toggle = true) {
  const panel = document.getElementById('recent-panel') as HTMLDivElement
  if (!panel) return
  const recents = await getRecent()
  if (recents.length === 0) {
    panel.innerHTML = '<div class="empty">暂时没有最近文件</div>'
  } else {
    panel.innerHTML = recents
      .filter(p => p != null && typeof p === 'string')
      .map(
        (p, idx) =>
          `<div class=\"item\" data-path=\"${p.replace(/\"/g, '&quot;')}\">` +
          `${idx + 1}. ${p.split(/[/\\\\]/).pop()}` +
          `<div class=\"path\">${p}</div>` +
          `</div>`
      )
      .join('')
  }
  // 绑定点击
  panel.querySelectorAll('.item').forEach((el) => {
    el.addEventListener('click', async () => {
      const p = (el as HTMLDivElement).dataset.path!
      await openFile2(p)
      panel.classList.add('hidden')
    })
  })
  if (toggle) panel.classList.toggle('hidden')
}

// 同步预览/编辑按钮文案，避免编码问题
function syncToggleButton() {
  try {
    const btn = document.getElementById('btn-toggle') as HTMLButtonElement | null
    if (btn) btn.textContent = mode === 'edit' ? '\u9884\u89c8' : '\u7f16\u8f91'
  } catch {}
}

// 打开文件后强制切换为预览模式
async function switchToPreviewAfterOpen() {
  try {
    // 所见模式会在外部显式关闭/重新开启，这里只负责普通预览
    if (wysiwyg) return

    // 如果开启了“默认源码模式”，则保持源码编辑视图，不自动切到预览
    try {
      const SOURCEMODE_DEFAULT_KEY = 'flymd:sourcemode:default'
      const sourcemodeDefault = localStorage.getItem(SOURCEMODE_DEFAULT_KEY) === 'true'
      if (sourcemodeDefault) {
        mode = 'edit'
        try { preview.classList.add('hidden') } catch {}
        try { syncToggleButton() } catch {}
        try { notifyModeChange() } catch {}
        return
      }
    } catch {}

    mode = 'preview'
    try { await renderPreview() } catch (e) { try { showError('预览渲染失败', e) } catch {} }
    try { preview.classList.remove('hidden') } catch {}
    try { syncToggleButton() } catch {}
  } catch {}
}

// 绑定事件


// 显示/隐藏 关于 弹窗
async function getLibraryRoot(): Promise<string | null> {
  // 统一通过 utils 获取当前激活库（兼容 legacy）
  try { return await getActiveLibraryRoot() } catch { return null }
}

async function setLibraryRoot(p: string) {
  // 兼容旧代码：设置库路径即插入/更新库并设为激活
  try { await upsertLibrary({ root: p }) } catch {}
}

// —— 大纲滚动同步 ——
let _outlineScrollBound = false
let _outlineActiveId = ''
let _outlineRaf = 0
function getOutlineContext(): { mode: 'wysiwyg'|'preview'|'source'; scrollEl: HTMLElement | null; bodyEl: HTMLElement | null; heads: HTMLElement[] } {
  try {
    if (wysiwyg) {
      const rootEl = document.getElementById('md-wysiwyg-root') as HTMLElement | null
      const scrollEl = (document.querySelector('#md-wysiwyg-root .scrollView') as HTMLElement | null) || rootEl
      const bodyEl = document.querySelector('#md-wysiwyg-root .ProseMirror') as HTMLElement | null
      const heads = bodyEl ? Array.from(bodyEl.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[] : []
      if (scrollEl && bodyEl) return { mode: 'wysiwyg', scrollEl, bodyEl, heads }
    }
  } catch {}
  try {
    const scrollEl = document.querySelector('.preview') as HTMLElement | null
    const bodyEl = document.querySelector('.preview .preview-body') as HTMLElement | null
    const heads = bodyEl ? Array.from(bodyEl.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[] : []
    if (scrollEl && bodyEl) return { mode: 'preview', scrollEl, bodyEl, heads }
  } catch {}
  return { mode: 'source', scrollEl: null, bodyEl: null, heads: [] }
}
let _outlineScrollBoundPreview = false
let _outlineScrollBoundWysiwyg = false
function bindOutlineScrollSync() {
  const prev = document.querySelector('.preview') as HTMLElement | null
  if (prev && !_outlineScrollBoundPreview) { prev.addEventListener('scroll', onOutlineScroll, { passive: true }); _outlineScrollBoundPreview = true }
  const wysi = document.getElementById('md-wysiwyg-root') as HTMLElement | null
  const wysiScroll = (document.querySelector('#md-wysiwyg-root .scrollView') as HTMLElement | null) || wysi
  if (wysiScroll && !_outlineScrollBoundWysiwyg) { wysiScroll.addEventListener('scroll', onOutlineScroll, { passive: true }); _outlineScrollBoundWysiwyg = true }
  _outlineScrollBound = _outlineScrollBoundPreview || _outlineScrollBoundWysiwyg
}
function onOutlineScroll() {
  if (_outlineRaf) cancelAnimationFrame(_outlineRaf)
  _outlineRaf = requestAnimationFrame(() => { try { updateOutlineActive() } catch {} })
}
function updateOutlineActive() {
  try {
    const { scrollEl: pv, bodyEl: body } = getOutlineContext()
    const outline = document.getElementById('lib-outline') as HTMLDivElement | null
    if (!pv || !body || !outline || outline.classList.contains('hidden')) return
    const heads = Array.from(body.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[]
    if (heads.length === 0) return
    const pvRect = pv.getBoundingClientRect()
    const threshold = pvRect.top + 60
    let active: HTMLElement | null = null
    for (const h of heads) { const r = h.getBoundingClientRect(); if (r.top <= threshold) active = h; else break }
    if (!active) active = heads[0]
    const id = active.getAttribute('id') || ''
    if (!id || id === _outlineActiveId) return
    _outlineActiveId = id
    outline.querySelectorAll('.ol-item').forEach((el) => { (el as HTMLDivElement).classList.toggle('active', (el as HTMLDivElement).dataset.id === id) })
  } catch {}
}

// —— 大纲面板：从预览或源码提取 H1~H6，生成可点击目录 ——
function renderOutlinePanel() {
  try {
    const outline = document.getElementById('lib-outline') as HTMLDivElement | null
    if (!outline) return
    // PDF：优先读取书签目录
    try { if ((currentFilePath || '').toLowerCase().endsWith('.pdf')) { void renderPdfOutline(outline); return } } catch {}
    // 优先从当前上下文（WYSIWYG/预览）提取标题（仅在对应模式下启用）
    const ctx = getOutlineContext()
    const heads = ctx.heads
    // level: 标题级别；id: DOM 锚点或逻辑标识；text: 显示文本；offset: 源码中的大致字符偏移（仅源码模式下用于跳转）
    const items: { level: number; id: string; text: string; offset?: number }[] = []
    const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5\s-]/gi,'').replace(/\s+/g,'-').slice(0,64) || ('toc-' + Math.random().toString(36).slice(2))
    const useDomHeads = (wysiwyg || mode === 'preview') && heads.length > 0
    if (useDomHeads) {
      heads.forEach((h, idx) => {
        const tag = (h.tagName || 'H1').toUpperCase()
        const level = Math.min(6, Math.max(1, Number(tag.replace('H','')) || 1))
        let id = h.getAttribute('id') || ''
        const text = (h.textContent || '').trim() || ('标题 ' + (idx+1))
        if (!id) { id = slug(text + '-' + idx); try { h.setAttribute('id', id) } catch {} }
        items.push({ level, id, text })
      })
    } else {
      // 退化：从源码扫描 # 标题行
      const src = editor?.value || ''
      const lines = src.split(/\n/)
      let offset = 0
      lines.forEach((ln, i) => {
        const m = ln.match(/^(#{1,6})\s+(.+?)\s*$/)
        if (m) {
          const level = m[1].length
          const text = m[2].trim()
          const id = slug(text + '-' + i)
          // 记录标题在源码中的大致字符偏移，用于源码模式下跳转
          items.push({ level, id, text, offset })
        }
        // \n 按单字符累计；Windows 下的 \r\n 中 \r 已在 ln 末尾
        offset += ln.length + 1
      })
    }
    if (items.length === 0) { outline.innerHTML = '<div class="empty">未检测到标题</div>'; return }

    // 缓存命中：若本次大纲签名与上次相同，跳过重建，仅更新高亮
    try {
      const sig = JSON.stringify(items.map(it => [it.level, it.id, it.text]))
      if (sig === _outlineLastSignature && outline.childElementCount > 0) {
        updateOutlineActive();
        return
      }
      _outlineLastSignature = sig
    } catch {}

    // 计算是否有子级（用于折叠/展开，限制到 H1/H2）
    const hasChild = new Map<string, boolean>()
    for (let i = 0; i < items.length; i++) {
      const cur = items[i]
      if (cur.level > 2) continue
      let child = false
      for (let j = i + 1; j < items.length; j++) { if (items[j].level > cur.level) { child = true; break } if (items[j].level <= cur.level) break }
      hasChild.set(cur.id, child)
    }

    outline.innerHTML = items.map((it, idx) => {
      const tg = (it.level <= 2 && hasChild.get(it.id)) ? `<span class=\"ol-tg\" data-idx=\"${idx}\">▾</span>` : `<span class=\"ol-tg\"></span>`
      const off = (typeof it.offset === 'number' && it.offset >= 0) ? ` data-offset=\"${it.offset}\"` : ''
      return `<div class=\"ol-item lvl-${it.level}\" data-id=\"${it.id}\" data-idx=\"${idx}\"${off}>${tg}${it.text}</div>`
    }).join('')

    // 折叠状态记忆（基于当前文件路径）
    const key = 'outline-collapsed:' + (currentFilePath || 'untitled')
    const _raw = (() => { try { return localStorage.getItem(key) } catch { return null } })()
    const collapsed = new Set<string>(_raw ? (() => { try { return JSON.parse(_raw!) } catch { return [] } })() : [])
    const saveCollapsed = () => { try { localStorage.setItem(key, JSON.stringify(Array.from(collapsed))) } catch {} }

    // 应用折叠：根据被折叠的 id 隐藏其后代
    function applyCollapse() {
      try {
        const nodes = Array.from(outline.querySelectorAll('.ol-item')) as HTMLDivElement[]
        // 先全部显示
        nodes.forEach(n => n.classList.remove('hidden'))
        // 逐个处理折叠项
        nodes.forEach((n) => {
          const id = n.dataset.id || ''
          if (!id || !collapsed.has(id)) return
          const m1 = n.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
          for (let i = (parseInt(n.dataset.idx||'-1',10) + 1); i < nodes.length; i++) {
            const m = nodes[i]
            const m2 = m.className.match(/lvl-(\d)/); const lv = parseInt((m2?.[1]||'6'),10)
            if (lv <= level) break
            m.classList.add('hidden')
          }
        })
      } catch {}
    }

    // 折叠/展开切换
    outline.querySelectorAll('.ol-tg').forEach((tgEl) => {
      tgEl.addEventListener('click', (ev) => {
        ev.stopPropagation()
        const el = (tgEl as HTMLElement).closest('.ol-item') as HTMLDivElement | null
        if (!el) return
        const id = el.dataset.id || ''
        const m1 = el.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
        if (!id || level > 2) return
        if (collapsed.has(id)) { collapsed.delete(id); (tgEl as HTMLElement).textContent = '▾' } else { collapsed.add(id); (tgEl as HTMLElement).textContent = '▸' }
        saveCollapsed(); applyCollapse()
      })
    })

    // 点击跳转
    outline.querySelectorAll('.ol-item').forEach((el) => {
      el.addEventListener('click', () => {
        const div = el as HTMLDivElement
        const id = div.dataset.id || ''
        const offsetStr = div.dataset.offset

        // 所见 / 阅读模式：保持原有行为，滚动到预览/WYSIWYG 中的 DOM 标题
        if (wysiwyg || mode === 'preview') {
          if (!id) return
          try {
            const target = document.getElementById(id)
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          } catch {}
          return
        }

        // 源码模式：根据源码中的字符偏移跳转到 textarea
        if (typeof offsetStr === 'string' && offsetStr !== '') {
          const off = Number(offsetStr)
          if (!Number.isFinite(off) || off < 0) return
          try {
            const ta = editor as HTMLTextAreaElement
            const text = String(ta.value || '')
            const len = text.length >>> 0
            const caret = Math.max(0, Math.min(off, len))
            ta.selectionStart = caret
            ta.selectionEnd = caret
            try { ta.focus() } catch {}
            if (len > 0 && ta.scrollHeight > ta.clientHeight + 4) {
              const linesBefore = text.slice(0, caret).split('\n').length
              const totalLines = text.split('\n').length
              const lineRatio = (linesBefore - 1) / Math.max(1, totalLines - 1)
              const targetY = lineRatio * ta.scrollHeight
              ta.scrollTop = Math.max(0, targetY - ta.clientHeight * 0.3)
            }
          } catch {}
        }
      })
    })

    applyCollapse()
    // 初始高亮与绑定滚动同步 + WYSIWYG 观察
    setTimeout(() => { try { updateOutlineActive(); bindOutlineScrollSync(); ensureOutlineObserverBound() } catch {} }, 0)
  } catch {}
}

// —— PDF 书签目录（按需加载 PDF.js；失败则给出提示，不影响其它场景） ——
async function renderPdfOutline(outlineEl: HTMLDivElement) {
  try {
    outlineEl.innerHTML = '<div class="empty">正在读取 PDF 目录…</div>'
    logDebug('PDF 目录：开始解析', { path: currentFilePath })
    // 动态加载 pdfjs-dist（若未安装或打包，则静默失败）
    let pdfjsMod: any = null
    try { pdfjsMod = await import('pdfjs-dist'); logDebug('PDF 目录：模块已加载', Object.keys(pdfjsMod||{})) } catch (e) {
      outlineEl.innerHTML = '<div class="empty">未安装 pdfjs-dist，无法读取目录</div>'
      logWarn('PDF 目录：加载 pdfjs-dist 失败', e)
      return
    }
    const pdfjs: any = (pdfjsMod && (pdfjsMod as any).getDocument) ? pdfjsMod : ((pdfjsMod && (pdfjsMod as any).default) ? (pdfjsMod as any).default : pdfjsMod)
    // 优先使用 bundler worker（模块化），若失败则回退为禁用 worker
    try {
      const workerMod: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')
      const WorkerCtor: any = workerMod?.default || workerMod
      const worker: Worker = new WorkerCtor()
      if ((pdfjs as any).GlobalWorkerOptions) {
        ;(pdfjs as any).GlobalWorkerOptions.workerPort = worker
        logDebug('PDF 目录：workerPort 已设置')
      }
    } catch (e) {
      logWarn('PDF 目录：workerPort 设置失败（将尝试禁用 worker）', e)
      try { if ((pdfjs as any).GlobalWorkerOptions) (pdfjs as any).GlobalWorkerOptions.workerSrc = null } catch {}
    }
    // 读取本地 PDF 二进制
    let bytes: Uint8Array
    try { bytes = await readFile(currentFilePath as any) as any; logDebug('PDF 目录：读取字节成功', { bytes: bytes?.length }) } catch (e) {
      outlineEl.innerHTML = '<div class="empty">无法读取 PDF 文件</div>'
      logWarn('PDF 目录：读取文件失败', e)
      return
    }
    // 缓存命中直接渲染（mtime 自动失效）
    try {
      const key = String(currentFilePath || '')
      if (false && key && _pdfOutlineCache.has(key)) {
        // 获取当前 mtime
        let curMtime = 0
        try { const st = await stat(currentFilePath as any); const cand = (st as any)?.mtimeMs ?? (st as any)?.mtime ?? (st as any)?.modifiedAt; curMtime = Number(cand) || 0 } catch {}
        const cached = _pdfOutlineCache.get(key)!
        if (cached && cached.items && cached.items.length > 0 && cached.mtime === curMtime) {
          const items = cached.items
          // 构建大纲（带折叠）并绑定点击
          // 计算是否有子级（用于折叠/展开，限制到 level<=2）
          const hasChild = new Map<string, boolean>()
          for (let i = 0; i < items.length; i++) {
            const cur = items[i]
            if (cur.level > 2) continue
            let child = false
            for (let j = i + 1; j < items.length; j++) { if (items[j].level > cur.level) { child = true; break } if (items[j].level <= cur.level) break }
            hasChild.set(`${i}`, child)
          }
          const keyCollapse = 'outline-collapsed:' + key
          let collapsed = new Set<string>()
          try { const raw = localStorage.getItem(keyCollapse); if (raw) collapsed = new Set(JSON.parse(raw)) } catch {}
          const saveCollapsed = () => { try { localStorage.setItem(keyCollapse, JSON.stringify(Array.from(collapsed))) } catch {} }
          outlineEl.innerHTML = items.map((it, idx) => {
            const tg = (it.level <= 2 && hasChild.get(String(idx))) ? `<span class=\\"ol-tg\\" data-idx=\\"${idx}\\">▾</span>` : `<span class=\\"ol-tg\\"></span>`
            return `<div class=\\"ol-item lvl-${it.level}\\" data-page=\\"${it.page}\\" data-idx=\\"${idx}\\">${tg}${it.title}</div>`
          }).join('')
          // 应用折叠
          const applyCollapse = () => {
            try {
              const nodes = Array.from(outlineEl.querySelectorAll('.ol-item')) as HTMLDivElement[]
              nodes.forEach(n => n.classList.remove('hidden'))
              nodes.forEach((n) => {
                const idx = n.dataset.idx || ''
                if (!idx || !collapsed.has(idx)) return
                const m1 = n.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
                for (let i = (parseInt(idx||'-1',10) + 1); i < nodes.length; i++) {
                  const m = nodes[i]
                  const m2 = m.className.match(/lvl-(\d)/); const lv = parseInt((m2?.[1]||'6'),10)
                  if (lv <= level) break
                  m.classList.add('hidden')
                }
              })
            } catch {}
          }
          const existingToggleHandler = (outlineEl as any)._pdfToggleHandler
          if (existingToggleHandler) {
            outlineEl.removeEventListener('click', existingToggleHandler)
          }
          const toggleHandler = (ev: Event) => {
            const tgEl = (ev.target as HTMLElement)
            if (!tgEl.classList.contains('ol-tg')) return
            ev.stopPropagation()
            const el = tgEl.closest('.ol-item') as HTMLDivElement | null
            if (!el) return
            const idx = el.dataset.idx || ''
            const m1 = el.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
            if (!idx || level > 2) return
            if (collapsed.has(idx)) { collapsed.delete(idx); tgEl.textContent = '▾' } else { collapsed.add(idx); tgEl.textContent = '▸' }
            saveCollapsed(); applyCollapse()
          }
          ;(outlineEl as any)._pdfToggleHandler = toggleHandler
          outlineEl.addEventListener('click', toggleHandler)
          bindPdfOutlineClicks(outlineEl)
          applyCollapse()
          logDebug('PDF 目录：使用缓存', { count: items.length })
          return
        }
      }
    } catch {}

    // 加载文档并提取 outline
    const task = (pdfjs as any).getDocument ? (pdfjs as any).getDocument({ data: bytes, disableWorker: true }) : null
    if (!task) { outlineEl.innerHTML = '<div class="empty">PDF.js 不可用</div>'; logWarn('PDF 目录：getDocument 不可用'); return }
    const doc = (task as any).promise ? await (task as any).promise : await task
    logDebug('PDF 目录：文档已打开', { numPages: doc?.numPages })
    const outline = await doc.getOutline(); logDebug('PDF 目录：outline 获取成功', { count: outline?.length })
    if (!outline || outline.length === 0) { outlineEl.innerHTML = '<div class="empty">此 PDF 未提供目录（书签）</div>'; return }
    // 展平目录，解析页码
    const items: { level: number; title: string; page: number }[] = []
    async function walk(nodes: any[], level: number) {
      for (const n of nodes || []) {
        const title = String(n?.title || '').trim() || '无标题'
        let page = 1
        try {
          const destName = n?.dest
          let dest: any = destName
          if (typeof destName === 'string') dest = await doc.getDestination(destName)
          const ref = Array.isArray(dest) ? dest[0] : null
          if (ref) { const idx = await doc.getPageIndex(ref); page = (idx >>> 0) + 1 } else { logDebug('PDF 目录：无 ref，使用默认页', { title }) }
        } catch (e) { logWarn('PDF 目录：解析书签页码失败', { title, err: String(e) }) }
        items.push({ level, title, page })
        if (Array.isArray(n?.items) && n.items.length > 0) { await walk(n.items, Math.min(6, level + 1)) }
      }
    }
    await walk(outline, 1)
    if (items.length === 0) { outlineEl.innerHTML = '<div class="empty">目录为空</div>'; logWarn('PDF 目录：目录为空'); return }
    // PDF 目录缓存复用
    // 写入缓存（含 mtime）
    try {
      const k = String(currentFilePath || '')
      if (k) {
        let curMtime = 0
        try { const st = await stat(currentFilePath as any); const cand = (st as any)?.mtimeMs ?? (st as any)?.mtime ?? (st as any)?.modifiedAt; curMtime = Number(cand) || 0 } catch {}
        _pdfOutlineCache.set(k, { mtime: curMtime, items: items.slice() })
      }
    } catch {}

    // 构建大纲（带折叠/展开与记忆）
    const hasChild = new Map<string, boolean>()
    for (let i = 0; i < items.length; i++) {
      const cur = items[i]
      if (cur.level > 2) continue
      let child = false
      for (let j = i + 1; j < items.length; j++) { if (items[j].level > cur.level) { child = true; break } if (items[j].level <= cur.level) break }
      hasChild.set(`${i}`, child)
    }
    const keyCollapse = 'outline-collapsed:' + (currentFilePath || '')
    let collapsed = new Set<string>()
    try { const raw = localStorage.getItem(keyCollapse); if (raw) collapsed = new Set(JSON.parse(raw)) } catch {}
    const saveCollapsed = () => { try { localStorage.setItem(keyCollapse, JSON.stringify(Array.from(collapsed))) } catch {} }
    outlineEl.innerHTML = items.map((it, idx) => {
      const tg = (it.level <= 2 && hasChild.get(String(idx))) ? `<span class=\"ol-tg\" data-idx=\"${idx}\">▾</span>` : `<span class=\"ol-tg\"></span>`
      return `<div class=\"ol-item lvl-${it.level}\" data-page=\"${it.page}\" data-idx=\"${idx}\">${tg}${it.title}</div>`
    }).join('')
    function navigatePdfPage(page) {
      try {
        const iframe = document.querySelector('.pdf-preview iframe')
        if (!iframe) { logWarn('PDF 目录：未找到 iframe'); return }
        const cur = iframe.src || _currentPdfSrcUrl || ''
        if (!cur) { logWarn('PDF 目录：无有效 iframe.src/base'); return }
        const baseNoHash = cur.split('#')[0]
        // 1) 尝试仅修改 hash
        try { if (iframe.contentWindow) { iframe.contentWindow.location.hash = '#page=' + page; logDebug('PDF 目录：hash 导航', { page }) } } catch {}
        // 2) 直接设置 src
        const next = baseNoHash + '#page=' + page
        try { iframe.src = next; logDebug('PDF 目录：src 导航', { page, next }) } catch {}
        // 3) 硬刷新防缓存
        setTimeout(() => {
          try {
            const again = document.querySelector('.pdf-preview iframe')
            if (!again) return
            const hard = baseNoHash + '?_=' + Date.now() + '#page=' + page
            again.src = hard
            logDebug('PDF 目录：硬刷新导航', { page, hard })
          } catch {}
        }, 80)
      } catch (e) { logWarn('PDF 目录：导航异常', e) }
    }
    // 应用折叠
    const applyCollapse = () => {
      try {
        const nodes = Array.from(outlineEl.querySelectorAll('.ol-item')) as HTMLDivElement[]
        nodes.forEach(n => n.classList.remove('hidden'))
        nodes.forEach((n) => {
          const idx = n.dataset.idx || ''
          if (!idx || !collapsed.has(idx)) return
          const m1 = n.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
          for (let i = (parseInt(idx||'-1',10) + 1); i < nodes.length; i++) {
            const m = nodes[i]
            const m2 = m.className.match(/lvl-(\d)/); const lv = parseInt((m2?.[1]||'6'),10)
            if (lv <= level) break
            m.classList.add('hidden')
          }
        })
      } catch {}
    }
    const existingToggleHandler = (outlineEl as any)._pdfToggleHandler
    if (existingToggleHandler) {
      outlineEl.removeEventListener('click', existingToggleHandler)
    }
    const toggleHandler = (ev: Event) => {
      const tgEl = (ev.target as HTMLElement)
      if (!tgEl.classList.contains('ol-tg')) return
      ev.stopPropagation()
      const el = tgEl.closest('.ol-item') as HTMLDivElement | null
      if (!el) return
      const idx = el.dataset.idx || ''
      const m1 = el.className.match(/lvl-(\d)/); const level = parseInt((m1?.[1]||'1'),10)
      if (!idx || level > 2) return
      if (collapsed.has(idx)) { collapsed.delete(idx); tgEl.textContent = '▾' } else { collapsed.add(idx); tgEl.textContent = '▸' }
      saveCollapsed(); applyCollapse()
    }
    ;(outlineEl as any)._pdfToggleHandler = toggleHandler
    outlineEl.addEventListener('click', toggleHandler)
    bindPdfOutlineClicks(outlineEl)
    applyCollapse()
  } catch (e) {
    try { outlineEl.innerHTML = '<div class="empty">读取 PDF 目录失败</div>' } catch {}
    logWarn('PDF 目录：异常', e)
  }
}

function bindPdfOutlineClicks(outlineEl: HTMLDivElement) {
  try {
    const existingHandler = (outlineEl as any)._pdfOutlineClickHandler
    if (existingHandler) {
      outlineEl.removeEventListener('click', existingHandler)
    }
    const handler = (e: Event) => {
      const clickedEl = e.target as HTMLElement
      if (clickedEl.classList.contains('ol-tg')) return
      const target = clickedEl.closest('.ol-item') as HTMLDivElement | null
      if (!target) return
      const p = Number(target.dataset.page || '1') || 1
      try {
        const iframe = document.querySelector('.pdf-preview iframe') as HTMLIFrameElement | null
        if (!iframe) { logWarn('PDF 目录：未找到 iframe'); return }
        const cur = iframe.src || _currentPdfSrcUrl || ''
        if (!cur) { logWarn('PDF 目录：无有效 iframe.src/base'); return }
        const baseNoHash = cur.split('#')[0]
        try { if (iframe.contentWindow) { iframe.contentWindow.location.hash = '#page=' + p; logDebug('PDF 目录：hash 导航', { page: p }) } } catch {}
        const next = baseNoHash + '#page=' + p
        try { iframe.src = next; logDebug('PDF 目录：src 导航', { page: p, next }) } catch {}
        setTimeout(() => {
          try {
            const again = document.querySelector('.pdf-preview iframe') as HTMLIFrameElement | null
            if (!again) return
            const hard = baseNoHash + '?_=' + Date.now() + '#page=' + p
            again.src = hard
            logDebug('PDF 目录：硬刷新导航', { page: p, hard })
          } catch {}
        }, 80)
      } catch (e) { logWarn('PDF 目录：导航异常', e) }
    }
    ;(outlineEl as any)._pdfOutlineClickHandler = handler
    outlineEl.addEventListener('click', handler)
  } catch {}
}

// 监听 WYSIWYG 内容变更以自动刷新大纲（仅在“所见模式 + 大纲页签可见”时节流刷新）
let _outlineObserverBound = false
let _outlineObserver: MutationObserver | null = null
let _outlineUpdateTimer = 0
function scheduleOutlineUpdate() {
  if (_outlineUpdateTimer) { clearTimeout(_outlineUpdateTimer); _outlineUpdateTimer = 0 }
  _outlineUpdateTimer = window.setTimeout(() => {
    _outlineUpdateTimer = 0
    try {
      const outline = document.getElementById('lib-outline') as HTMLDivElement | null
      if (outline && !outline.classList.contains('hidden')) renderOutlinePanel()
    } catch {}
  }, 200)
}
function scheduleOutlineUpdateFromSource() {
  if (wysiwyg || mode !== 'edit') return
  scheduleOutlineUpdate()
}
function ensureOutlineObserverBound() {
  if (_outlineObserverBound) return
  try {
    const bodyEl = document.querySelector('#md-wysiwyg-root .ProseMirror') as HTMLElement | null
    if (!bodyEl) return
    _outlineObserver = new MutationObserver(() => {
      scheduleOutlineUpdate()
    })
    _outlineObserver.observe(bodyEl, { childList: true, subtree: true, characterData: true })
    _outlineObserverBound = true
  } catch {}
}

// 粘贴图片默认保存目录（无打开文件时使用）
async function getDefaultPasteDir(): Promise<string | null> {
  try {
    if (!store) return null
    const val = await store.get('defaultPasteDir')
    return (typeof val === 'string' && val) ? val : null
  } catch { return null }
}

async function setDefaultPasteDir(p: string) {
  try {
    if (!store) return
    await store.set('defaultPasteDir', p)
    await store.save()
  } catch {}
}

// 读取直连 S3/R2 上传配置（最小实现）
async function getUploaderConfig(): Promise<UploaderConfig | null> {
  try {
    if (!store) return null
    const up = await store.get('uploader')
    if (!up || typeof up !== 'object') return null
    const o = up as any
    const cfg: UploaderConfig = {
      enabled: !!o.enabled,
      accessKeyId: String(o.accessKeyId || ''),
      secretAccessKey: String(o.secretAccessKey || ''),
      bucket: String(o.bucket || ''),
      region: typeof o.region === 'string' ? o.region : undefined,
      endpoint: typeof o.endpoint === 'string' ? o.endpoint : undefined,
      customDomain: typeof o.customDomain === 'string' ? o.customDomain : undefined,
      keyTemplate: typeof o.keyTemplate === 'string' ? o.keyTemplate : '{year}/{month}{fileName}{md5}.{extName}',
      aclPublicRead: o.aclPublicRead !== false,
      forcePathStyle: o.forcePathStyle !== false,
      convertToWebp: !!o.convertToWebp,
      webpQuality: (typeof o.webpQuality === 'number' ? o.webpQuality : 0.85),
      saveLocalAsWebp: !!o.saveLocalAsWebp,
    }
    if (!cfg.enabled) return null
    if (!cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) return null
    return cfg
  } catch { return null }
}

// 将获取上传配置的方法暴露到全局，供所见 V2 的上传插件使用
try {
  if (typeof window !== 'undefined') {
    ;(window as any).flymdGetUploaderConfig = getUploaderConfig
    ;(window as any).flymdGetCurrentFilePath = () => currentFilePath
    ;(window as any).flymdGetDefaultPasteDir = () => getDefaultPasteDir()
    ;(window as any).flymdAlwaysSaveLocalImages = () => getAlwaysSaveLocalImages()
    ;(window as any).flymdSaveImageToLocalAndGetPath = (file: File, name: string) => saveImageToLocalAndGetPath(file, name)
  }
} catch {}

// 暴露标签系统需要的函数（包装器模式）
try {
  if (typeof window !== 'undefined') {
    // 状态获取/设置
    ;(window as any).flymdSetCurrentFilePath = (path: string | null) => { currentFilePath = path }
    ;(window as any).flymdSetDirty = (d: boolean) => { dirty = d; refreshTitle() }
    ;(window as any).flymdGetMode = () => mode
    ;(window as any).flymdSetMode = (m: Mode) => {
      mode = m
      if (mode === 'preview') {
        try { preview.classList.remove('hidden') } catch {}
      } else {
        if (!wysiwyg) try { preview.classList.add('hidden') } catch {}
      }
      try {
        (document.getElementById('btn-toggle') as HTMLButtonElement).textContent = mode === 'edit' ? '阅读' : '源码'
      } catch {}
    }
    ;(window as any).flymdGetWysiwygEnabled = () => wysiwyg
    ;(window as any).flymdGetEditorContent = () => editor?.value ?? ''
    // UI 刷新
    ;(window as any).flymdRefreshTitle = () => refreshTitle()
    ;(window as any).flymdRefreshPreview = () => { try { renderPreview() } catch {} }
    ;(window as any).flymdRefreshFileTree = async () => {
      try {
        await fileTree.refresh()
      } catch (e) {
        console.error('[文件树] 手动刷新失败:', e)
      }
    }
    // 模式切换快捷逻辑（等价于 Ctrl+E）
    ;(window as any).flymdToggleModeShortcut = () => handleToggleModeShortcut()
    // 文件操作
    ;(window as any).flymdOpenFile = openFile2
    ;(window as any).flymdNewFile = newFile
    ;(window as any).flymdSaveFile = saveFile
    ;(window as any).flymdRenamePathWithDialog = (path: string) => renamePathWithDialog(path)
    ;(window as any).flymdRenameCurrentFileForTypecho = async (id: string, title: string) => {
      try {
        if (!currentFilePath) return null
        const idStr = String(id || '').trim()
        const baseTitle = String(title || '').trim()
        let safeTitle = baseTitle || idStr || '未命名'
        safeTitle = safeTitle
          .replace(/[\\/:*?"<>|]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '')
        if (!safeTitle) safeTitle = idStr || 'untitled'
        const core = idStr ? `${idStr}-${safeTitle}` : safeTitle
        const m = currentFilePath.match(/(\.[^\\/\\.]+)$/)
        const ext = m ? m[1] : ''
        const newName = core + ext
        const newPath = await renameFileSafe(currentFilePath, newName)
        currentFilePath = newPath as any
        refreshTitle()
        const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
        if (treeEl && fileTreeReady) {
          try { await fileTree.refresh() } catch {}
        }
        return newPath
      } catch (e) {
        console.error('[Typecho] 自动重命名当前文件失败', e)
        return null
      }
    }
    ;(window as any).flymdOpenInNewInstance = async (path: string) => {
      try { await openPath(path) } catch {}
    }
    // 便签模式：以新实例打开并自动进入便签模式
    ;(window as any).flymdCreateStickyNote = async (path: string) => {
      try {
        await invoke('open_as_sticky_note', { path })
      } catch (e) {
        console.error('[便签] 创建便签失败:', e)
        throw e
      }
    }
    // 确认对话框
    ;(window as any).flymdConfirmNative = confirmNative
    // 所见模式内容替换：仅在 V2 已启用且当前处于所见模式时才生效
    ;(window as any).flymdWysiwygV2ReplaceAll = async (md: string) => {
      try {
        if (!wysiwyg || !wysiwygV2Active) return
        await wysiwygV2ReplaceAll(String(md || ''))
      } catch {}
    }
  }
} catch {}

// 暴露通知管理器供其他模块使用
try {
  ;(window as any).NotificationManager = NotificationManager
} catch {}

function showUploaderOverlay(show: boolean) {
  const overlay = document.getElementById('uploader-overlay') as HTMLDivElement | null
  if (!overlay) return
  if (show) showSheet(overlay)
  else hideSheet(overlay)
}

// 读取“总是保存到本地”配置
async function getAlwaysSaveLocalImages(): Promise<boolean> {
  try {
    if (!store) return false
    const up = await store.get('uploader')
    if (!up || typeof up !== 'object') return false
    return !!(up as any).alwaysLocal
  } catch { return false }
}

// 读取图片转码偏好（即使未启用图床也可读取）
async function getTranscodePrefs(): Promise<{ convertToWebp: boolean; webpQuality: number; saveLocalAsWebp: boolean }> {
  try {
    if (!store) return { convertToWebp: false, webpQuality: 0.85, saveLocalAsWebp: false }
    const up = await store.get('uploader')
    const o = (up && typeof up === 'object') ? (up as any) : null
    return {
      convertToWebp: !!o?.convertToWebp,
      webpQuality: (typeof o?.webpQuality === 'number' ? o.webpQuality : 0.85),
      saveLocalAsWebp: !!o?.saveLocalAsWebp,
    }
  } catch { return { convertToWebp: false, webpQuality: 0.85, saveLocalAsWebp: false } }
}


// 简单的连通性测试：只验证 Endpoint 可达性（不进行真实上传）
async function testUploaderConnectivity(endpoint: string): Promise<{ ok: boolean; status: number; note: string }> {
  try {
    const ep = (endpoint || "").trim()
    if (!ep) return { ok: false, status: 0, note: "请填写 Endpoint" }
    let u: URL
    try { u = new URL(ep) } catch { return { ok: false, status: 0, note: "Endpoint 非法 URL" } }
    const origin = u.origin
    try {
      const mod: any = await import("@tauri-apps/plugin-http")
      if (mod && typeof mod.fetch === "function") {
        const r = await mod.fetch(origin, { method: "HEAD" })
        const ok = r && (r.ok === true || (typeof r.status === "number" && r.status >= 200 && r.status < 500))
        return { ok, status: r?.status ?? 0, note: ok ? "可访问" : "不可访问" }
      }
    } catch {}
    try {
      const r2 = await fetch(origin as any, { method: "HEAD" as any, mode: "no-cors" as any } as any)
      return { ok: true, status: 0, note: "已发起网络请求" }
    } catch (e: any) { return { ok: false, status: 0, note: e?.message || "网络失败" } }
  } catch (e: any) { return { ok: false, status: 0, note: e?.message || "异常" } }
}

// 抓取网页 <title>，用于将纯 URL 粘贴转换为 [标题](url)
async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const html = await fetchTextSmart(url)
    if (!html) return null
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (!m) return null
    let title = m[1] || ''
    // 归一化空白，避免标题里带有多行/多空格
    title = title.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (!title) return null
    return title
  } catch {
    return null
  }
}

async function openUploaderDialog() {
  const overlay = document.getElementById('uploader-overlay') as HTMLDivElement | null
  const form = overlay?.querySelector('#upl-form') as HTMLFormElement | null
  if (!overlay || !form) return

  const inputEnabled = overlay.querySelector('#upl-enabled') as HTMLInputElement
  const inputAlwaysLocal = overlay.querySelector('#upl-always-local') as HTMLInputElement
  const inputAk = overlay.querySelector('#upl-ak') as HTMLInputElement
  const inputSk = overlay.querySelector('#upl-sk') as HTMLInputElement
  const inputBucket = overlay.querySelector('#upl-bucket') as HTMLInputElement
  const inputEndpoint = overlay.querySelector('#upl-endpoint') as HTMLInputElement
  const inputRegion = overlay.querySelector('#upl-region') as HTMLInputElement
  const inputDomain = overlay.querySelector('#upl-domain') as HTMLInputElement
  const inputTpl = overlay.querySelector('#upl-template') as HTMLInputElement
  const inputPathStyle = overlay.querySelector('#upl-pathstyle') as HTMLInputElement
  const inputAcl = overlay.querySelector('#upl-acl') as HTMLInputElement
  const inputWebpEnable = overlay.querySelector('#upl-webp-enable') as HTMLInputElement
  const inputWebpQuality = overlay.querySelector('#upl-webp-quality') as HTMLInputElement
  const labelWebpQualityVal = overlay.querySelector('#upl-webp-quality-val') as HTMLSpanElement
  const inputWebpLocal = overlay.querySelector('#upl-webp-local') as HTMLInputElement
  const btnCancel = overlay.querySelector('#upl-cancel') as HTMLButtonElement
  const btnClose = overlay.querySelector('#upl-close') as HTMLButtonElement
  const btnTest = overlay.querySelector('#upl-test') as HTMLButtonElement
  const testRes = overlay.querySelector('#upl-test-result') as HTMLDivElement

  // 预填
  try {
    if (store) {
      const up = (await store.get('uploader')) as any
      inputEnabled.checked = !!up?.enabled
      inputAlwaysLocal.checked = !!up?.alwaysLocal
      inputAk.value = up?.accessKeyId || ''
      inputSk.value = up?.secretAccessKey || ''
      inputBucket.value = up?.bucket || ''
      inputEndpoint.value = up?.endpoint || ''
      inputRegion.value = up?.region || ''
      inputDomain.value = up?.customDomain || ''
      inputTpl.value = up?.keyTemplate || '{year}/{month}{fileName}{md5}.{extName}'
      inputPathStyle.checked = up?.forcePathStyle !== false
      inputAcl.checked = up?.aclPublicRead !== false
      inputWebpEnable.checked = !!up?.convertToWebp
      const q = typeof up?.webpQuality === 'number' ? up.webpQuality : 0.85
      inputWebpQuality.value = String(q)
      if (labelWebpQualityVal) labelWebpQualityVal.textContent = String(Number(q).toFixed(2))
      inputWebpLocal.checked = !!up?.saveLocalAsWebp
    }
  } catch {}

  showUploaderOverlay(true)
  // 开关即时生效：切换启用时立即写入（仅在必填项齐全时生效）
  try {
    const applyImmediate = async () => {
      try {
        const cfg = {
          enabled: !!inputEnabled.checked,
          alwaysLocal: !!inputAlwaysLocal.checked,
          accessKeyId: inputAk.value.trim(),
          secretAccessKey: inputSk.value.trim(),
          bucket: inputBucket.value.trim(),
          endpoint: inputEndpoint.value.trim() || undefined,
          region: inputRegion.value.trim() || undefined,
          customDomain: inputDomain.value.trim() || undefined,
          keyTemplate: inputTpl.value.trim() || '{year}/{month}{fileName}{md5}.{extName}',
          forcePathStyle: !!inputPathStyle.checked,
          aclPublicRead: !!inputAcl.checked,
          convertToWebp: !!inputWebpEnable.checked,
          webpQuality: (() => { const n = parseFloat(inputWebpQuality.value); return Number.isFinite(n) ? n : 0.85 })(),
          saveLocalAsWebp: !!inputWebpLocal.checked,
        }
        if (cfg.enabled && !cfg.alwaysLocal) {
          if (!cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) {
            alert('启用上传需要 AccessKeyId、SecretAccessKey、Bucket');
            inputEnabled.checked = false
            return
          }
        }
        if (store) { await store.set('uploader', cfg); await store.save(); uploaderEnabledSnapshot = !!cfg.enabled }
      } catch (e) { console.warn('即时应用图床开关失败', e) }
    }
    inputEnabled.addEventListener('change', () => { void applyImmediate() })
    inputAlwaysLocal.addEventListener('change', () => { void applyImmediate() })
    inputWebpEnable.addEventListener('change', () => { void applyImmediate() })
    inputWebpQuality.addEventListener('input', () => {
      try { if (labelWebpQualityVal) labelWebpQualityVal.textContent = String(Number(parseFloat(inputWebpQuality.value)).toFixed(2)) } catch {}
    })
    inputWebpQuality.addEventListener('change', () => { void applyImmediate() })
    inputWebpLocal.addEventListener('change', () => { void applyImmediate() })
  } catch {}

  const onCancel = () => { showUploaderOverlay(false) }
  const onSubmit = async (e: Event) => {
    e.preventDefault()
    try {
      const cfg = {
        enabled: !!inputEnabled.checked,
        alwaysLocal: !!inputAlwaysLocal.checked,
        accessKeyId: inputAk.value.trim(),
        secretAccessKey: inputSk.value.trim(),
        bucket: inputBucket.value.trim(),
        endpoint: inputEndpoint.value.trim() || undefined,
        region: inputRegion.value.trim() || undefined,
        customDomain: inputDomain.value.trim() || undefined,
        keyTemplate: inputTpl.value.trim() || '{year}/{month}{fileName}{md5}.{extName}',
        forcePathStyle: !!inputPathStyle.checked,
        aclPublicRead: !!inputAcl.checked,
        convertToWebp: !!inputWebpEnable.checked,
        webpQuality: (() => { const n = parseFloat(inputWebpQuality.value); return Number.isFinite(n) ? n : 0.85 })(),
        saveLocalAsWebp: !!inputWebpLocal.checked,
      }
      if (cfg.enabled && !cfg.alwaysLocal) {
        if (!cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) {
          alert('启用直传时 AccessKeyId、SecretAccessKey、Bucket 为必填');
          return
        }
      }
      if (store) {
        await store.set('uploader', cfg)
        await store.save()
        uploaderEnabledSnapshot = !!cfg.enabled
      }
      showUploaderOverlay(false)
    } catch (err) {
      showError('保存图床设置失败', err)
    } finally {
      form?.removeEventListener('submit', onSubmit)
      btnCancel?.removeEventListener('click', onCancel)
      btnClose?.removeEventListener('click', onCancel)
      overlay?.removeEventListener('click', onOverlayClick)
    }
  }
  const onOverlayClick = (e: MouseEvent) => { if (e.target === overlay) onCancel() }
  form.addEventListener('submit', onSubmit)
  btnCancel.addEventListener('click', onCancel)
  btnClose.addEventListener('click', onCancel)
  overlay.addEventListener('click', onOverlayClick)
}

function updateLibrarySideButton() {
  try {
    const btn = document.getElementById('lib-side') as HTMLButtonElement | null
    if (!btn) return
    const label = t(librarySide === 'right' ? 'lib.side.right' : 'lib.side.left')
    const icon = librarySide === 'right' ? 'fa-solid fa-arrow-right' : 'fa-solid fa-arrow-left'
    setIconButton(btn, icon, label)
    btn.title = t('lib.side.toggle')
  } catch {}
}

function syncLibraryEdgeState(libVisible: boolean) {
  try {
    if (!_libEdgeEl) return
    _libEdgeEl.style.display = (!libraryDocked && !libVisible) ? 'block' : 'none'
    if (librarySide === 'right') {
      _libEdgeEl.style.left = ''
      _libEdgeEl.style.right = '0'
    } else {
      _libEdgeEl.style.left = '0'
      _libEdgeEl.style.right = ''
    }
  } catch {}
}

function syncLibraryFloatToggle() {
  try {
    if (!_libFloatToggleEl) {
      return
    }
    _libFloatToggleEl.classList.toggle('side-right', librarySide === 'right')
    _libFloatToggleEl.classList.toggle('side-left', librarySide !== 'right')
    const icon = librarySide === 'right' ? 'fa-solid fa-angles-left' : 'fa-solid fa-angles-right'
    setIconButton(_libFloatToggleEl, icon, t('lib.menu'))
  } catch {}
}

function buildSettingsItem(id: string, icon: string, label: string, desc: string): string {
  return `
    <button class="settings-item" id="${id}" type="button">
      <span class="settings-item-icon"><i class="${icon}" aria-hidden="true"></i></span>
      <span class="settings-item-body">
        <span class="settings-item-title">${label}</span>
        <span class="settings-item-desc">${desc}</span>
      </span>
    </button>
  `
}

function ensureSettingsOverlay(): HTMLDivElement | null {
  if (_settingsOverlayEl && document.body.contains(_settingsOverlayEl)) return _settingsOverlayEl

  const container = document.querySelector('.container') as HTMLDivElement | null
  if (!container) return null

  const settingsTitle = t('ext.settings') || '设置'
  const basicTitle = '基础设置'
  const featureTitle = '功能设置'
  const pluginsTitle = '插件列表'
  const closeLabel = t('about.close') || '关闭'
  const backLabel = '返回'

  const overlay = document.createElement('div')
  overlay.id = 'settings-overlay'
  overlay.className = 'settings-overlay sheet-overlay hidden'
  overlay.setAttribute('aria-hidden', 'true')
  overlay.innerHTML = `
    <div class="settings-panel sheet-panel">
      <div class="settings-header">
        <button class="settings-back" id="settings-back" aria-label="${backLabel}"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>
        <div class="settings-title">${settingsTitle}</div>
        <button class="settings-close" id="settings-close" aria-label="${closeLabel}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </div>
      <div class="settings-content">
        <div class="settings-group">
          <div class="settings-group-title"><i class="fa-solid fa-sliders" aria-hidden="true"></i><span>${basicTitle}</span></div>
          <div class="settings-items">
            ${buildSettingsItem('settings-about', 'fa-solid fa-circle-info', t('menu.about'), '查看应用信息与支持入口')}
            ${buildSettingsItem('settings-theme', 'fa-solid fa-palette', '主题', '切换配色、行距与排版')}
            ${buildSettingsItem('settings-update', 'fa-solid fa-arrows-rotate', t('menu.update'), '检查新版本与更新日志')}
          </div>
        </div>
        <div class="settings-group">
          <div class="settings-group-title"><i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i><span>${featureTitle}</span></div>
          <div class="settings-items">
            ${buildSettingsItem('settings-webdav', 'fa-solid fa-cloud', 'WebDAV 同步', '配置云端同步与冲突策略')}
            ${buildSettingsItem('settings-uploader', 'fa-solid fa-cloud-arrow-up', t('menu.uploader'), '粘贴/拖拽图片自动上传')}
            ${buildSettingsItem('settings-ai', 'fa-solid fa-robot', 'AI 助手', '模型与密钥设置，打开独立面板')}
            ${buildSettingsItem('settings-market', 'fa-solid fa-store', '扩展市场', '安装或管理插件与功能扩展')}
          </div>
        </div>
        <div class="settings-group settings-plugins">
          <div class="settings-group-title"><i class="fa-solid fa-plug-circle-check" aria-hidden="true"></i><span>${pluginsTitle}</span></div>
          <div class="settings-plugin-list" id="settings-plugin-list"></div>
        </div>
      </div>
    </div>
  `

  const closeOverlay = () => closeSettingsOverlay()
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeOverlay() })
  const closeBtn = overlay.querySelector('#settings-close') as HTMLButtonElement | null
  const backBtn = overlay.querySelector('#settings-back') as HTMLButtonElement | null
  closeBtn?.addEventListener('click', closeOverlay)
  backBtn?.addEventListener('click', closeOverlay)
  try {
    const panel = overlay.querySelector('.settings-panel') as HTMLDivElement | null
    attachBottomSheetSwipe(overlay, panel, closeOverlay)
  } catch {}

  const actionMap: Record<string, () => Promise<void> | void> = {
    'settings-about': () => showAbout(true),
    'settings-theme': () => { const btn = document.getElementById('btn-theme') as HTMLElement | null; btn?.click() },
    'settings-update': () => checkUpdateInteractive(),
    'settings-webdav': () => openWebdavSyncDialog(),
    'settings-uploader': () => openUploaderDialog(),
    'settings-ai': () => openAiAssistantSettings(),
    'settings-market': () => showExtensionsOverlay(true),
  }
  Object.entries(actionMap).forEach(([id, action]) => {
    const btn = overlay.querySelector(`#${id}`) as HTMLButtonElement | null
    if (btn) btn.addEventListener('click', guard(async () => { closeOverlay(); await action() }))
  })

  _settingsPluginListEl = overlay.querySelector('#settings-plugin-list') as HTMLDivElement | null
  container.appendChild(overlay)
  _settingsOverlayEl = overlay
  return overlay
}

function closeSettingsOverlay(): void {
  try {
    if (_settingsOverlayEl) hideSheet(_settingsOverlayEl)
  } catch {}
}

async function openSettingsOverlay(): Promise<void> {
  try {
    const overlay = ensureSettingsOverlay()
    if (!overlay) return
    try { showLibrary(false, false) } catch {}
    showSheet(overlay)
    await refreshSettingsPluginList()
  } catch {}
}

async function refreshSettingsPluginList(): Promise<void> {
  try {
    const overlay = ensureSettingsOverlay()
    const list = _settingsPluginListEl || (overlay?.querySelector('#settings-plugin-list') as HTMLDivElement | null)
    if (!list) return
    list.innerHTML = ''

    let installed: Record<string, InstalledPlugin> = {}
    try { installed = await getInstalledPlugins() } catch {}
    const merged = new Map<string, InstalledPlugin>()
    for (const p of builtinPlugins) merged.set(p.id, p)
    for (const p of Object.values(installed || {})) {
      if (p) merged.set(p.id, p)
    }
    const enabled = Array.from(merged.values()).filter((p) => p && p.enabled !== false)

    if (enabled.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'settings-empty'
      empty.textContent = '暂无启用的插件'
      list.appendChild(empty)
      return
    }

    enabled.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))

    const frag = document.createDocumentFragment()
    for (const p of enabled) {
      const row = document.createElement('div')
      row.className = 'settings-plugin'

      const icon = document.createElement('span')
      icon.className = 'settings-plugin-icon'
      icon.innerHTML = '<i class="fa-solid fa-plug" aria-hidden="true"></i>'

      const body = document.createElement('div')
      body.className = 'settings-plugin-body'
      const name = document.createElement('div')
      name.className = 'settings-plugin-name'
      name.textContent = p.name || p.id
      const meta = document.createElement('div')
      meta.className = 'settings-plugin-meta'
      const parts: string[] = []
      if (p.version) parts.push(`v${p.version}`)
      if (p.builtin) parts.push('内置')
      parts.push('已启用')
      meta.textContent = parts.join(' · ')
      body.appendChild(name)
      body.appendChild(meta)

      row.appendChild(icon)
      row.appendChild(body)
      frag.appendChild(row)
    }
    list.appendChild(frag)
  } catch (e) {
    console.error('渲染插件列表失败', e)
  }
}

async function openAiAssistantSettings(): Promise<void> {
  try {
    const mod = activePlugins.get('ai-assistant') as any
    const ctx = (window as any).__pluginCtx__?.['ai-assistant']
    if (mod && ctx) {
      if (typeof mod?.openSettings === 'function') { await mod.openSettings(ctx); return }
      if (typeof mod?.openPanel === 'function') { await mod.openPanel(ctx); return }
      if (typeof mod?.standalone === 'function') { await mod.standalone(ctx); return }
    }
  } catch (e) {
    console.warn('打开 AI 助手设置失败', e)
  }
  try { await showExtensionsOverlay(true) } catch {}
}

  function syncCustomTitlebarPlacement() {
  try {
    const titleBar = document.getElementById('custom-titlebar') as HTMLDivElement | null
    if (!titleBar) return
    const controlsLeft = focusMode && librarySide === 'right'
    titleBar.classList.toggle('controls-left', controlsLeft)
  } catch {}
}

  // 根据当前大纲布局模式应用布局（大纲剥离/嵌入）
  function applyOutlineLayout() {
    try {
      const container = document.querySelector('.container') as HTMLDivElement | null
      const libraryEl = document.getElementById('library') as HTMLDivElement | null
      const outlineEl = document.getElementById('lib-outline') as HTMLDivElement | null
      if (!container || !outlineEl) return
      // 默认：嵌入库侧栏（与旧行为一致）
      if (outlineLayout === 'embedded') {
        if (libraryEl && outlineEl.parentElement !== libraryEl) {
          libraryEl.appendChild(outlineEl)
        }
        outlineEl.classList.remove('outline-floating', 'side-left', 'side-right')
        container.classList.remove('with-outline-left', 'with-outline-right')
        notifyWorkspaceLayoutChanged()
        return
      }
      // 剥离：挂到容器下作为独立列
      if (outlineEl.parentElement !== container) {
        container.appendChild(outlineEl)
      }
      outlineEl.classList.add('outline-floating')
      const isLeft = outlineLayout === 'left'
      outlineEl.classList.toggle('side-left', isLeft)
      outlineEl.classList.toggle('side-right', !isLeft)
      container.classList.toggle('with-outline-left', isLeft)
      container.classList.toggle('with-outline-right', !isLeft)
      notifyWorkspaceLayoutChanged()
    } catch {}
  }

  // 库面板显示/隐藏：使用覆盖式抽屉，不再改动容器布局（避免编辑区被右移抖动）
  function applyLibraryLayout() {
  let visible = false
  try {
    const lib = document.getElementById('library') as HTMLDivElement | null
    const container = document.querySelector('.container') as HTMLDivElement | null
    if (lib) {
      lib.classList.toggle('side-right', librarySide === 'right')
      lib.classList.toggle('side-left', librarySide !== 'right')
      const toggleBtn = document.getElementById('lib-toggle') as HTMLButtonElement | null
      if (toggleBtn) toggleBtn.textContent = librarySide === 'right' ? '>' : '<'
      visible = !lib.classList.contains('hidden')
    }
      if (container) {
        container.classList.remove('with-library-left', 'with-library-right')
        if (visible && libraryDocked) {
          container.classList.add('with-library')
          container.classList.add(librarySide === 'right' ? 'with-library-right' : 'with-library-left')
        } else {
          container.classList.remove('with-library')
        }
      }
    } catch {}
    // 库布局变化后，同步更新大纲布局（用于处理“库固定/位置改变时大纲列位置更新”）
    try { applyOutlineLayout() } catch {}
    notifyWorkspaceLayoutChanged()
  syncLibraryEdgeState(visible)
  syncLibraryFloatToggle()
  syncCustomTitlebarPlacement()
}

  function initLibrarySwipeGesture(): void {
  if (_librarySwipeBound || !isMobilePlatform()) return
  const surface = document.querySelector('.container') as HTMLElement | null
  const lib = document.getElementById('library') as HTMLDivElement | null
  if (!surface || !lib) return
  _librarySwipeBound = true
  let startX = 0
  let startY = 0
  let dragging = false
  surface.addEventListener('touchstart', (ev: TouchEvent) => {
    if (!ev.touches || ev.touches.length !== 1) return
    const t = ev.touches[0]
    const edge = 28
    const fromLeft = t.clientX <= edge && librarySide !== 'right'
    const fromRight = t.clientX >= (window.innerWidth - edge) && librarySide === 'right'
    if (fromLeft || fromRight) {
      startX = t.clientX
      startY = t.clientY
      dragging = true
    } else {
      dragging = false
    }
  }, { passive: true })
  surface.addEventListener('touchmove', (ev: TouchEvent) => {
    if (!dragging || !ev.touches || ev.touches.length !== 1) return
    const t = ev.touches[0]
    const dx = t.clientX - startX
    const dy = Math.abs(t.clientY - startY)
    if (dy > 40) { dragging = false; return }
    const threshold = 50
    if ((librarySide !== 'right' && dx > threshold) || (librarySide === 'right' && -dx > threshold)) {
      showLibrary(true, false)
      dragging = false
    }
  }, { passive: true })
  const cancel = () => { dragging = false }
  surface.addEventListener('touchend', cancel)
  surface.addEventListener('touchcancel', cancel)
}

  // 库面板显示/隐藏：使用覆盖式抽屉为默认；若开启“固定”，则并排显示
  function showLibrary(show: boolean, persist = true) {
  libraryVisible = !!show
  const lib = document.getElementById('library') as HTMLDivElement | null
  if (!lib) return
  lib.classList.toggle('hidden', !show)
    applyLibraryLayout()
  if (show && !fileTreeReady) {
    void (async () => {
      try { await refreshLibraryUiAndTree(true) } catch {}
    })()
  }
  // 非固定模式：绑定悬停离开自动隐藏
  if (show && !libraryDocked) {
    try {
      // 仅绑定一次
      if (!(lib as any)._hoverBound) {
        const onEnter = () => { if (_libLeaveTimer != null) { clearTimeout(_libLeaveTimer); _libLeaveTimer = null } }
        const onLeave = (ev: MouseEvent) => {
          try {
            if (libraryDocked) return
            const rt = ev.relatedTarget as Node | null
            if (rt && lib.contains(rt)) return
            if (_libLeaveTimer != null) { clearTimeout(_libLeaveTimer); _libLeaveTimer = null }
            _libLeaveTimer = window.setTimeout(() => {
              try { if (!libraryDocked && lib && !lib.matches(':hover')) showLibrary(false, false) } catch {}
            }, 200)
          } catch {}
        }
        lib.addEventListener('mouseenter', onEnter)
        lib.addEventListener('mouseleave', onLeave)
        ;(lib as any)._hoverBound = true
      }
    } catch {}
  }
    // 更新边缘热区可见性
    try {
      const libVisible = !lib.classList.contains('hidden')
      syncLibraryEdgeState(libVisible)
    } catch {}
  if (persist) { void persistLibraryVisible() }
}

  async function setLibraryDocked(docked: boolean, persist = true) {
  libraryDocked = !!docked
    try { if (persist && store) { await store.set('libraryDocked', libraryDocked); await store.save() } } catch {}
  // 更新按钮文案
  try {
    const btn = document.getElementById('lib-pin') as HTMLButtonElement | null
    if (btn) {
      setIconButton(btn, 'fa-solid fa-thumbtack', libraryDocked ? t('lib.pin.auto') : t('lib.pin.fixed'))
      btn.classList.toggle('pinned', !libraryDocked)
    }
  } catch {}
    applyLibraryLayout()
  // 若当前已显示且切到“非固定”，补绑定悬停自动隐藏
  try {
    const lib = document.getElementById('library') as HTMLDivElement | null
    if (lib && !lib.classList.contains('hidden') && !libraryDocked) showLibrary(true, false)
  } catch {}
}

async function getLibraryDocked(): Promise<boolean> {
  try { if (!store) return libraryDocked; const v = await store.get('libraryDocked'); return !!v } catch { return libraryDocked }
}

async function persistLibraryVisible() {
  try { if (!store) return; await store.set('libraryVisible', libraryVisible); await store.save() } catch {}
}

  async function getLibraryVisible(): Promise<boolean> {
  try {
    if (!store) return libraryVisible
    const v = await store.get('libraryVisible')
    if (typeof v === 'boolean') return v
  } catch {}
    return true
  }

  const OUTLINE_LAYOUT_KEY = 'outlineLayout'

  // 大纲布局：右键菜单 UI（挂在“大纲”标签上）
  function showOutlineLayoutMenu(x: number, y: number) {
    try {
      const existing = document.getElementById('outline-layout-menu') as HTMLDivElement | null
      if (existing && existing.parentElement) existing.parentElement.removeChild(existing)
      const menu = document.createElement('div')
      menu.id = 'outline-layout-menu'
      menu.style.position = 'fixed'
      menu.style.zIndex = '99999'
      menu.style.left = `${x}px`
      menu.style.top = `${y}px`
      menu.style.background = 'var(--bg)'
      menu.style.border = '1px solid var(--border)'
      menu.style.borderRadius = '8px'
      menu.style.padding = '4px 0'
      menu.style.boxShadow = '0 8px 24px rgba(15,23,42,0.2)'
      menu.style.minWidth = '140px'
      menu.style.fontSize = '12px'
      const makeItem = (label: string, mode: OutlineLayout) => {
        const item = document.createElement('div')
        item.textContent = label
        item.style.padding = '6px 12px'
        item.style.cursor = 'pointer'
        item.style.whiteSpace = 'nowrap'
        item.style.color = 'var(--fg)'
        if (outlineLayout === mode) {
          item.style.fontWeight = '600'
        }
        item.addEventListener('mouseenter', () => { item.style.background = 'rgba(148,163,184,0.16)' })
        item.addEventListener('mouseleave', () => { item.style.background = 'transparent' })
        item.addEventListener('click', () => {
          try { void setOutlineLayout(mode) } catch {}
          try {
            if (menu.parentElement) menu.parentElement.removeChild(menu)
          } catch {}
        })
        return item
      }
      menu.appendChild(makeItem('嵌入侧栏', 'embedded'))
      menu.appendChild(makeItem('剥离（库 | 大纲 | 编辑区）', 'left'))
      menu.appendChild(makeItem('右侧（库 | 编辑区 | 大纲）', 'right'))
      const close = () => {
        try {
          document.removeEventListener('click', onDocClick, true)
          document.removeEventListener('contextmenu', onDocCtx, true)
          if (menu.parentElement) menu.parentElement.removeChild(menu)
        } catch {}
      }
      const onDocClick = (ev: MouseEvent) => {
        try {
          if (menu.contains(ev.target as Node)) return
        } catch {}
        close()
      }
      const onDocCtx = (ev: MouseEvent) => {
        try {
          if (menu.contains(ev.target as Node)) return
        } catch {}
        close()
      }
      document.addEventListener('click', onDocClick, true)
      document.addEventListener('contextmenu', onDocCtx, true)
      document.body.appendChild(menu)
    } catch {}
  }

  async function setOutlineLayout(mode: OutlineLayout, persist = true): Promise<void> {
    outlineLayout = mode
    try {
      if (persist && store) {
        await store.set(OUTLINE_LAYOUT_KEY, outlineLayout)
        await store.save()
      }
    } catch {}
    applyOutlineLayout()
    // 剥离模式下，确保目录和大纲同时可见
    try {
      const library = document.getElementById('library') as HTMLDivElement | null
      const treeEl = library?.querySelector('#lib-tree') as HTMLDivElement | null
      const outlineEl = document.getElementById('lib-outline') as HTMLDivElement | null
      if (outlineLayout !== 'embedded') {
        if (treeEl) treeEl.classList.remove('hidden')
        if (outlineEl) outlineEl.classList.remove('hidden')
      }
    } catch {}
  }

  async function getOutlineLayout(): Promise<OutlineLayout> {
    try {
      if (!store) return outlineLayout
      const v = await store.get(OUTLINE_LAYOUT_KEY)
      if (v === 'embedded' || v === 'left' || v === 'right') return v
    } catch {}
    return outlineLayout
  }

  async function setLibrarySide(side: LibrarySide, persist = true) {
  librarySide = side === 'right' ? 'right' : 'left'
    try { if (persist && store) { await store.set('librarySide', librarySide); await store.save() } } catch {}
    updateLibrarySideButton()
    applyLibraryLayout()
  }

async function getLibrarySide(): Promise<LibrarySide> {
  try {
    if (!store) return librarySide
    const v = await store.get('librarySide')
    if (v === 'left' || v === 'right') return v
  } catch {}
  return librarySide
}

// ========== 专注模式（Focus Mode）==========
// 隐藏顶栏，鼠标移到顶部边缘时自动显示

async function toggleFocusMode(enabled?: boolean) {
  focusMode = enabled !== undefined ? enabled : !focusMode
  document.body.classList.toggle('focus-mode', focusMode)

  // 专注模式：启用自定义标题栏；普通模式：移除，仅保留紧凑标题栏按钮
  try {
    if (focusMode) {
      createCustomTitleBar({
        getCurrentWindow,
        onExitFocus: () => toggleFocusMode(false),
      })
    } else {
      removeCustomTitleBar()
    }
    await applyWindowDecorationsCore(getCurrentWindow, focusMode, compactTitlebar)
    try { syncCustomTitlebarPlacement() } catch {}
  } catch {}

  // 如果退出专注模式，确保 titlebar 可见
  if (!focusMode) {
    const titlebar = document.querySelector('.titlebar') as HTMLElement | null
    if (titlebar) titlebar.classList.remove('show')
  }
  // 更新侧栏背景色
  try { updateFocusSidebarBg() } catch {}
}

// 将 toggleFocusMode 暴露到全局，供 theme.ts 调用
;(window as any).flymdToggleFocusMode = toggleFocusMode

async function getFocusMode(): Promise<boolean> {
  try { if (!store) return focusMode; const v = await store.get('focusMode'); return !!v } catch { return focusMode }
}

// 紧凑标题栏：使用 Store 持久化，并通过 body 类与窗口装饰体现
async function getCompactTitlebar(): Promise<boolean> {
  try {
    if (!store) return compactTitlebar
    const v = await store.get('compactTitlebar')
    return !!v
  } catch {
    return compactTitlebar
  }
}

async function setCompactTitlebar(enabled: boolean, persist = true): Promise<void> {
  compactTitlebar = !!enabled
  try { document.body.classList.toggle('compact-titlebar', compactTitlebar) } catch {}
  if (persist && store) {
    try {
      await store.set('compactTitlebar', compactTitlebar)
      await store.save()
    } catch {}
  }
  try { await applyWindowDecorationsCore(getCurrentWindow, focusMode, compactTitlebar) } catch {}
}

// 暴露给主题面板调用
;(window as any).flymdSetCompactTitlebar = async (enabled: boolean) => {
  try {
    await setCompactTitlebar(enabled, true)
  } catch {}
}

function initFocusModeEvents() {
  const triggerZone = document.getElementById('focus-trigger-zone')
  const titlebar = document.querySelector('.titlebar') as HTMLElement | null
  if (!triggerZone || !titlebar) return

  // 鼠标进入顶部触发区域：延迟显示 titlebar
  triggerZone.addEventListener('mouseenter', () => {
    if (!focusMode) return
    if (_focusTitlebarHideTimer) { clearTimeout(_focusTitlebarHideTimer); _focusTitlebarHideTimer = null }
    if (_focusTitlebarShowTimer) return
    _focusTitlebarShowTimer = window.setTimeout(() => {
      _focusTitlebarShowTimer = null
      if (focusMode) titlebar.classList.add('show')
    }, 150)
  })

  // 鼠标进入 titlebar：保持显示
  titlebar.addEventListener('mouseenter', () => {
    if (!focusMode) return
    if (_focusTitlebarHideTimer) { clearTimeout(_focusTitlebarHideTimer); _focusTitlebarHideTimer = null }
    if (_focusTitlebarShowTimer) { clearTimeout(_focusTitlebarShowTimer); _focusTitlebarShowTimer = null }
    titlebar.classList.add('show')
  })

  // 鼠标离开 titlebar：延迟隐藏
  titlebar.addEventListener('mouseleave', () => {
    if (!focusMode) return
    if (_focusTitlebarShowTimer) { clearTimeout(_focusTitlebarShowTimer); _focusTitlebarShowTimer = null }
    if (_focusTitlebarHideTimer) { clearTimeout(_focusTitlebarHideTimer); _focusTitlebarHideTimer = null }
    _focusTitlebarHideTimer = window.setTimeout(() => {
      _focusTitlebarHideTimer = null
      if (focusMode && !titlebar.matches(':hover')) titlebar.classList.remove('show')
    }, 300)
  })

  // 窗口大小变化时（最大化/还原）：检查并隐藏 titlebar
  window.addEventListener('resize', () => {
    if (!focusMode) return
    // 清除所有计时器
    if (_focusTitlebarShowTimer) { clearTimeout(_focusTitlebarShowTimer); _focusTitlebarShowTimer = null }
    if (_focusTitlebarHideTimer) { clearTimeout(_focusTitlebarHideTimer); _focusTitlebarHideTimer = null }
    // 延迟检查，等待窗口状态稳定
    _focusTitlebarHideTimer = window.setTimeout(() => {
      _focusTitlebarHideTimer = null
      if (focusMode && !titlebar.matches(':hover') && !triggerZone.matches(':hover')) {
        titlebar.classList.remove('show')
      }
    }, 200)
  })

  // 监听来自主题面板开关的专注模式切换事件
  window.addEventListener('flymd:focus:toggle', async (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {}
      const enabled = !!detail.enabled
      focusMode = enabled
      // 如果退出专注模式，确保 titlebar 可见
      if (!focusMode) {
        titlebar.classList.remove('show')
      }
      // 更新侧栏背景色
      updateFocusSidebarBg()
    })

  // 所见模式默认开关：主题面板勾选后，立即同步当前模式并持久化
  window.addEventListener('flymd:wysiwyg:default', async (ev: Event) => {
    try {
      const detail = (ev as CustomEvent).detail || {}
      const enabled = !!detail.enabled
      // 便签模式下不自动切换所见模式，避免与简化界面冲突
      if (stickyNoteMode) return
      if (enabled !== wysiwyg) {
        await setWysiwygEnabled(enabled)
      }
    } catch {}
  })

  // 源码模式默认开关：主题面板勾选后，立即切换当前模式
  window.addEventListener('flymd:sourcemode:default', async (ev: Event) => {
    try {
      const detail = (ev as CustomEvent).detail || {}
      const enabled = !!detail.enabled

      // 便签模式下不自动切换
      if (stickyNoteMode) return

      if (enabled) {
        // 启用源码模式：切换到 edit 模式，关闭所见模式
        if (wysiwyg) {
          await setWysiwygEnabled(false)
        }
        if (mode !== 'edit') {
          mode = 'edit'
          // 刷新UI
          try { preview.classList.add('hidden') } catch {}
          try { syncToggleButton() } catch {}
          try { notifyModeChange() } catch {}
        }
      }
      // 如果禁用源码模式，不做任何操作（保持当前模式）
    } catch {}
  })
}

// 平台类初始化：为 body 添加平台标识类，用于 CSS 平台适配
function initPlatformClass() {
  const platform = (navigator.platform || '').toLowerCase()
  if (platform.includes('win')) {
    document.body.classList.add('platform-windows')
  } else if (platform.includes('mac')) {
    document.body.classList.add('platform-mac')
  } else if (platform.includes('linux')) {
    document.body.classList.add('platform-linux')
  }
}

// 窗口拖拽初始化：为 mac / Linux 上的紧凑标题栏补齐拖动支持
function initWindowDrag() {
  const titlebar = document.querySelector('.titlebar') as HTMLElement | null
  if (!titlebar) return

  const platform = (navigator.platform || '').toLowerCase()
  const isMac = platform.includes('mac')
  const isLinux = platform.includes('linux')
  // Windows 上原生 + -webkit-app-region 已足够，这里只为 mac/Linux 打补丁
  if (!isMac && !isLinux) return

  const shouldIgnoreTarget = (target: EventTarget | null): boolean => {
    const el = target as HTMLElement | null
    if (!el) return false
    return !!el.closest('.window-controls, .menu-item, button, a, input, textarea, [data-tauri-drag-ignore]')
  }

  titlebar.addEventListener('mousedown', (ev: MouseEvent) => {
    if (ev.button !== 0) return
    // 便签锁定或未开启紧凑/专注标题栏时，不处理拖动
    if (stickyNoteLocked) return
    if (!(compactTitlebar || focusMode || stickyNoteMode)) return
    if (shouldIgnoreTarget(ev.target)) return
    try {
      const win = getCurrentWindow()
      void win.startDragging()
    } catch {}
  })
}

// 窗口边缘 resize 初始化：为 decorations: false 时提供窗口调整大小功能
function initWindowResize() {
  // 创建 resize handles 容器
  const container = document.createElement('div')
  container.className = 'window-resize-handles'

  // 创建 8 个 resize handles（四边 + 四角）
  const handles = ['top', 'bottom', 'left', 'right', 'corner-nw', 'corner-ne', 'corner-sw', 'corner-se']
  handles.forEach(dir => {
    const handle = document.createElement('div')
    handle.className = `window-resize-handle ${dir}`
    handle.dataset.resizeDir = dir
    container.appendChild(handle)
  })
  document.body.appendChild(container)

  // resize 状态
  let resizing = false
  let startX = 0
  let startY = 0
  let startWidth = 0
  let startHeight = 0
  let startPosX = 0
  let startPosY = 0
  let direction = ''
  const MIN_WIDTH = 600
  const MIN_HEIGHT = 400

  // mousedown：开始 resize
  container.addEventListener('mousedown', async (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.classList.contains('window-resize-handle')) return

    e.preventDefault()
    e.stopPropagation()

    resizing = true
    direction = target.dataset.resizeDir || ''
    startX = e.screenX
    startY = e.screenY

    try {
      const win = getCurrentWindow()
      const size = await win.innerSize()
      const pos = await win.outerPosition()
      startWidth = size.width
      startHeight = size.height
      startPosX = pos.x
      startPosY = pos.y
    } catch {}
  })

  // mousemove：执行 resize
  document.addEventListener('mousemove', async (e: MouseEvent) => {
    if (!resizing) return

    const deltaX = e.screenX - startX
    const deltaY = e.screenY - startY

    let newWidth = startWidth
    let newHeight = startHeight
    let newX = startPosX
    let newY = startPosY

    // 根据方向计算新尺寸和位置
    if (direction.includes('right') || direction === 'corner-ne' || direction === 'corner-se') {
      newWidth = Math.max(MIN_WIDTH, startWidth + deltaX)
    }
    if (direction.includes('left') || direction === 'corner-nw' || direction === 'corner-sw') {
      const widthDelta = Math.min(deltaX, startWidth - MIN_WIDTH)
      newWidth = startWidth - widthDelta
      newX = startPosX + widthDelta
    }
    if (direction.includes('bottom') || direction === 'corner-sw' || direction === 'corner-se') {
      newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY)
    }
    if (direction.includes('top') || direction === 'corner-nw' || direction === 'corner-ne') {
      const heightDelta = Math.min(deltaY, startHeight - MIN_HEIGHT)
      newHeight = startHeight - heightDelta
      newY = startPosY + heightDelta
    }

    try {
      const win = getCurrentWindow()
      // 先设置位置（如果需要），再设置尺寸
      if (newX !== startPosX || newY !== startPosY) {
        await win.setPosition({ type: 'Physical', x: Math.round(newX), y: Math.round(newY) })
      }
      await win.setSize({ type: 'Physical', width: Math.round(newWidth), height: Math.round(newHeight) })
    } catch {}
  })

  // mouseup：结束 resize
  document.addEventListener('mouseup', () => {
    resizing = false
    direction = ''
  })
}

// 更新专注模式下侧栏背景色：跟随编辑区背景色和网格设置
function updateFocusSidebarBg() {
  const library = document.querySelector('.library') as HTMLElement | null
  if (!library) return

  // 如果不是专注模式，移除自定义背景色和网格，使用默认
  if (!focusMode) {
    library.style.removeProperty('background')
    library.style.removeProperty('background-image')
    library.style.removeProperty('background-size')
    library.style.removeProperty('background-position')
    const header = library.querySelector('.lib-header') as HTMLElement | null
    if (header) {
      header.style.removeProperty('background')
      header.style.removeProperty('background-image')
      header.style.removeProperty('background-size')
      header.style.removeProperty('background-position')
    }
    return
  }

  // 专注模式下，获取编辑区的实际背景色
  let bgColor = '#ffffff' // 默认白色
  let hasGrid = false

  // 检查容器是否有网格背景
  const container = document.querySelector('.container') as HTMLElement | null
  if (container) {
    hasGrid = container.classList.contains('edit-grid-bg')

    // 根据当前模式获取对应的背景色
    const computedStyle = window.getComputedStyle(container)

    // 优先获取容器的背景色
    const containerBg = computedStyle.backgroundColor
    if (containerBg && containerBg !== 'transparent' && containerBg !== 'rgba(0, 0, 0, 0)') {
      bgColor = containerBg
    }
  }

  // 如果容器背景色无效，尝试从编辑器获取
  const editor = document.querySelector('.editor') as HTMLElement | null
  if (editor && bgColor === '#ffffff') {
    const computedStyle = window.getComputedStyle(editor)
    const editorBg = computedStyle.backgroundColor
    // 如果获取到有效的背景色（不是透明），使用它
    if (editorBg && editorBg !== 'transparent' && editorBg !== 'rgba(0, 0, 0, 0)') {
      bgColor = editorBg
    }
  }

  const header = library.querySelector('.lib-header') as HTMLElement | null

  // 应用背景色到库侧栏
  if (hasGrid && mode === 'edit' && !wysiwyg) {
    // 只在源码模式（非所见）下应用网格背景
    library.style.background = bgColor
    library.style.backgroundImage = 'linear-gradient(rgba(127,127,127,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(127,127,127,0.08) 1px, transparent 1px)'
    library.style.backgroundSize = '20px 20px'
    library.style.backgroundPosition = '-1px -1px'

    if (header) {
      header.style.background = 'transparent'
      header.style.backgroundImage = 'none'
      header.style.backgroundSize = 'unset'
      header.style.backgroundPosition = 'unset'
    }
  } else {
    // 没有网格或不是源码模式，只应用纯色背景
    library.style.background = bgColor
    library.style.removeProperty('background-image')
    library.style.removeProperty('background-size')
    library.style.removeProperty('background-position')

    if (header) {
      header.style.background = bgColor
      header.style.removeProperty('background-image')
      header.style.removeProperty('background-size')
      header.style.removeProperty('background-position')
    }
  }
}

// 监听模式切换事件，更新专注模式侧栏背景和外圈UI颜色
window.addEventListener('flymd:mode:changed', (ev: Event) => {
  updateFocusSidebarBg()
  // 更新外圈UI颜色（标题栏、侧栏等）跟随当前模式背景
  try {
    const detail = (ev as CustomEvent).detail || {}
    // 优先使用事件携带的模式信息，否则使用全局 mode/wysiwyg 状态
    let currentMode: 'edit' | 'wysiwyg' | 'preview' = 'edit'
    if (detail.wysiwyg === true) {
      currentMode = 'wysiwyg'
    } else if (detail.mode === 'preview' || (typeof detail.mode === 'undefined' && mode === 'preview')) {
      currentMode = 'preview'
    } else if (detail.wysiwyg === false && wysiwyg === false) {
      currentMode = mode === 'preview' ? 'preview' : 'edit'
    }
    updateChromeColorsForMode(currentMode)
  } catch {}
})
// 监听主题变更事件，更新专注模式侧栏背景
window.addEventListener('flymd:theme:changed', () => updateFocusSidebarBg())

// 监听夜间模式切换事件，重置 mermaid 并刷新预览
window.addEventListener('flymd:darkmode:changed', async () => {
  try {
    // 重置 mermaid 初始化状态，下次渲染时会使用新的主题配置
    mermaidReady = false
    // 清除 mermaid SVG 缓存，避免使用旧主题的缓存
    try { invalidateMermaidSvgCache() } catch {}
    // 根据当前模式刷新预览
    if (mode === 'preview') {
      await renderPreview()
    } else if (wysiwyg) {
      scheduleWysiwygRender()
    }
  } catch {}
})

// 暴露 updateFocusSidebarBg 到全局，供其他模块调用
;(window as any).updateFocusSidebarBg = updateFocusSidebarBg

// ========== 专注模式结束 ==========

// ========== 便签模式 ==========

// 锁定图标（图钉）
function getStickyLockIcon(isLocked: boolean): string {
  if (isLocked) {
    // 锁定状态：实心图钉
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/>
    </svg>`
  }
  // 未锁定：空心图钉
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/>
  </svg>`
}

// 置顶图标（箭头向上）
function getStickyTopIcon(isOnTop: boolean): string {
  if (isOnTop) {
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
    </svg>`
  }
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
  </svg>`
}

function getStickyOpacityIcon(): string {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12,2.69L17.33,8.02C19.13,9.82 20,11.87 20,14.23C20,16.59 19.13,18.64 17.33,20.44C15.53,22.24 13.5,23 12,23C10.5,23 8.47,22.24 6.67,20.44C4.87,18.64 4,16.59 4,14.23C4,11.87 4.87,9.82 6.67,8.02L12,2.69Z"/>
  </svg>`
}

function getStickyColorIcon(): string {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="8" rx="2" />
    <rect x="8" y="13" width="8" height="8" rx="2" />
  </svg>`
}

// 编辑图标（笔）
function getStickyEditIcon(isEditing: boolean): string {
  if (isEditing) {
    // 编辑状态：实心笔
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>`
  }
  // 阅读状态：空心笔
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>`
}

// 在便签模式中根据需要自动返回阅读模式
async function maybeAutoReturnStickyPreview() {
  try {
    if (!stickyNoteMode || !stickyTodoAutoPreview) return
    stickyTodoAutoPreview = false
    const btn = document.querySelector('.sticky-note-edit-btn') as HTMLButtonElement | null
    if (!btn) return
    await toggleStickyEditMode(btn)
  } catch {}
}

// 在便签模式中在文末插入一行待办项 "- [ ] "
async function addStickyTodoLine(editBtn: HTMLButtonElement) {
  try {
    // 所见模式下风险较高：暂不支持，避免破坏 WYSIWYG 状态
    if (wysiwyg || wysiwygV2Active) {
      try { alert('当前所见模式下暂不支持快速待办插入，请先切换回源码模式。') } catch {}
      return
    }

    // 记录插入前模式，用于决定是否自动返回阅读模式
    const prevMode = mode

    // 确保处于源码模式（必要时等价于用户点了一次“源码”按钮）
    if (mode !== 'edit') {
      try { await toggleStickyEditMode(editBtn) } catch {}
    }

    // 仅当从阅读模式切换过来时才开启自动返回阅读模式
    stickyTodoAutoPreview = stickyNoteMode && prevMode === 'preview'

    const ta = editor as HTMLTextAreaElement | null
    if (!ta) return

    const prev = String(ta.value || '')
    const needsNewline = prev.length > 0 && !prev.endsWith('\n')
    const insert = (needsNewline ? '\n' : '') + '- [ ] '
    const next = prev + insert

    ta.value = next
    const pos = next.length
    try {
      ta.selectionStart = pos
      ta.selectionEnd = pos
    } catch {}
    try { ta.focus() } catch {}

    try {
      dirty = true
      refreshTitle()
      refreshStatus()
    } catch {}
  } catch {}
}

// 切换便签编辑/阅读模式
async function toggleStickyEditMode(btn: HTMLButtonElement) {
  const isCurrentlyEditing = mode === 'edit'
  if (isCurrentlyEditing) {
    // 切换到阅读模式
    mode = 'preview'
    try { await renderPreview() } catch {}
    try { preview.classList.remove('hidden') } catch {}
  } else {
    // 切换到源码模式
    mode = 'edit'
    try { preview.classList.add('hidden') } catch {}
    try { editor.focus() } catch {}
  }
  try { syncToggleButton() } catch {}
  // 更新按钮状态
  const newIsEditing = mode === 'edit'
  btn.innerHTML = getStickyEditIcon(newIsEditing)
  btn.classList.toggle('active', newIsEditing)
  btn.title = newIsEditing ? '切换到阅读模式' : '切换到源码模式'
  try { notifyModeChange() } catch {}
}

// 切换窗口拖动锁定
function toggleStickyWindowLock(btn: HTMLButtonElement) {
  stickyNoteLocked = !stickyNoteLocked
  btn.innerHTML = getStickyLockIcon(stickyNoteLocked)
  btn.classList.toggle('active', stickyNoteLocked)
  btn.title = stickyNoteLocked ? '解除锁定' : '锁定窗口位置'

  // 禁用所有拖动区域（同时处理属性和 CSS）
  const dragRegions = document.querySelectorAll('.custom-titlebar-drag, .titlebar, [data-tauri-drag-region]')
  dragRegions.forEach((el) => {
    const htmlEl = el as HTMLElement
    if (stickyNoteLocked) {
      // 锁定：禁用拖动
      el.removeAttribute('data-tauri-drag-region')
      htmlEl.style.setProperty('-webkit-app-region', 'no-drag', 'important')
      htmlEl.style.setProperty('app-region', 'no-drag', 'important')
      htmlEl.style.cursor = 'default'
      htmlEl.classList.add('sticky-drag-locked')
    } else {
      // 解锁：恢复拖动
      if (el.classList.contains('custom-titlebar-drag')) {
        el.setAttribute('data-tauri-drag-region', '')
      }
      htmlEl.style.removeProperty('-webkit-app-region')
      htmlEl.style.removeProperty('app-region')
      htmlEl.style.cursor = 'move'
      htmlEl.classList.remove('sticky-drag-locked')
    }
  })
}

// 切换窗口置顶
async function toggleStickyWindowOnTop(btn: HTMLButtonElement) {
  stickyNoteOnTop = !stickyNoteOnTop
  btn.innerHTML = getStickyTopIcon(stickyNoteOnTop)
  btn.classList.toggle('active', stickyNoteOnTop)
  btn.title = stickyNoteOnTop ? '取消置顶' : '窗口置顶'

  try {
    const win = getCurrentWindow()
    await win.setAlwaysOnTop(stickyNoteOnTop)
  } catch (e) {
    console.error('[便签模式] 设置置顶失败:', e)
  }
}

const stickyNotePrefsDeps: StickyNotePrefsDeps = {
  appLocalDataDir,
  readTextFileAnySafe,
  writeTextFileAnySafe,
  getStore: () => store,
}

// 读取便签模式配置（颜色和透明度），带 Store 兼容回退
async function loadStickyNotePrefs(): Promise<StickyNotePrefs> {
  const { prefs, reminders } = await loadStickyNotePrefsCore(stickyNotePrefsDeps)
  stickyNoteReminders = reminders
  return { ...prefs, reminders }
}

// 保存便签模式配置到本地文件，并可选写回 Store（兼容旧版本）
async function saveStickyNotePrefs(prefs: StickyNotePrefs, skipStore = false): Promise<void> {
  const reminders = prefs.reminders ?? stickyNoteReminders
  if (reminders && typeof reminders === 'object') {
    stickyNoteReminders = reminders
  }
  await saveStickyNotePrefsCore(stickyNotePrefsDeps, prefs, stickyNoteReminders, skipStore)
}

// 切换透明度滑块显示
function toggleStickyOpacitySlider(btn: HTMLButtonElement) {
  const existing = document.getElementById('sticky-opacity-slider-container')
  if (existing) {
    existing.remove()
    btn.classList.remove('active')
    return
  }

  const container = document.createElement('div')
  container.id = 'sticky-opacity-slider-container'
  container.className = 'sticky-opacity-slider-container'

  const label = document.createElement('div')
  label.className = 'sticky-opacity-label'
  const initialPercent = Math.round((1 - stickyNoteOpacity) * 100)
  label.textContent = `透明度: ${initialPercent}%`

  const slider = document.createElement('input')
  slider.type = 'range'
  slider.className = 'sticky-opacity-slider'
  slider.min = '0'
  slider.max = '100'
  slider.value = String(initialPercent)

  slider.addEventListener('input', async (e) => {
    const value = parseInt((e.target as HTMLInputElement).value)
    label.textContent = `透明度: ${value}%`
    await setStickyNoteOpacity(1 - value / 100)
  })

  container.appendChild(label)
  container.appendChild(slider)

  // 阻止面板内部点击事件冒泡到document
  container.addEventListener('click', (e) => {
    e.stopPropagation()
  })

  // 点击外部区域时关闭面板
  const closePanel = (e: MouseEvent) => {
    if (!container.contains(e.target as Node) && e.target !== btn) {
      container.remove()
      btn.classList.remove('active')
      document.removeEventListener('click', closePanel)
    }
  }

  // 延迟添加监听器,避免立即触发
  setTimeout(() => {
    document.addEventListener('click', closePanel)
  }, 0)

  document.body.appendChild(container)
  btn.classList.add('active')
}

// 设置透明度（通过 CSS 变量实现真正透明）
async function setStickyNoteOpacity(opacity: number) {
  stickyNoteOpacity = Math.max(0, Math.min(1, opacity))

  // 将颜色/透明度统一应用到 DOM
  applyStickyNoteAppearance(stickyNoteColor, stickyNoteOpacity)

  // 持久化到本地配置文件（并兼容旧版 Store）
  await saveStickyNotePrefs({ opacity: stickyNoteOpacity, color: stickyNoteColor })
}

// 设置便签背景色（含持久化）
async function setStickyNoteColor(color: StickyNoteColor) {
  stickyNoteColor = color
  applyStickyNoteAppearance(stickyNoteColor, stickyNoteOpacity)
  await saveStickyNotePrefs({ opacity: stickyNoteOpacity, color: stickyNoteColor })
}

// 切换颜色选择面板
function toggleStickyColorPicker(btn: HTMLButtonElement) {
  const existing = document.getElementById('sticky-color-picker-container')
  if (existing) {
    existing.remove()
    btn.classList.remove('active')
    return
  }

  const container = document.createElement('div')
  container.id = 'sticky-color-picker-container'
  container.className = 'sticky-color-picker-container'

  const colors: Array<{ key: StickyNoteColor; title: string }> = [
    { key: 'white', title: '白色背景' },
    { key: 'gray', title: '灰色背景' },
    { key: 'black', title: '黑色背景' },
    { key: 'yellow', title: '便签黄' },
    { key: 'pink', title: '粉色' },
    { key: 'blue', title: '蓝色' },
    { key: 'green', title: '绿色' },
    { key: 'orange', title: '橙色' },
    { key: 'purple', title: '紫色' },
    { key: 'red', title: '红色' }
  ]

  colors.forEach(({ key, title }) => {
    const swatch = document.createElement('button')
    swatch.type = 'button'
    swatch.className = `sticky-color-swatch sticky-color-${key}` + (key === stickyNoteColor ? ' active' : '')
    swatch.title = title
    swatch.addEventListener('click', (e) => {
      e.stopPropagation()
      const all = container.querySelectorAll('.sticky-color-swatch')
      all.forEach((el) => el.classList.remove('active'))
      swatch.classList.add('active')
      void setStickyNoteColor(key)
    })
    container.appendChild(swatch)
  })

  // 阻止面板内部点击事件冒泡到document
  container.addEventListener('click', (e) => {
    e.stopPropagation()
  })

  // 点击外部区域时关闭面板
  const closePanel = (e: MouseEvent) => {
    if (!container.contains(e.target as Node) && e.target !== btn) {
      container.remove()
      btn.classList.remove('active')
      document.removeEventListener('click', closePanel)
    }
  }

  // 延迟添加监听器,避免立即触发
  setTimeout(() => {
    document.addEventListener('click', closePanel)
  }, 0)

  document.body.appendChild(container)

  // 动态计算面板位置，确保不超出窗口边界
  const btnRect = btn.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  // 默认在按钮下方居中显示
  let top = btnRect.bottom + 8
  let left = btnRect.left + btnRect.width / 2 - containerRect.width / 2

  // 边界检测：如果面板超出右边界，调整到左对齐
  if (left + containerRect.width > windowWidth - 10) {
    left = windowWidth - containerRect.width - 10
  }

  // 边界检测：如果面板超出左边界，调整到右对齐
  if (left < 10) {
    left = 10
  }

  // 边界检测：如果面板超出底部，显示在按钮上方
  if (top + containerRect.height > windowHeight - 10) {
    top = btnRect.top - containerRect.height - 8
  }

  // 边界检测：如果面板超出顶部，强制显示在按钮下方
  if (top < 10) {
    top = btnRect.bottom + 8
  }

  container.style.top = `${top}px`
  container.style.left = `${left}px`
  container.style.right = 'auto'
  btn.classList.add('active')
}

// 便签模式：为待办项添加推送和提醒按钮
function addStickyTodoButtons() {
  try {
    // 获取预览区所有待办项
    const taskItems = preview.querySelectorAll('li.task-list-item') as NodeListOf<HTMLLIElement>
    if (!taskItems || taskItems.length === 0) return
    const fileKey = currentFilePath || ''

    taskItems.forEach((item, index) => {
      // 避免重复添加按钮
      if (item.querySelector('.sticky-todo-actions')) return

      // 获取复选框
      const checkbox = item.querySelector('input.task-list-item-checkbox') as HTMLInputElement | null

      // 获取原始完整文本（包含时间）
      const fullText = item.textContent?.trim() || ''

      // 提取时间信息
      const timePattern = /@\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(:\d{2})?/
      const timeMatch = fullText.match(timePattern)
      const datetimeText = timeMatch ? timeMatch[0] : ''

      // 移除时间后的文本
      const textWithoutTime = datetimeText ? fullText.replace(timePattern, '').trim() : fullText

      // 重构DOM结构
      try {
        // 清空item内容（保留复选框）
        const childNodes = Array.from(item.childNodes)
        childNodes.forEach(node => {
          if (node !== checkbox) {
            node.remove()
          }
        })

        // 创建内容容器
        const contentDiv = document.createElement('span')
        contentDiv.className = 'task-content'
        contentDiv.textContent = textWithoutTime
        item.appendChild(contentDiv)

        // 如果有时间，添加时间图标
        if (datetimeText) {
          const timeIcon = document.createElement('span')
          timeIcon.className = 'task-time-icon'
          timeIcon.innerHTML = '<i class="fa-regular fa-clock" aria-hidden="true"></i>'
          item.appendChild(timeIcon)
        }
      } catch (e) {
        console.error('[便签模式] 重构DOM失败:', e)
      }

      // 创建按钮容器
      const actionsDiv = document.createElement('span')
      actionsDiv.className = 'sticky-todo-actions'

      // 推送按钮
      const pushBtn = document.createElement('button')
      pushBtn.className = 'sticky-todo-btn sticky-todo-push-btn'
      pushBtn.title = '推送到 xxtui'
      pushBtn.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i>'
      pushBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        await handleStickyTodoPush(fullText, index)
      })

      // 创建提醒按钮
      const reminderBtn = document.createElement('button')
      reminderBtn.className = 'sticky-todo-btn sticky-todo-reminder-btn'
      // 若已有持久化提醒标记，则使用“已创建”状态
      const hasReminder = !!(fileKey && stickyNoteReminders[fileKey] && stickyNoteReminders[fileKey][fullText])
      if (hasReminder) {
        reminderBtn.title = '已创建提醒'
        reminderBtn.innerHTML = '<i class="fa-solid fa-bell" aria-hidden="true"></i>'
        reminderBtn.classList.add('sticky-todo-reminder-created')
      } else {
        reminderBtn.title = '创建提醒 (@时间)'
        reminderBtn.innerHTML = '<i class="fa-regular fa-bell" aria-hidden="true"></i>'
      }
      reminderBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        await handleStickyTodoReminder(fullText, index, reminderBtn)
      })

      actionsDiv.appendChild(pushBtn)
      actionsDiv.appendChild(reminderBtn)
      item.appendChild(actionsDiv)

      // 创建tooltip显示完整内容
      try {
        const tooltip = document.createElement('div')
        tooltip.className = 'task-tooltip'

        // 如果有时间，显示"内容 + 时间"，否则只显示内容
        if (datetimeText) {
          tooltip.textContent = `${textWithoutTime} ${datetimeText}`
        } else {
          tooltip.textContent = textWithoutTime
        }

        item.appendChild(tooltip)
      } catch (e) {
        console.error('[便签模式] 创建tooltip失败:', e)
      }
    })
  } catch (e) {
    console.error('[便签模式] 添加待办按钮失败:', e)
  }
}

// 处理便签模式待办项推送
async function handleStickyTodoPush(todoText: string, index: number) {
  try {
    // 直接从 pluginAPIRegistry 获取 xxtui 插件 API
    const record = pluginAPIRegistry.get('xxtui-todo-push')
    if (!record || !record.api || !record.api.pushToXxtui) {
      alert('xxtui 插件未安装或未启用\n\n请在"插件"菜单中启用 xxtui 插件')
      return
    }

    const api = record.api

    // 调用推送 API
    const success = await api.pushToXxtui('[TODO]', todoText)
    if (success) {
      // 显示成功提示
      pluginNotice('推送成功', 'ok', 2000)
    } else {
      alert('推送失败，请检查 xxtui 配置\n\n请在"插件"菜单 → "待办" → "设置"中配置 API Key')
    }
  } catch (e) {
    console.error('[便签模式] 推送失败:', e)
    alert('推送失败: ' + (e instanceof Error ? e.message : String(e)))
  }
}

// 处理便签模式待办项创建提醒
async function handleStickyTodoReminder(todoText: string, index: number, btn?: HTMLButtonElement) {
  try {
    // 直接从 pluginAPIRegistry 获取 xxtui 插件 API
    const record = pluginAPIRegistry.get('xxtui-todo-push')
    if (!record || !record.api || !record.api.parseAndCreateReminders) {
      alert('xxtui 插件未安装或未启用\n\n请在"插件"菜单中启用 xxtui 插件')
      return
    }

    const api = record.api

    // 将单条待办文本包装成完整格式，以便插件解析
    const todoMarkdown = `- [ ] ${todoText}`
    const result = await api.parseAndCreateReminders(todoMarkdown)

      if (result.success > 0) {
        pluginNotice(`创建提醒成功: ${result.success} 条`, 'ok', 2000)
        // 本地标记：当前条目已创建提醒，仅影响本次预览会话
        try {
          if (btn) {
          btn.innerHTML = '<i class="fa-solid fa-bell" aria-hidden="true"></i>'
          btn.title = '已创建提醒'
          btn.classList.add('sticky-todo-reminder-created')
        }
        const fileKey = currentFilePath || ''
        if (fileKey) {
          if (!stickyNoteReminders[fileKey]) stickyNoteReminders[fileKey] = {}
          stickyNoteReminders[fileKey][todoText] = true
          await saveStickyNotePrefs({ opacity: stickyNoteOpacity, color: stickyNoteColor, reminders: stickyNoteReminders })
        }
      } catch {}
    } else if (!todoText.includes('@')) {
      alert('请在待办内容中添加 @时间 格式，例如：\n\n• 开会 @明天 下午3点\n• 写周报 @2025-11-21 09:00\n• 打电话 @2小时后')
    } else {
      alert('创建提醒失败，请检查时间格式')
    }
  } catch (e) {
    console.error('[便签模式] 创建提醒失败:', e)
    alert('创建提醒失败: ' + (e instanceof Error ? e.message : String(e)))
  }
}

// 便签模式：自动调整窗口高度以适应内容（只调高度，不修改宽度）
const STICKY_MIN_HEIGHT = 150
const STICKY_MAX_HEIGHT = 600
let _stickyAutoHeightTimer: number | null = null

async function adjustStickyWindowHeight() {
  if (!stickyNoteMode) return
  try {
    // 获取预览内容的实际高度
    const previewBody = preview.querySelector('.preview-body') as HTMLElement | null
    if (!previewBody) return

    // 计算内容高度 + 顶部控制栏高度 + 边距
    const contentHeight = previewBody.scrollHeight
    const controlsHeight = 50 // 顶部控制按钮区域
    const padding = 30 // 上下边距

    let targetHeight = contentHeight + controlsHeight + padding
    // 限制在最小/最大范围内
    targetHeight = Math.max(STICKY_MIN_HEIGHT, Math.min(STICKY_MAX_HEIGHT, targetHeight))

    const win = getCurrentWindow()
    const currentSize = await win.innerSize()

    // 仅当高度变化超过 10px 时才调整，避免频繁抖动
    if (Math.abs(currentSize.height - targetHeight) > 10) {
      const { LogicalSize } = await import('@tauri-apps/api/dpi')
      // 只调整高度，保持当前宽度不变，避免把窗口往右撑出去
      await win.setSize(new LogicalSize(currentSize.width, targetHeight))
    }
  } catch (e) {
    console.error('[便签模式] 调整窗口高度失败:', e)
  }
}

// 节流版本的高度调整
function scheduleAdjustStickyHeight() {
  if (!stickyNoteMode) return
  if (_stickyAutoHeightTimer) {
    clearTimeout(_stickyAutoHeightTimer)
  }
  _stickyAutoHeightTimer = window.setTimeout(() => {
    _stickyAutoHeightTimer = null
    void adjustStickyWindowHeight()
  }, 100)
}

// 创建便签控制按钮（编辑 + 锁定 + 置顶）
function createStickyNoteControls() {
  const existing = document.getElementById('sticky-note-controls')
  if (existing) existing.remove()

  const container = document.createElement('div')
  container.id = 'sticky-note-controls'
  container.className = 'sticky-note-controls'

  // 编辑按钮（笔图标，切换编辑/阅读模式）
  const editBtn = document.createElement('button')
  editBtn.className = 'sticky-note-btn sticky-note-edit-btn'
  editBtn.title = '切换到源码模式'
  editBtn.innerHTML = getStickyEditIcon(false)
  editBtn.addEventListener('click', async () => await toggleStickyEditMode(editBtn))

  // 图钉按钮（锁定位置）
  const lockBtn = document.createElement('button')
  lockBtn.className = 'sticky-note-btn sticky-note-lock-btn'
  lockBtn.title = '锁定窗口位置'
  lockBtn.innerHTML = getStickyLockIcon(false)
  lockBtn.addEventListener('click', () => toggleStickyWindowLock(lockBtn))

  // 置顶按钮
  const topBtn = document.createElement('button')
  topBtn.className = 'sticky-note-btn sticky-note-top-btn'
  topBtn.title = '窗口置顶'
  topBtn.innerHTML = getStickyTopIcon(false)
  topBtn.addEventListener('click', async () => await toggleStickyWindowOnTop(topBtn))

  // 透明度按钮
  const opacityBtn = document.createElement('button')
  opacityBtn.className = 'sticky-note-btn sticky-note-opacity-btn'
  opacityBtn.title = '调整透明度'
  opacityBtn.innerHTML = getStickyOpacityIcon()
  opacityBtn.addEventListener('click', () => toggleStickyOpacitySlider(opacityBtn))

   // 颜色按钮
  const colorBtn = document.createElement('button')
  colorBtn.className = 'sticky-note-btn sticky-note-color-btn'
  colorBtn.title = '切换背景颜色'
  colorBtn.innerHTML = getStickyColorIcon()
  colorBtn.addEventListener('click', () => toggleStickyColorPicker(colorBtn))

  // 待办按钮：在文末插入一行 "- [ ] "
  const todoBtn = document.createElement('button')
  todoBtn.className = 'sticky-note-btn'
  todoBtn.title = '添加待办'
  todoBtn.textContent = '+'
  todoBtn.addEventListener('click', async () => { await addStickyTodoLine(editBtn) })

  container.appendChild(editBtn)
  container.appendChild(lockBtn)
  container.appendChild(topBtn)
  container.appendChild(opacityBtn)
  container.appendChild(colorBtn)
  container.appendChild(todoBtn)
  document.body.appendChild(container)
}

// 便签模式运行时依赖：由 stickyNote.ts 统一驱动模式切换与窗口行为
const stickyNoteModeDeps: StickyNoteModeDeps = {
  loadPrefs: () => loadStickyNotePrefs(),
  getStore: () => store,
  getMode: () => mode,
  setMode: (m) => { mode = m },
  isWysiwygActive: () => !!wysiwyg || !!wysiwygV2Active,
  disableWysiwyg: () => setWysiwygEnabled(false),
  renderPreview: () => renderPreview(),
  showPreviewPanel: (show) => {
    try {
      preview.classList.toggle('hidden', !show)
    } catch {}
  },
  syncToggleButton: () => {
    try { syncToggleButton() } catch {}
  },
  openFile: (filePath) => openFile2(filePath),
  toggleFocusMode: (enable) => toggleFocusMode(enable),
  showLibrary: (show, focus) => showLibrary(show, focus),
  createControls: () => createStickyNoteControls(),
  forceLightTheme: () => {
    try { document.body.classList.remove('dark-mode') } catch {}
  },
  addBodyStickyClass: () => {
    try { document.body.classList.add('sticky-note-mode') } catch {}
  },
  applyAppearance: (color, opacity) => applyStickyNoteAppearance(color, opacity),
  scheduleAdjustHeight: () => { scheduleAdjustStickyHeight() },
  getCurrentWindow: () => getCurrentWindow(),
  currentMonitor: () => currentMonitor(),
  importDpi: () => import('@tauri-apps/api/dpi'),
  getScreenSize: () => {
    try {
      const screenW = window?.screen?.availWidth || window?.screen?.width
      const screenH = window?.screen?.availHeight || window?.screen?.height
      if (!screenW || !screenH) return null
      return { width: screenW, height: screenH }
    } catch {
      return null
    }
  },
  logError: (scope, e) => {
    console.error('[便签模式] ' + scope + ':', e)
  },
}

// 进入便签模式
async function enterStickyNoteMode(filePath: string) {
  stickyNoteMode = true
  try {
    const result: StickyNoteModeResult = await enterStickyNoteModeCore(stickyNoteModeDeps, filePath)
    stickyNoteOpacity = result.opacity
    stickyNoteColor = result.color
  } catch (e) {
    console.error('[便签模式] 进入便签模式失败:', e)
  }
}

// ========== 便签模式结束 ==========

// 恢复便签前的窗口大小和位置（供下次正常启动或关闭便签窗口时使用）
async function restoreWindowStateBeforeSticky(): Promise<void> {
  const deps: StickyNoteWindowDeps = {
    getStore: () => store,
    getCurrentWindow,
    importDpi: () => import('@tauri-apps/api/dpi'),
  }
  await restoreWindowStateBeforeStickyCore(deps)
}

// 退出便签模式时恢复全局状态标志（供关闭后新实例正确启动）
function resetStickyModeFlags(): void {
  try {
    stickyNoteMode = false
    stickyNoteLocked = false
    stickyNoteOnTop = false
    stickyTodoAutoPreview = false
    document.body.classList.remove('sticky-note-mode')
    try { document.documentElement.style.removeProperty('--sticky-opacity') } catch {}
  } catch {}
}

// 兜底：如果检测到窗口尺寸异常偏小，则恢复到 960x640
async function ensureMinWindowSize(): Promise<void> {
  try {
    const win = getCurrentWindow()
    const size = await win.innerSize()
    const minW = 960
    const minH = 640
    if (size.width < minW || size.height < minH) {
      const { LogicalSize } = await import('@tauri-apps/api/dpi')
      await win.setSize(new LogicalSize(minW, minH))
    }
  } catch {}
}

// 兜底：启动时将窗口居中显示
async function centerWindow(): Promise<void> {
  try {
    const win = getCurrentWindow()
    const size = await win.innerSize()
    const screenW = window?.screen?.availWidth || window?.screen?.width || 0
    const screenH = window?.screen?.availHeight || window?.screen?.height || 0
    if (!screenW || !screenH) return
    const x = Math.max(0, Math.round((screenW - size.width) / 2))
    const y = Math.max(0, Math.round((screenH - size.height) / 2))
    const { LogicalPosition } = await import('@tauri-apps/api/dpi')
    await win.setPosition(new LogicalPosition(x, y))
  } catch {}
}

// 兜底：强制退出专注模式，恢复原生标题栏（等价于“手动切换一次专注模式再切回来”的效果）
async function resetFocusModeDecorations(): Promise<void> {
  try {
    focusMode = false
    document.body.classList.remove('focus-mode')
    try { removeCustomTitleBar() } catch {}
    try {
      await applyWindowDecorationsCore(getCurrentWindow, focusMode, compactTitlebar)
      try { syncCustomTitlebarPlacement() } catch {}
    } catch {}
  } catch {}
}

async function pickLibraryRoot(): Promise<string | null> {
  try {
    const sel = await open({ directory: true, multiple: false } as any)
    if (!sel) return null
    const p = normalizePath(sel)
    if (!p) return null
    await setLibraryRoot(p)
    return p
  } catch (e) {
    showError('选择库目录失败', e)
    return null
  }
}

// 通用重命名帮助函数：弹出对话框并在文件树/当前文档中同步路径
async function renamePathWithDialog(path: string): Promise<string | null> {
  try {
    const base = path.replace(/[\\/][^\\/]*$/, '')
    const oldFull = path.split(/[\\/]+/).pop() || ''
    const m = oldFull.match(/^(.*?)(\.[^.]+)?$/)
    const oldStem = (m?.[1] || oldFull)
    const oldExt = (m?.[2] || '')
    const newStem = await openRenameDialog(oldStem, oldExt)
    if (!newStem || newStem === oldStem) return null
    const name = newStem + oldExt
    const dst = base + (base.includes('\\') ? '\\' : '/') + name
    if (await exists(dst)) {
      alert('同名已存在')
      return null
    }
    await moveFileSafe(path, dst)
    if (currentFilePath === path) {
      currentFilePath = dst as any
      refreshTitle()
    }
    const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
    if (treeEl && !fileTreeReady) {
      await fileTree.init(treeEl, {
        getRoot: getLibraryRoot,
        onOpenFile: async (p: string) => { await openFile2(p) },
        onOpenNewFile: async (p: string) => {
          await openFile2(p)
          mode = 'edit'
          preview.classList.add('hidden')
          try { (editor as HTMLTextAreaElement).focus() } catch {}
        },
        onMoved: async (src: string, dst2: string) => {
          try {
            if (currentFilePath === src) {
              currentFilePath = dst2 as any
              refreshTitle()
            }
          } catch {}
        }
      })
      fileTreeReady = true
    } else if (treeEl) {
      await fileTree.refresh()
    }
    try {
      const nodes = Array.from(((document.getElementById('lib-tree') || document.body).querySelectorAll('.lib-node') as any)) as HTMLElement[]
      const node = nodes.find(n => (n as any).dataset?.path === dst)
      if (node) node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    } catch {}
    return dst
  } catch (e) {
    showError('重命名失败', e)
    return null
  }
}

// 安全删除：优先直接删除；若为目录或遇到占用异常，尝试递归删除目录内容后再删
async function deleteFileSafe(p: string, permanent = false): Promise<void> {
  console.log('[deleteFileSafe] 开始删除:', { path: p, permanent })

  // 第一步：尝试移至回收站（如果不是永久删除）
  if (!permanent && typeof invoke === 'function') {
    try {
      console.log('[deleteFileSafe] 调用 move_to_trash')
      await invoke('move_to_trash', { path: p })
      // 验证删除是否成功
      const stillExists = await exists(p)
      console.log('[deleteFileSafe] 回收站删除后检查文件是否存在:', stillExists)
      if (!stillExists) {
        console.log('[deleteFileSafe] 文件已成功移至回收站')
        return
      }
      console.warn('[deleteFileSafe] 文件移至回收站后仍然存在，尝试永久删除')
    } catch (e) {
      console.warn('[deleteFileSafe] 移至回收站失败，尝试永久删除:', e)
    }
  }

  // 第二步：永久删除（带重试机制）
  const maxRetries = 3
  let lastError: any = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 尝试直接删除
      await remove(p)

      // 验证删除是否成功
      const stillExists = await exists(p)
      if (!stillExists) return

      // 文件仍存在，可能需要递归删除目录
      const st: any = await stat(p)
      if (st?.isDirectory) {
        // 递归删除目录中的所有子项
        const ents = (await readDir(p, { recursive: false } as any)) as any[]
        for (const it of ents) {
          const child = typeof it?.path === 'string' ? it.path : (p + (p.includes('\\') ? '\\' : '/') + (it?.name || ''))
          await deleteFileSafe(child, true) // 递归时直接永久删除
        }
        // 删除空目录
        await remove(p)
      } else if (typeof invoke === 'function') {
        // 文件删除失败，尝试后端强制删除
        await invoke('force_remove_path', { path: p })
      }

      // 最终验证
      const finalCheck = await exists(p)
      if (!finalCheck) return

      throw new Error('文件仍然存在（可能被其他程序占用）')
    } catch (e) {
      lastError = e
      // 如果还有重试机会，等待后重试
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
        continue
      }
      // 最后一次尝试也失败了
      throw e
    }
  }

  throw lastError ?? new Error('删除失败')
}
async function newFileSafe(dir: string, name = '新建文档.md'): Promise<string> {
  const sep = dir.includes('\\') ? '\\' : '/'
  let n = name, i = 1
  while (await exists(dir + sep + n)) {
    const m = name.match(/^(.*?)(\.[^.]+)$/); const stem = m ? m[1] : name; const ext = m ? m[2] : ''
    n = `${stem} ${++i}${ext}`
  }
  const full = dir + sep + n
  await ensureDir(dir)
  await writeTextFile(full, '# 标题\n\n', {} as any)
  return full
}
async function newFolderSafe(dir: string, name = '新建文件夹'): Promise<string> {
  const sep = dir.includes('\\') ? '\\' : '/'
  let n = name, i = 1
  while (await exists(dir + sep + n)) {
    n = `${name} ${++i}`
  }
  const full = dir + sep + n
  await mkdir(full, { recursive: true } as any)
  // 创建一个占位文件，使文件夹在库侧栏中可见
  const placeholder = full + sep + 'README.md'
  await writeTextFile(placeholder, '# ' + n + '\n\n', {} as any)
  return full
}async function renderDir(container: HTMLDivElement, dir: string) {
  container.innerHTML = ''
  const entries = await listDirOnce(dir)
  for (const e of entries) {
    if (e.isDir) {
      const row = document.createElement('div')
      row.className = 'lib-node lib-dir'
      row.innerHTML = `<svg class="lib-tg" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg><svg class="lib-ico lib-ico-folder" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a 2 2 0 0 1 2-2h4l2 2h8a 2 2 0 0 1 2 2v7a 2 2 0 0 1-2 2H5a 2 2 0 0 1-2-2V7z"/></svg><span class="lib-name">${e.name}</span>`
      ;(row as any).dataset.path = e.path
      const kids = document.createElement('div')
      kids.className = 'lib-children'
      kids.style.display = 'none'
      container.appendChild(row)
      row.addEventListener('dragover', (ev) => {
        ev.preventDefault()
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
        row.classList.add('selected')
      })
      row.addEventListener('dragleave', () => { row.classList.remove('selected') })
      row.addEventListener('drop', async (ev) => { try { ev.preventDefault(); row.classList.remove('selected'); const src = ev.dataTransfer?.getData('text/plain') || ''; if (!src) return; const base = e.path; const sep = base.includes('\\\\') ? '\\\\' : '/'; const dst = base + sep + (src.split(/[\\\\/]+/).pop() || ''); if (src === dst) return; const root = await getLibraryRoot(); if (!root || !isInside(root, src) || !isInside(root, dst)) { alert('仅允许在库目录内移动'); return } if (await exists(dst)) { const ok = await ask('目标已存在，是否覆盖？'); if (!ok) return } await moveFileSafe(src, dst); if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null; if (treeEl && !fileTreeReady) { await fileTree.init(treeEl, { getRoot: getLibraryRoot, onOpenFile: async (p: string) => { await openFile2(p) }, onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} } }); fileTreeReady = true } else if (treeEl) { await fileTree.refresh() } } catch (e) { showError('移动失败', e) } })
      container.appendChild(kids)
      let expanded = false
      row.addEventListener('click', async () => {
         selectLibraryNode(row, e.path, true)
        expanded = !expanded
        kids.style.display = expanded ? '' : 'none'
        row.classList.toggle('expanded', expanded)
        if (expanded && kids.childElementCount === 0) {
          await renderDir(kids as HTMLDivElement, e.path)
        }
      })
    } else {
      const row = document.createElement('div')
      const ext = (e.name.split('.').pop() || '').toLowerCase()
      row.className = 'lib-node lib-file file-ext-' + ext
      row.innerHTML = `<img class="lib-ico lib-ico-app" src="${appIconUrl}" alt=""/><span class="lib-name">${e.name}</span>`
       row.setAttribute('draggable','true')
       row.addEventListener('dragstart', (ev) => { try { ev.dataTransfer?.setData('text/plain', e.path) } catch {} })
      row.title = e.path
       ;(row as any).dataset.path = e.path
       row.setAttribute('draggable','true')
       row.addEventListener('dragstart', (ev) => { try { ev.dataTransfer?.setData('text/plain', e.path); if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move' } catch {} })
      row.addEventListener('click', async () => {
        selectLibraryNode(row, e.path, false)
        await openFile2(e.path)
      })
      container.appendChild(row)
    }
  }
}

function showAbout(show: boolean) {
  const overlay = document.getElementById('about-overlay') as HTMLDivElement | null
  if (!overlay) return
  if (show) showSheet(overlay)
  else hideSheet(overlay)
}

// 顶级菜单下拉（参考库右键菜单的样式实现，纯 JS 内联样式，避免全局 CSS 入侵）
type TopMenuItemSpec = { label: string; accel?: string; action: () => void; disabled?: boolean }
// 顶部下拉菜单：全局文档级点击处理器引用，避免重复绑定与交叉干扰
let _topMenuDocHandler: ((ev: MouseEvent) => void) | null = null
function showTopMenu(anchor: HTMLElement, items: TopMenuItemSpec[]) {
  try {
    let menu = document.getElementById('top-ctx') as HTMLDivElement | null
    if (!menu) {
      menu = document.createElement('div') as HTMLDivElement
      menu.id = 'top-ctx'
      menu.style.position = 'absolute'
      menu.style.zIndex = '9999'
      menu.style.background = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#fff'
      menu.style.color = getComputedStyle(document.documentElement).getPropertyValue('--fg') || '#111'
      menu.style.border = '1px solid ' + (getComputedStyle(document.documentElement).getPropertyValue('--border') || '#e5e7eb')
      menu.style.borderRadius = '8px'
      menu.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
      menu.style.minWidth = '200px'
      menu.style.padding = '6px 0'
      menu.addEventListener('click', (e) => e.stopPropagation())
      document.body.appendChild(menu)
    }
    // 切换菜单前移除上一次绑定的文档级点击处理器，防止“打开新菜单时被上一次处理器立刻关闭”
    if (_topMenuDocHandler) {
      try { document.removeEventListener('click', _topMenuDocHandler) } catch {}
      _topMenuDocHandler = null
    }

    const hide = () => {
      if (menu) menu.style.display = 'none'
      if (_topMenuDocHandler) {
        try { document.removeEventListener('click', _topMenuDocHandler) } catch {}
        _topMenuDocHandler = null
      }
    }
    const onDoc = () => hide()
    _topMenuDocHandler = onDoc
    menu.innerHTML = ''
    const mkRow = (spec: TopMenuItemSpec) => {
      const row = document.createElement('div') as HTMLDivElement
      row.style.display = 'flex'
      row.style.alignItems = 'center'
      row.style.justifyContent = 'space-between'
      row.style.gap = '16px'
      row.style.padding = '6px 12px'
      row.style.cursor = spec.disabled ? 'not-allowed' : 'pointer'
      const l = document.createElement('span')
      l.textContent = spec.label
      const r = document.createElement('span')
      r.textContent = spec.accel || ''
      r.style.opacity = '0.7'
      row.appendChild(l)
      row.appendChild(r)
      if (!spec.disabled) {
        row.addEventListener('mouseenter', () => row.style.background = 'rgba(127,127,127,0.12)')
        row.addEventListener('mouseleave', () => row.style.background = 'transparent')
        row.addEventListener('click', () => { try { spec.action() } finally { hide() } })
      } else {
        row.style.opacity = '0.5'
      }
      return row
    }
    for (const it of items) menu.appendChild(mkRow(it))

    // 定位：锚点左下
    const rc = anchor.getBoundingClientRect()
    const left = Math.max(0, Math.min(rc.left, window.innerWidth - (menu.offsetWidth || 220)))
    const top = Math.min(window.innerHeight - 10, rc.bottom)
    menu.style.left = left + 'px'
    menu.style.top = top + 'px'
    menu.style.display = 'block'
    // 推迟到当前点击事件冒泡结束后再绑定，以避免本次点击导致立刻关闭
    setTimeout(() => { if (_topMenuDocHandler) document.addEventListener('click', _topMenuDocHandler) }, 0)
  } catch {}
}

function showFileMenu() {
  const anchor = document.getElementById('btn-open') as HTMLDivElement | null
  if (!anchor) return
  const items: TopMenuItemSpec[] = [
    { label: t('file.new'), accel: 'Ctrl+N', action: () => { void newFile() } },
    { label: t('file.open'), accel: 'Ctrl+O', action: () => { void openFile2() } },
    // “最近文件”入口移入 文件 菜单
    { label: t('menu.recent'), accel: 'Ctrl+Shift+R', action: () => { void renderRecentPanel(true) } },
    { label: t('file.save'), accel: 'Ctrl+S', action: () => { void saveFile() } },
    { label: t('file.saveas'), accel: 'Ctrl+Shift+S', action: () => { void saveAs() } },
  ]
  showTopMenu(anchor, items)
}

function showModeMenu() {
  const anchor = document.getElementById('btn-mode') as HTMLDivElement | null
  if (!anchor) return
  showTopMenu(anchor, [
    { label: t('mode.edit'), accel: 'Ctrl+E', action: async () => {
      saveScrollPosition()
      if (wysiwyg) {
        try { await setWysiwygEnabled(false) } catch {}
        restoreScrollPosition()
        try { notifyModeChange() } catch {}
        return
      }
      if (mode !== 'edit') {
        mode = 'edit'
        try { preview.classList.add('hidden') } catch {}
        try { editor.focus() } catch {}
        try { syncToggleButton() } catch {}
        try { updateChromeColorsForMode('edit') } catch {}
        restoreScrollPosition()
        try { notifyModeChange() } catch {}
      }
    } },
    { label: t('mode.read'), accel: 'Ctrl+R', action: async () => {
      saveScrollPosition()
      const wasWysiwyg = wysiwyg
      if (wasWysiwyg) { try { await setWysiwygEnabled(false) } catch {} }
      mode = 'preview'
      try { preview.classList.remove('hidden') } catch {}
      try { await renderPreview() } catch {}
      try { syncToggleButton() } catch {}
      try { updateChromeColorsForMode('preview') } catch {}
      restoreScrollPosition()
      try { notifyModeChange() } catch {}
    } },
    { label: t('mode.wysiwyg'), accel: 'Ctrl+W', action: async () => {
      try { await setWysiwygEnabled(true) } catch {}
      try { notifyModeChange() } catch {}
    } },
  ])
}

function showLangMenu() {
  const anchor = document.getElementById('btn-lang') as HTMLDivElement | null
  if (!anchor) return
  const pref = getLocalePref()
  const items: TopMenuItemSpec[] = [
    { label: `${pref === 'auto' ? '✓ ' : ''}${t('lang.auto')}`, action: () => { setLocalePref('auto'); applyI18nUi() } },
    { label: `${pref === 'zh' ? '✓ ' : ''}${t('lang.zh')}`, action: () => { setLocalePref('zh'); applyI18nUi() } },
    { label: `${pref === 'en' ? '✓ ' : ''}${t('lang.en')}`, action: () => { setLocalePref('en'); applyI18nUi() } },
  ]
  showTopMenu(anchor, items)
}

// 刷新文件树并更新库名称显示
async function refreshLibraryUiAndTree(refreshTree = true) {
  // 更新库名称显示
  try {
    const elPath = document.getElementById('lib-path') as HTMLDivElement | null
    if (elPath) {
      const id = await getActiveLibraryId()
      if (id) {
        const libs = await getLibraries()
        const cur = libs.find(x => x.id === id)
        elPath.textContent = cur?.name || ''
      } else {
        elPath.textContent = ''
      }
    }
  } catch {}

  if (!refreshTree) return
  try {
    const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
    if (!treeEl) return

    if (!fileTreeReady) {
      await fileTree.init(treeEl, {
        getRoot: getLibraryRoot,
        onOpenFile: async (p: string) => { await openFile2(p) },
        onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} },
        onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} }
      })
      fileTreeReady = true
    }

    try {
      const s = await getLibrarySort()
      fileTree.setSort(s)
    } catch {}

    await fileTree.refresh()
  } catch {}
}

// 库选择菜单：列出已保存库、切换/新增/重命名/删除
async function showLibraryMenu() {
  const anchor = document.getElementById('lib-choose') as HTMLButtonElement | null
  if (!anchor) return
  try {
    const libs = await getLibraries()
    const activeId = await getActiveLibraryId()
    const items: TopMenuItemSpec[] = []
    for (const lib of libs) {
      const cur = lib.id === activeId
      const label = (cur ? "\u2714\uFE0E " : '') + lib.name
      items.push({
        label,
        action: async () => {
          try { await setActiveLibId(lib.id) } catch {}
          await refreshLibraryUiAndTree(true)
        }
      })
    }
    // 末尾操作项
    items.push({ label: '新增库…', action: async () => { const p = await pickLibraryRoot(); if (p) await refreshLibraryUiAndTree(true) } })
    items.push({ label: '重命名当前库…', action: async () => {
      const id = await getActiveLibraryId(); if (!id) return
      const libs2 = await getLibraries()
      const cur = libs2.find(x => x.id === id)
      const oldName = cur?.name || ''
      const name = await openRenameDialog(oldName, '')
      if (!name || name === oldName) return
      try { await renameLib(id, name) } catch {}
      await refreshLibraryUiAndTree(false)
    } })
    items.push({ label: '删除当前库', action: async () => {
      const id = await getActiveLibraryId(); if (!id) return
      const ok = await ask('确认删除当前库？')
      if (!ok) return
      try { await removeLib(id) } catch {}
      await refreshLibraryUiAndTree(true)
    } })
    showTopMenu(anchor, items)
  } catch {}
}

function applyI18nUi() {
  try {
    try { _settingsOverlayEl?.remove() } catch {}
    _settingsOverlayEl = null
    _settingsPluginListEl = null
    // 菜单
    const map: Array<[string, string]> = [
      ['btn-open', t('menu.file')],
      ['btn-mode', t('menu.mode')],
      ['btn-recent', t('menu.recent')],
      ['btn-uploader', t('menu.uploader')],
      ['btn-extensions', t('menu.extensions')],
      ['btn-library', t('lib.menu')],
      ['btn-update', t('menu.update')],
      ['btn-about', t('menu.about')],
      ['btn-save', t('file.save')],
      ['btn-saveas', t('file.saveas')],
      ['btn-toggle', t('mode.read')],
      ['btn-new', t('file.new')],
      ['btn-lang', t('menu.language')],
    ]
    const menuIcons: Record<string, string> = {
      'btn-open': 'fa-solid fa-folder-open',
      'btn-mode': 'fa-solid fa-layer-group',
      'btn-recent': 'fa-solid fa-clock-rotate-left',
      'btn-uploader': 'fa-solid fa-cloud-arrow-up',
      'btn-extensions': 'fa-solid fa-plug',
      'btn-library': 'fa-solid fa-rectangle-list',
      'btn-update': 'fa-solid fa-arrows-rotate',
      'btn-about': 'fa-solid fa-circle-info',
      'btn-save': 'fa-solid fa-floppy-disk',
      'btn-saveas': 'fa-solid fa-file-arrow-up',
      'btn-toggle': 'fa-solid fa-eye',
      'btn-new': 'fa-solid fa-file-circle-plus',
      'btn-lang': 'fa-solid fa-globe',
    }
    for (const [id, text] of map) {
      const el = document.getElementById(id) as HTMLElement | null
      if (el && text) {
        const icon = menuIcons[id]
        if (icon) setIconButton(el, icon, text)
        else { el.textContent = text; el.title = text }
      }
    }
    const mobileToggle = document.getElementById('mobile-lib-toggle') as HTMLButtonElement | null
    if (mobileToggle) setIconButton(mobileToggle, 'fa-solid fa-bars', t('lib.menu'))
    // 文件名/状态/编辑器占位
    try { (document.getElementById('editor') as HTMLTextAreaElement | null)?.setAttribute('placeholder', t('editor.placeholder')) } catch {}
    try { refreshTitle() } catch {}
    try { refreshStatus() } catch {}
    // 库页签/按钮
    try {
      const localeNow = getLocale()
      const filesLabel = localeNow === 'en' ? (t as any)('tab.files.short') ?? t('tab.files') : t('tab.files')
      const outlineLabel = localeNow === 'en' ? (t as any)('tab.outline.short') ?? t('tab.outline') : t('tab.outline')
      const chooseLabel = localeNow === 'en' ? (t as any)('lib.choose.short') ?? t('lib.choose') : t('lib.choose')
      const refreshLabel = localeNow === 'en' ? (t as any)('lib.refresh.short') ?? t('lib.refresh') : t('lib.refresh')
      const elF = document.getElementById('lib-tab-files') as HTMLButtonElement | null
      if (elF) setIconButton(elF, 'fa-solid fa-file-lines', String(filesLabel))
      const elO = document.getElementById('lib-tab-outline') as HTMLButtonElement | null
      if (elO) setIconButton(elO, 'fa-solid fa-list-ul', String(outlineLabel))
      const elC = document.getElementById('lib-choose') as HTMLButtonElement | null
      if (elC) setIconButton(elC, 'fa-solid fa-folder-tree', String(chooseLabel))
      const elR = document.getElementById('lib-refresh') as HTMLButtonElement | null
      if (elR) setIconButton(elR, 'fa-solid fa-rotate', String(refreshLabel))
      const elP = document.getElementById('lib-pin') as HTMLButtonElement | null
      if (elP) setIconButton(elP, 'fa-solid fa-thumbtack', libraryDocked ? t('lib.pin.auto') : t('lib.pin.fixed'))
      const elSettings = document.getElementById('lib-settings') as HTMLButtonElement | null
      if (elSettings) setIconButton(elSettings, 'fa-solid fa-gear', t('ext.settings'))
      const elToggle = document.getElementById('lib-toggle') as HTMLButtonElement | null
      if (elToggle) setIconButton(elToggle, librarySide === 'right' ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left', '收起侧栏')
      updateLibrarySideButton()
    } catch {}
    // 图床设置（若已创建）
    try {
      const uplRoot = document.getElementById('uploader-overlay') as HTMLDivElement | null
      if (uplRoot) {
        const titleEl = uplRoot.querySelector('#upl-title') as HTMLDivElement | null
        const descEl = uplRoot.querySelector('.upl-desc') as HTMLDivElement | null
        if (titleEl) titleEl.textContent = t('upl.title')
        if (descEl) descEl.textContent = t('upl.desc')
        const setLabel = (forId: string, txt: string) => {
          const lab = uplRoot.querySelector(`label[for="${forId}"]`) as HTMLLabelElement | null
          if (lab) lab.textContent = txt
        }
        setLabel('upl-enabled', t('upl.enable'))
        setLabel('upl-always-local', t('upl.alwaysLocal'))
        setLabel('upl-ak', t('upl.ak'))
        setLabel('upl-sk', t('upl.sk'))
        setLabel('upl-bucket', t('upl.bucket'))
        setLabel('upl-endpoint', t('upl.endpoint'))
        setLabel('upl-region', t('upl.region'))
        setLabel('upl-domain', t('upl.domain'))
        setLabel('upl-template', t('upl.template'))
        setLabel('upl-pathstyle', t('upl.pathstyle'))
        setLabel('upl-acl', t('upl.acl'))
        setLabel('upl-webp-enable', t('upl.webp.enable'))
        setLabel('upl-webp-quality', t('upl.webp.quality'))
        setLabel('upl-webp-local', t('upl.webp.local'))
        const setPh = (id: string, ph: string) => { const inp = uplRoot.querySelector(`#${id}`) as HTMLInputElement | null; if (inp) inp.placeholder = ph }
        setPh('upl-ak', t('upl.ak.ph'))
        setPh('upl-sk', t('upl.sk.ph'))
        setPh('upl-bucket', t('upl.bucket.ph'))
        setPh('upl-endpoint', t('upl.endpoint.ph'))
        setPh('upl-region', t('upl.region.ph'))
        setPh('upl-domain', t('upl.domain.ph'))
        setPh('upl-template', t('upl.template.ph'))
        const secs = uplRoot.querySelectorAll('.upl-section-title') as NodeListOf<HTMLDivElement>
        if (secs[0]) secs[0].textContent = t('upl.section.basic')
        if (secs[1]) secs[1].textContent = t('upl.section.access')
        if (secs[2]) secs[2].textContent = t('upl.section.advanced')
        const hints = uplRoot.querySelectorAll('.upl-hint') as NodeListOf<HTMLDivElement>
        if (hints[0]) hints[0].textContent = t('upl.hint.alwaysLocal')
        if (hints[1]) hints[1].textContent = t('upl.endpoint.hint')
        if (hints[2]) hints[2].textContent = t('upl.domain.hint')
        if (hints[3]) hints[3].textContent = t('upl.webp.quality.hint')
        if (hints[3]) hints[3].textContent = t('upl.template.hint')
      }
    } catch {}
    // 扩展管理（若已创建）：重绘或更新文本
    try {
      const extOverlay = document.getElementById('extensions-overlay') as HTMLDivElement | null
      if (extOverlay) {
        // 简单做法：刷新整块 UI 的静态文案
        const titleEl = extOverlay.querySelector('.ext-header div') as HTMLDivElement | null
        if (titleEl) titleEl.textContent = t('ext.title')
        const stTitles = extOverlay.querySelectorAll('.ext-subtitle') as NodeListOf<HTMLDivElement>
        if (stTitles[0]) stTitles[0].textContent = t('ext.install.section')
        // 第二/第三个小节标题在 refreshExtensionsUI 中按需重建
        const input = extOverlay.querySelector('#ext-install-input') as HTMLInputElement | null
        if (input) input.placeholder = t('ext.install.placeholder')
        const btnInstall = extOverlay.querySelector('#ext-install-btn') as HTMLButtonElement | null
        if (btnInstall) btnInstall.textContent = t('ext.install.btn')
        // 列表区域走 refresh 重建，确保按钮文本（设置/启用/禁用/移除/刷新）也同步
        void refreshExtensionsUI()
      }
    } catch {}
    // WebDAV 同步窗口（若已创建）：仅更新标题与按钮
    try {
      const syncOverlay = document.getElementById('sync-overlay') as HTMLDivElement | null
      if (syncOverlay) {
        const tEl = syncOverlay.querySelector('#sync-title') as HTMLDivElement | null
        if (tEl) tEl.textContent = t('sync.title')
        const closeEl = syncOverlay.querySelector('#sync-close') as HTMLButtonElement | null
        if (closeEl) closeEl.title = t('about.close')
        const openLog = syncOverlay.querySelector('#sync-openlog') as HTMLButtonElement | null
        if (openLog) openLog.textContent = t('sync.openlog')
        const saveBtn = syncOverlay.querySelector('#sync-save') as HTMLButtonElement | null
        if (saveBtn) saveBtn.textContent = t('sync.save')
      }
    } catch {}
    // 重命名对话框（若已创建）
    try {
      const renameOverlay = document.getElementById('rename-overlay') as HTMLDivElement | null
      if (renameOverlay) {
        const titleEl = renameOverlay.querySelector('#rename-title') as HTMLDivElement | null
        if (titleEl) titleEl.textContent = t('dlg.rename')
        const closeEl = renameOverlay.querySelector('#rename-close') as HTMLButtonElement | null
        if (closeEl) closeEl.title = t('about.close')
        const labels = renameOverlay.querySelectorAll('.link-field > span') as NodeListOf<HTMLSpanElement>
        if (labels[0]) labels[0].textContent = t('dlg.name')
        if (labels[1]) labels[1].textContent = t('dlg.ext')
        const nameInput = renameOverlay.querySelector('#rename-text') as HTMLInputElement | null
        if (nameInput) nameInput.placeholder = t('dlg.name.ph')
        const cancelBtn = renameOverlay.querySelector('#rename-cancel') as HTMLButtonElement | null
        if (cancelBtn) cancelBtn.textContent = t('dlg.cancel')
        const okBtn = renameOverlay.querySelector('#rename-ok') as HTMLButtonElement | null
        if (okBtn) okBtn.textContent = t('dlg.ok')
      }
    } catch {}
    // 插入链接对话框（若已创建）
    try {
      const linkOverlay = document.getElementById('link-overlay') as HTMLDivElement | null
      if (linkOverlay) {
        const titleEl = linkOverlay.querySelector('#link-title') as HTMLDivElement | null
        if (titleEl) titleEl.textContent = t('dlg.link')
        const closeEl = linkOverlay.querySelector('#link-close') as HTMLButtonElement | null
        if (closeEl) closeEl.title = t('about.close')
        const labels = linkOverlay.querySelectorAll('.link-field > span') as NodeListOf<HTMLSpanElement>
        if (labels[0]) labels[0].textContent = t('dlg.text')
        if (labels[1]) labels[1].textContent = t('dlg.url')
        const textInput = linkOverlay.querySelector('#link-text') as HTMLInputElement | null
        if (textInput) textInput.placeholder = t('dlg.link.text.ph')
        const urlInput = linkOverlay.querySelector('#link-url') as HTMLInputElement | null
        if (urlInput) urlInput.placeholder = t('dlg.url.ph')
        const testBtn = linkOverlay.querySelector('#link-test') as HTMLButtonElement | null
        if (testBtn) testBtn.textContent = t('dlg.test')
        const cancelBtn = linkOverlay.querySelector('#link-cancel') as HTMLButtonElement | null
        if (cancelBtn) cancelBtn.textContent = t('dlg.cancel')
        const insertBtn = linkOverlay.querySelector('#link-insert') as HTMLButtonElement | null
        if (insertBtn) insertBtn.textContent = t('dlg.insert')
      }
    } catch {}
  } catch {}
}

function bindEvents() {
  try { ensureEditorKeyHooksBound() } catch {}
// 全局：确保编辑器键盘钩子仅绑定一次（切换文档/重开窗也生效）
  function ensureEditorKeyHooksBound() {
    try {
      const w = window as any
      if (w._editorKeyHooksBound) return
      w._editorKeyHooksBound = true
      // 反引号序列状态（全局）
      w._btCount = 0
      w._btTimer = null
      w._btSelS = 0
      w._btSelE = 0

      const getEditor = (): HTMLTextAreaElement | null => document.getElementById('editor') as HTMLTextAreaElement | null
      const isEditMode = () => (typeof mode !== 'undefined' && mode === 'edit' && !wysiwyg)

      const pairs: Array<[string, string]> = [["(", ")"],["[", "]"],["{", "}"],["\"", "\""],["'", "'"],["*","*"],["_","_"],["（","）"],["【","】"],["《","》"],["「","」"],["『","』"],["“","”"],["‘","’"]]
      try { pairs.push([String.fromCharCode(96), String.fromCharCode(96)]) } catch {}
      const openClose = Object.fromEntries(pairs as any) as Record<string,string>
      try { pairs.push([String.fromCharCode(0x300A), String.fromCharCode(0x300B)]) } catch {}
      try { pairs.push([String.fromCharCode(0x3010), String.fromCharCode(0x3011)]) } catch {}
      try { pairs.push([String.fromCharCode(0xFF08), String.fromCharCode(0xFF09)]) } catch {}
      try { pairs.push([String.fromCharCode(0x300C), String.fromCharCode(0x300D)]) } catch {}
      try { pairs.push([String.fromCharCode(0x300E), String.fromCharCode(0x300F)]) } catch {}
      try { pairs.push([String.fromCharCode(0x201C), String.fromCharCode(0x201D)]) } catch {}
      try { pairs.push([String.fromCharCode(0x2018), String.fromCharCode(0x2019)]) } catch {}
      const closers = new Set(Object.values(openClose))

      function handleKeydown(e: KeyboardEvent) {
        const ta = getEditor(); if (!ta) return
        if (e.target !== ta) return
        if (!isEditMode()) return
        if (e.key === '*') return
        if (e.ctrlKey || e.metaKey || e.altKey) return
        const val = String(ta.value || '')
        const s = ta.selectionStart >>> 0
        const epos = ta.selectionEnd >>> 0

        // 反引号三连/双连/单：优先处理
        if (e.key === '`') {
          const w = window as any
          try { if (w._btTimer) { clearTimeout(w._btTimer); w._btTimer = null } } catch {}
          w._btCount = (w._btCount || 0) + 1
          if (w._btCount === 1) { w._btSelS = s; w._btSelE = epos }
          e.preventDefault()
          const commit = () => {
            const s0 = w._btSelS >>> 0, e0 = w._btSelE >>> 0
            const before = val.slice(0, s0); const mid = val.slice(s0, e0); const after = val.slice(e0)
            const hasNL = /\n/.test(mid)
            if (w._btCount >= 3 || hasNL) {
              const content = (e0 > s0 ? ('\n' + mid + '\n') : ('\n\n'))
              ta.value = before + '```' + content + '```' + after
              const caret = (e0 > s0) ? (s0 + content.length + 3) : (s0 + 4)
              ta.selectionStart = ta.selectionEnd = caret
            } else if (w._btCount === 2) {
              ta.value = before + '``' + (e0 > s0 ? mid : '') + '``' + after
              if (e0 > s0) { ta.selectionStart = s0 + 2; ta.selectionEnd = s0 + 2 + mid.length } else { ta.selectionStart = ta.selectionEnd = s0 + 2 }
            } else {
              ta.value = before + '`' + (e0 > s0 ? mid : '') + '`' + after
              if (e0 > s0) { ta.selectionStart = s0 + 1; ta.selectionEnd = s0 + 1 + mid.length } else { ta.selectionStart = ta.selectionEnd = s0 + 1 }
            }
            try { dirty = true; refreshTitle(); refreshStatus() } catch {}
            if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
            w._btCount = 0; w._btTimer = null
          }
          const w2 = window as any; w2._btTimer = (setTimeout as any)(commit, 280)
          return
        }

        // 跳过右侧
        if (closers.has(e.key) && s === epos && val[s] === e.key) { e.preventDefault(); ta.selectionStart = ta.selectionEnd = s + 1; return }

        // 通用成对/环绕（不含反引号）
        const close = (openClose as any)[e.key]; if (!close) return
        // 交给 imePatch 在 beforeinput 阶段处理，避免与此处重复
        e.preventDefault()
        if (s !== epos) {
          const before = val.slice(0, s); const mid = val.slice(s, epos); const after = val.slice(epos)
          ta.value = before + e.key + mid + close + after
          ta.selectionStart = s + 1; ta.selectionEnd = s + 1 + mid.length
        } else {
          const before = val.slice(0, s); const after = val.slice(epos)
          ta.value = before + e.key + close + after
          ta.selectionStart = ta.selectionEnd = s + 1
        }
        try { dirty = true; refreshTitle(); refreshStatus() } catch {}
        if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
      }

      function handleTabIndent(e: KeyboardEvent) {
        const ta = getEditor(); if (!ta) return
        if (e.target !== ta) return
        if (!isEditMode()) return
        if (e.key !== 'Tab' || e.ctrlKey || e.metaKey) return
        e.preventDefault()
        const val = String(ta.value || '')
        const start = ta.selectionStart >>> 0; const end = ta.selectionEnd >>> 0
        const isShift = !!e.shiftKey; const indent = "&emsp;&emsp;"
        const lineStart = val.lastIndexOf('\n', start - 1) + 1
        const sel = val.slice(lineStart, end)
        if (start === end) {
          if (isShift) {
            if (val.slice(lineStart).startsWith(indent)) {
              const nv = val.slice(0, lineStart) + val.slice(lineStart + indent.length)
              ta.value = nv
              const newPos = Math.max(lineStart, start - indent.length)
              ta.selectionStart = ta.selectionEnd = newPos
            }
          } else {
            if (!val.slice(lineStart).startsWith(indent)) {
              const nv = val.slice(0, lineStart) + indent + val.slice(lineStart)
              ta.value = nv
              const newPos = start + indent.length
              ta.selectionStart = ta.selectionEnd = newPos
            }
          }
        } else if (start !== end && sel.includes('\n')) {
          const lines = val.slice(lineStart, end).split('\n')
          const changed = lines.map((ln) => isShift ? (ln.startsWith(indent) ? ln.slice(indent.length) : (ln.startsWith(' \t') ? ln.slice(1) : (ln.startsWith('\t') ? ln.slice(1) : ln))) : ((ln.startsWith(indent) ? ln : (indent + ln)))).join('\n')
          const newVal = val.slice(0, lineStart) + changed + val.slice(end)
          const delta = changed.length - (end - lineStart)
          ta.value = newVal; ta.selectionStart = lineStart; ta.selectionEnd = end + delta
        } else {
          if (isShift) {
            const curLineStart = lineStart
            const cur = val.slice(curLineStart)
            if (cur.startsWith(indent, start - curLineStart)) { const nv = val.slice(0, start - indent.length) + val.slice(start); ta.value = nv; ta.selectionStart = ta.selectionEnd = start - indent.length }
            else if ((start - curLineStart) > 0 && val.slice(curLineStart, curLineStart + 1) === '\t') { const nv = val.slice(0, curLineStart) + val.slice(curLineStart + 1); ta.value = nv; const shift = (start > curLineStart) ? 1 : 0; ta.selectionStart = ta.selectionEnd = start - shift }
          } else {
            const nv = val.slice(0, start) + indent + val.slice(end); ta.value = nv; ta.selectionStart = ta.selectionEnd = start + indent.length
          }
        }
        try { dirty = true; refreshTitle(); refreshStatus() } catch {}
        if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
      }

      document.addEventListener('beforeinput', (e) => { try { const ev: any = e as any; if (ev?.isComposing || /Composition/i.test(String(ev?.inputType || ''))) return; handleBeforeInput(e as any) } catch {} }, true)
      document.addEventListener('input', (e) => { try { const ev: any = e as any; if (ev?.isComposing || /Composition/i.test(String(ev?.inputType || ''))) return; handleInput(e as any) } catch {} }, true)
      document.addEventListener('keydown', (e) => { try { handleKeydown(e) } catch {} }, true)
      document.addEventListener('keydown', (e) => { try { handleTabIndent(e) } catch {} }, true)
      document.addEventListener('keydown', (e) => {
        try {
          const ev = e as KeyboardEvent
          if (ev.key !== 'Tab' || ev.ctrlKey || ev.metaKey || !wysiwygV2Active) return
          const tgt = e.target as HTMLElement | null
          const rootEl = document.getElementById('md-wysiwyg-root')
          if (!rootEl || !tgt || !rootEl.contains(tgt)) return
          ev.preventDefault(); try { ev.stopPropagation() } catch {} ; try { (e as any).stopImmediatePropagation && (e as any).stopImmediatePropagation() } catch {}

          const em = '&emsp;&emsp;'
          const sel = window.getSelection()
          // 反缩进：Shift+Tab 删除光标前一组，或当前段落行首一组
          if (ev.shiftKey) {
            try {
              if (sel && sel.rangeCount > 0) {
                const r = sel.getRangeAt(0)
                // 删除紧邻光标前的实体
                if (r.startContainer && r.startContainer.nodeType === 3) {
                  const tn = r.startContainer as Text
                  const off = r.startOffset >>> 0
                  const need = em.length
                  if (off >= need && tn.data.slice(off - need, off) === em) {
                    tn.deleteData(off - need, need)
                    const rr = document.createRange(); rr.setStart(tn, off - need); rr.collapse(true)
                    sel.removeAllRanges(); sel.addRange(rr)
                    return
                  }
                }
                // 尝试删除当前块的行首实体
                const block = (tgt.closest('p,div,li,h1,h2,h3,h4,h5,h6,blockquote,pre') as HTMLElement) || (rootEl as HTMLElement)
                if (block && block.firstChild && block.firstChild.nodeType === 3) {
                  const t0 = (block.firstChild as Text)
                  if ((t0.data || '').startsWith(em)) {
                    t0.deleteData(0, em.length)
                    const rr = document.createRange(); rr.setStart(t0, 0); rr.collapse(true)
                    sel?.removeAllRanges(); sel?.addRange(rr)
                  }
                }
              }
            } catch {}
            return
          }

          // 正向缩进：若当前段落行首已是缩进，则不重复；否则插入一组
          try {
            if (sel && sel.rangeCount > 0) {
              const r = sel.getRangeAt(0)
              const block = (tgt.closest('p,div,li,h1,h2,h3,h4,h5,h6,blockquote,pre') as HTMLElement) || (rootEl as HTMLElement)
              const already = (() => { try { const fc = block?.firstChild; return (fc && fc.nodeType === 3 && (fc as Text).data.startsWith(em)) } catch { return false } })()
              if (already) return
            }
          } catch {}

          let ok = false
          try { ok = document.execCommand('insertText', false, em) } catch {}
          if (!ok && sel && sel.rangeCount > 0) {
            const r = sel.getRangeAt(0)
            r.deleteContents()
            r.insertNode(document.createTextNode(em))
            try { sel.removeAllRanges(); const rr = document.createRange(); rr.setStart(r.endContainer, r.endOffset); rr.collapse(true); sel.addRange(rr) } catch {}
          }
        } catch {}
      }, true)
      document.addEventListener('keydown', (e: KeyboardEvent) => {
        try {
          if (e.key !== 'Backspace') return
          const anyEv = e as any
          if (anyEv?.defaultPrevented) return
          const target = e.target as HTMLElement | null
          if (!target) return
          if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
          const el = target as HTMLInputElement | HTMLTextAreaElement
          const s = el.selectionStart ?? 0
          const end = el.selectionEnd ?? s
          if (s === 0 && end === 0) {
            e.preventDefault()
            try { e.stopPropagation() } catch {}
            try { (anyEv as any).stopImmediatePropagation && (anyEv as any).stopImmediatePropagation() } catch {}
          }
        } catch {}
      }, true)
    } catch {}
  }
  // 全局错误捕获
  window.addEventListener('error', (e) => { try { (e as any)?.preventDefault?.() } catch {}; // @ts-ignore
    showError(e.message || '未捕获错误', (e as any)?.error)
  })
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => { try { e.preventDefault() } catch {}; const reason = (e?.reason instanceof Error) ? e.reason : new Error(String(e?.reason ?? '未知拒绝'))
    showError('未处理的 Promise 拒绝', reason)
  })

  // 菜单项点击事件
  const btnOpen = document.getElementById('btn-open')
  const btnMode = document.getElementById('btn-mode')
  const btnSave = document.getElementById('btn-save')
  const btnSaveas = document.getElementById('btn-saveas')
  const btnToggle = document.getElementById('btn-toggle')
    const btnNew = document.getElementById('btn-new')
    const btnRecent = document.getElementById('btn-recent')
  const btnLibrary = document.getElementById('btn-library')
    const btnAbout = document.getElementById('btn-about')
    const btnUpdate = document.getElementById('btn-update')
    const btnUploader = document.getElementById('btn-uploader')
    const btnWysiwyg = document.getElementById('btn-wysiwyg')
    const btnLang = document.getElementById('btn-lang')
    const mobileLibToggle = document.getElementById('mobile-lib-toggle') as HTMLButtonElement | null

    if (mobileLibToggle && btnLibrary) {
      mobileLibToggle.addEventListener('click', () => {
        btnLibrary.click()
      })
    }

  if (btnOpen) btnOpen.addEventListener('click', guard(() => showFileMenu()))
  if (btnMode) btnMode.addEventListener('click', guard(() => showModeMenu()))
  if (btnLang) btnLang.addEventListener('click', guard(() => showLangMenu()))
  if (btnSave) btnSave.addEventListener('click', guard(() => saveFile()))
  if (btnSaveas) btnSaveas.addEventListener('click', guard(() => saveAs()))
  if (btnToggle) btnToggle.addEventListener('click', guard(() => toggleMode()))
  if (btnWysiwyg) btnWysiwyg.addEventListener('click', guard(() => toggleWysiwyg()))
  // 查找替换对话框（源码模式，Ctrl+H）
  let _findOverlay: HTMLDivElement | null = null
  let _findPanel: HTMLDivElement | null = null
  let _findInput: HTMLInputElement | null = null
  let _replaceInput: HTMLInputElement | null = null
  let _findCase: HTMLInputElement | null = null
  let _lastFind = ''
  let _findNextFn: ((fromCaret?: boolean) => void) | null = null
  let _findPrevFn: (() => void) | null = null
  let _findUpdateLabelFn: (() => void) | null = null
  function showFindPanelFindOnly() {
    showFindPanel()
    if (!_findPanel) return
    try { (_findPanel as HTMLDivElement).dataset.mode = 'find-only' } catch {}
  }
  // 所见/编辑：反引号序列状态（用于 ``` 代码围栏检测）
  let _btCount = 0
  let _btTimer: number | null = null
  let _btSelS = 0
  let _btSelE = 0
  let _astCount = 0
  let _astTimer: number | null = null
  let _astSelS = 0
  let _astSelE = 0
  function ensureFindPanel() {
    if (_findPanel && _findOverlay) return
    const sheet = ensureSheet('find-overlay', '查找 / 替换', 'fa-solid fa-magnifying-glass')
    if (!sheet) return
    _findOverlay = sheet.overlay
    const host = sheet.body
    if (host) {
      host.innerHTML = `
        <div class="find-panel" id="find-replace-panel">
          <div class="find-row">
            <input id="find-text" type="text" placeholder="查找... (Enter=下一个, Shift+Enter=上一个)" />
            <span id="find-count" class="find-count"></span>
            <label class="find-case" title="区分大小写">
              <input id="find-case" type="checkbox" />Aa
            </label>
          </div>
          <div class="find-row">
            <input id="replace-text" type="text" placeholder="替换为..." />
            <button id="btn-find-prev">上一个</button>
            <button id="btn-find-next">下一个</button>
          </div>
          <div class="find-row find-actions">
            <button id="btn-replace">替换</button>
            <button id="btn-replace-all">全部替换</button>
            <button id="btn-close-find" class="sheet-close-btn">关闭 (Esc)</button>
          </div>
        </div>
      `
      _findPanel = host.querySelector('#find-replace-panel') as HTMLDivElement
    }
    const overlay = _findOverlay
    _findInput = overlay?.querySelector('#find-text') as HTMLInputElement
    _replaceInput = overlay?.querySelector('#replace-text') as HTMLInputElement
    _findCase = overlay?.querySelector('#find-case') as HTMLInputElement
    const btnPrev = overlay?.querySelector('#btn-find-prev') as HTMLButtonElement
    const btnNext = overlay?.querySelector('#btn-find-next') as HTMLButtonElement
    const btnRep = overlay?.querySelector('#btn-replace') as HTMLButtonElement
    const btnAll = overlay?.querySelector('#btn-replace-all') as HTMLButtonElement
    const btnClose = overlay?.querySelector('#btn-close-find') as HTMLButtonElement
    const lblCount = overlay?.querySelector('#find-count') as HTMLSpanElement | null
    const closePanel = () => { hideFindPanel() }
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) closePanel() })
    attachBottomSheetSwipe(_findOverlay, _findPanel, closePanel)

    function norm(s: string) { return (_findCase?.checked ? s : s.toLowerCase()) }
    function getSel() { return { s: editor.selectionStart >>> 0, e: editor.selectionEnd >>> 0 } }
    // 设置选区并将其滚动到视口中间附近（仅源码模式 textarea）
    function setSel(s: number, e: number) {
      try {
        const ta = editor as HTMLTextAreaElement
        const len = String(ta.value || '').length >>> 0
        const start = s >>> 0
        ta.selectionStart = start
        ta.selectionEnd = e >>> 0
        try { ta.focus() } catch {}
        if (len > 0 && ta.scrollHeight > ta.clientHeight + 4) {
          const ratio = Math.max(0, Math.min(1, start / len))
          const target = ratio * ta.scrollHeight
          const view = ta.clientHeight
          ta.scrollTop = Math.max(0, target - view * 0.4)
        }
      } catch {
        // 降级路径：至少确保选区被设置
        try { editor.selectionStart = s; editor.selectionEnd = e } catch {}
      }
    }

    // 统计当前查询词在整个文档中的出现次数及当前命中序号（基于 editor.value，适用于编辑/所见模式）
    function countMatchesInEditor(termRaw: string): { total: number; index: number } {
      const term = String(termRaw || '')
      if (!term) return { total: 0, index: 0 }
      const val = String(editor.value || '')
      if (!val) return { total: 0, index: 0 }
      const hay = norm(val)
      const needle = norm(term)
      if (!needle) return { total: 0, index: 0 }
      const sel = getSel()
      let total = 0
      let curIndex = 0
      let pos = 0
      const step = Math.max(1, needle.length)
      for (;;) {
        const idx = hay.indexOf(needle, pos)
        if (idx < 0) break
        total++
        const start = idx
        const end = idx + term.length
        if (!curIndex && sel.s >= start && sel.s <= end) curIndex = total
        pos = idx + step
      }
      return { total, index: curIndex }
    }
    function updateFindCountLabel() {
      if (!lblCount) return
      const term = String(_findInput?.value || '')
      if (!term) { lblCount.textContent = ''; return }
      try {
        // 阅读模式：优先使用预览 DOM 的匹配信息
        if (mode === 'preview' && !wysiwyg) {
          const total = _previewFindMatches.length
          if (!total) { lblCount.textContent = '未找到'; return }
          const cur = _previewFindIndex >= 0 ? (_previewFindIndex + 1) : 0
          lblCount.textContent = cur > 0 ? `${cur}/${total}` : `${total}个`
          return
        }
        const { total, index } = countMatchesInEditor(term)
        if (!total) { lblCount.textContent = '未找到'; return }
        lblCount.textContent = index > 0 ? `${index}/${total}` : `${total}个`
      } catch {
        try { lblCount.textContent = '' } catch {}
      }
    }
    _findUpdateLabelFn = () => { try { updateFindCountLabel() } catch {} }

    // 阅读模式查找：使用浏览器原生查找 API
    let _previewFindIndex = -1
    let _previewFindMatches: Range[] = []

    function findInPreview(term: string, caseSensitive: boolean, forward: boolean) {
      try {
        // 清除之前的高亮
        const sel = window.getSelection()
        if (sel) sel.removeAllRanges()

        // 如果搜索词变了，或当前无缓存结果，则重新收集匹配项
        if (_lastFind !== term || _previewFindMatches.length === 0) {
          _previewFindMatches = []
          _previewFindIndex = -1
          _lastFind = term

          // 收集所有匹配项
          const walker = document.createTreeWalker(
            preview,
            NodeFilter.SHOW_TEXT,
            null
          )

          let node: Node | null
          while ((node = walker.nextNode())) {
            const text = node.textContent || ''
            const searchText = caseSensitive ? text : text.toLowerCase()
            const searchTerm = caseSensitive ? term : term.toLowerCase()

            let pos = 0
            while ((pos = searchText.indexOf(searchTerm, pos)) !== -1) {
              const range = document.createRange()
              range.setStart(node, pos)
              range.setEnd(node, pos + term.length)
              _previewFindMatches.push(range)
              pos += term.length
            }
          }
        }

        if (_previewFindMatches.length === 0) return false

        // 移动到下一个/上一个匹配项
        if (forward) {
          _previewFindIndex = (_previewFindIndex + 1) % _previewFindMatches.length
        } else {
          if (_previewFindIndex <= 0) {
            _previewFindIndex = _previewFindMatches.length - 1
          } else {
            _previewFindIndex--
          }
        }

        // 高亮当前匹配项
        const range = _previewFindMatches[_previewFindIndex]
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(range)
        }

        // 滚动到可见区域（以预览容器为基准，居中显示）
        try {
          const pv = preview as HTMLDivElement | null
          if (pv && pv.scrollHeight > pv.clientHeight + 4) {
            const pvRect = pv.getBoundingClientRect()
            const rect = range.getBoundingClientRect()
            const currentTop = pv.scrollTop >>> 0
            const delta = rect.top - pvRect.top
            const targetTop = Math.max(0, currentTop + delta - pv.clientHeight * 0.35)
            pv.scrollTo({ top: targetTop, behavior: 'smooth' })
          } else {
            // 兜底：若预览不可滚动，则退化为元素自身的 scrollIntoView
            const el = (range.startContainer as any)?.parentElement as HTMLElement | null
            el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }
        } catch {}

        return true
      } catch (e) {
        console.error('Preview find error:', e)
        return false
      }
    }

    function findNext(fromCaret = true) {
      const term = String(_findInput?.value || '')
      if (!term) { if (lblCount) lblCount.textContent = ''; return }

      // 阅读模式：在预览区查找
      if (mode === 'preview' && !wysiwyg) {
        findInPreview(term, !!_findCase?.checked, true)
        updateFindCountLabel()
        return
      }

      if (wysiwyg) { try { wysiwygV2FindNext(term, !!_findCase?.checked) } catch {} ; updateFindCountLabel(); return }
      const val = String(editor.value || '')
      const hay = norm(val)
      const needle = norm(term)
      const { s, e } = getSel()
      const startPos = fromCaret ? Math.max(e, 0) : 0
      let idx = hay.indexOf(needle, startPos)
      if (idx < 0 && startPos > 0) idx = hay.indexOf(needle, 0) // 循环查找
      if (idx >= 0) {
        setSel(idx, idx + term.length)
        updateFindCountLabel()
      } else {
        updateFindCountLabel()
      }
    }
    function findPrev() {
      // 上一个：严格在光标前搜索；未命中则循环到最后一个
      const term = String(_findInput?.value || '')
      if (!term) { if (wysiwyg) { try { (document.querySelector('#md-wysiwyg-root .ProseMirror') as HTMLElement)?.focus() } catch {} } else { try { editor.focus() } catch {} } ; return }

      // 阅读模式：在预览区查找
      if (mode === 'preview' && !wysiwyg) {
        findInPreview(term, !!_findCase?.checked, false)
        updateFindCountLabel()
        return
      }

      if (wysiwyg) { try { wysiwygV2FindPrev(term, !!_findCase?.checked) } catch {} ; updateFindCountLabel(); return }
      const val = String(editor.value || '')
      const hay = norm(val)
      const needle = norm(term)
      const { s } = getSel()
      const before = hay.slice(0, Math.max(0, s >>> 0))
      let idx = before.lastIndexOf(needle)
      if (idx < 0) idx = hay.lastIndexOf(needle) // 循环到文末最后一个
      if (idx >= 0) {
        setSel(idx, idx + term.length)
      } else {
        // 未找到也要把焦点送回编辑器，避免按钮聚焦导致选区高亮消失
        try { editor.focus() } catch {}
      }
      updateFindCountLabel()
    }
    function replaceOne() {
      const term = String(_findInput?.value || '')
      const rep = String(_replaceInput?.value || '')
      if (!term) return
      // 阅读模式不支持替换
      if (mode === 'preview' && !wysiwyg) {
        alert('阅读模式下不支持替换，请切换到源码模式')
        return
      }
      if (wysiwyg) { try { wysiwygV2ReplaceOneSel(term, rep, !!_findCase?.checked) } catch {} ; return }
      const { s, e } = getSel()
      const cur = editor.value.slice(s, e)
      const match = (_findCase?.checked ? cur === term : cur.toLowerCase() === term.toLowerCase())
      if (!match) { findNext(false); return }
      const ta = editor as HTMLTextAreaElement
      const val = String(ta.value || '')
      ta.focus(); ta.selectionStart = s; ta.selectionEnd = e
      if (!insertUndoable(ta, rep)) {
        editor.value = val.slice(0, s) + rep + val.slice(e)
      }
      const pos = s + rep.length
      setSel(pos, pos)
      dirty = true; refreshTitle(); refreshStatus(); if (mode === 'preview') { void renderPreview() } else if (wysiwyg) { scheduleWysiwygRender() }
      findNext(false)
      updateFindCountLabel()
    }
    function replaceAll() {
      const term = String(_findInput?.value || '')
      if (!term) return
      const rep = String(_replaceInput?.value || '')
      // 阅读模式不支持替换
      if (mode === 'preview' && !wysiwyg) {
        alert('阅读模式下不支持替换，请切换到源码模式')
        return
      }
      if (wysiwyg) { try { wysiwygV2ReplaceAllInDoc(term, rep, !!_findCase?.checked) } catch {} ; return }
      const ta = editor as HTMLTextAreaElement
      const val = String(ta.value || '')
      const hay = norm(val)
      const needle = norm(term)
      if (!needle) return
      let i = 0, changed = val, count = 0
      if (_findCase?.checked) {
        // 大小写敏感：直接遍历替换
        for (;;) {
          const idx = changed.indexOf(term, i)
          if (idx < 0) break
          changed = changed.slice(0, idx) + rep + changed.slice(idx + term.length)
          i = idx + rep.length; count++
        }
      } else {
        // 不区分大小写：逐段查找对齐替换
        let pos = 0
        while (pos < changed.length) {
          const seg = changed.slice(pos)
          const idx = seg.toLowerCase().indexOf(term.toLowerCase())
          if (idx < 0) break
          const real = pos + idx
          changed = changed.slice(0, real) + rep + changed.slice(real + term.length)
          pos = real + rep.length; count++
        }
      }
      if (count > 0) {
        ta.focus(); ta.selectionStart = 0; ta.selectionEnd = val.length
        if (!insertUndoable(ta, changed)) {
          editor.value = changed
        }
        const caret = Math.min(editor.value.length, editor.selectionEnd + rep.length)
        setSel(caret, caret)
        dirty = true; refreshTitle(); refreshStatus(); if (mode === 'preview') { void renderPreview() } else if (wysiwyg) { scheduleWysiwygRender() }
      }
      updateFindCountLabel()
    }

    _findNextFn = (fromCaret?: boolean) => { findNext(fromCaret) }
    _findPrevFn = () => { findPrev() }

    _findInput?.addEventListener('input', () => updateFindCountLabel())
    _findCase?.addEventListener('change', () => updateFindCountLabel())
    _findInput?.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); if (ev.shiftKey) findPrev(); else findNext() } })
    btnPrev?.addEventListener('click', () => findPrev())
    btnNext?.addEventListener('click', () => findNext())
    btnRep?.addEventListener('click', () => replaceOne())
    btnAll?.addEventListener('click', () => replaceAll())
    btnClose?.addEventListener('click', () => hideFindPanel())
  }

  function hideFindPanel(): void {
    hideSheet(_findOverlay)
    if (wysiwyg) { try { (document.querySelector('#md-wysiwyg-root .ProseMirror') as HTMLElement)?.focus() } catch {} } else { try { editor.focus() } catch {} }
  }

  function isFindPanelVisible(): boolean {
    return !!(_findOverlay && _findOverlay.classList.contains('show') && !_findOverlay.classList.contains('hidden'))
  }
  function showFindPanel() {
    ensureFindPanel()
    if (!_findPanel || !_findOverlay) return
    try { delete (_findPanel as HTMLDivElement).dataset.mode } catch {}
    // 选区文本用作初始查找词
    try {
      let sel = ''
      if (wysiwyg) { sel = String(wysiwygV2GetSelectedText() || '') }
      else { sel = editor.value.slice(editor.selectionStart >>> 0, editor.selectionEnd >>> 0) }
      if (sel) { (_findInput as HTMLInputElement).value = sel; _lastFind = sel }
    } catch {}
    try { if (_findUpdateLabelFn) _findUpdateLabelFn() } catch {}
    showSheet(_findOverlay)
    setTimeout(() => { try { (_findInput as HTMLInputElement).focus(); (_findInput as HTMLInputElement).select() } catch {} }, 0)
  }

  // 全局快捷键：Ctrl+H 打开查找替换
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    try {
      // 查找面板打开时，回车键用于切换到下一个/上一个（在所有模式下都拦截）
      if (isFindPanelVisible() && e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        if (e.shiftKey) { if (_findPrevFn) _findPrevFn() } else { if (_findNextFn) _findNextFn(true) }
        return
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); showFindPanelFindOnly(); return }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'h') { e.preventDefault(); showFindPanel(); return }
      if (e.key === 'Escape' && isFindPanelVisible()) { e.preventDefault(); hideFindPanel(); return }
    } catch {}
  }, true)  // 使用捕获阶段，确保在其他监听器之前处理

  function renderTabSheet(open = true): void {
    const sheet = ensureSheet('tab-sheet', '标签页', 'fa-solid fa-table-cells-large')
    if (!sheet) return
    _tabSheetOverlay = sheet.overlay
    const body = sheet.body
    if (body) {
      body.innerHTML = ''
      if (!_tabManagerRef) {
        const empty = document.createElement('div')
        empty.className = 'sheet-empty'
        empty.textContent = '标签功能正在加载...'
        body.appendChild(empty)
      } else {
        const tabs = (_tabManagerRef?.getTabs?.() as readonly TabDocument[] | undefined) || []
        const activeId = _tabManagerRef?.getActiveTabId?.() ?? null
        if (!tabs.length) {
          const empty = document.createElement('div')
          empty.className = 'sheet-empty'
          empty.textContent = '暂无标签页'
          body.appendChild(empty)
        } else {
          const grid = document.createElement('div')
          grid.className = 'tab-sheet-grid'
          tabs.forEach((tab) => {
            const item = document.createElement('button')
            item.type = 'button'
            item.className = 'tab-sheet-item' + (tab.id === activeId ? ' active' : '')
            const name = (tab.filePath || '').split(/[/\\]/).pop() || (t('filename.untitled') || '未命名')
            const path = tab.filePath || (t('filename.untitled') || '未命名')
            item.innerHTML = `
              <div class="tab-sheet-title">${name}${tab.dirty ? '<span class="tab-dirty-dot">*</span>' : ''}</div>
              <div class="tab-sheet-path">${path}</div>
              <span class="tab-sheet-close" aria-label="关闭"><i class="fa-solid fa-xmark" aria-hidden="true"></i></span>
            `
            item.addEventListener('click', async () => {
              try { await _tabManagerRef?.switchToTab?.(tab.id) } catch {}
              hideSheet(_tabSheetOverlay)
            })
            const closeBtn = item.querySelector('.tab-sheet-close') as HTMLSpanElement | null
            closeBtn?.addEventListener('click', async (ev) => {
              ev.stopPropagation()
              try { await _tabManagerRef?.closeTab?.(tab.id) } catch {}
              refreshTabSheet(false)
            })
            grid.appendChild(item)
          })
          body.appendChild(grid)
        }
      }
    }
    if (open) showSheet(sheet.overlay)
  }

  function refreshTabSheet(openIfVisible = false): void {
    const isOpen = _tabSheetOverlay ? (_tabSheetOverlay.classList.contains('show') && !_tabSheetOverlay.classList.contains('hidden')) : false
    if (!_tabSheetOverlay && !openIfVisible) return
    renderTabSheet(openIfVisible || isOpen)
  }

  function openTabManagerSheet(): void {
    renderTabSheet(true)
  }

  function renderQuickCommandsSheet(open = true): void {
    const sheet = ensureSheet('quick-commands-sheet', '快捷命令', 'fa-solid fa-bolt')
    if (!sheet) return
    _commandsSheetOverlay = sheet.overlay
    const body = sheet.body
    if (body) {
      body.innerHTML = ''
      if (pluginsMenuItems.size === 0) {
        const empty = document.createElement('div')
        empty.className = 'sheet-empty'
        empty.textContent = '暂无可用插件命令'
        body.appendChild(empty)
      } else {
        const list = document.createElement('div')
        list.className = 'quick-cmd-list'
        pluginsMenuItems.forEach((item) => {
          const btn = document.createElement('button')
          btn.type = 'button'
          btn.className = 'quick-cmd-item'
          const note = item.children && item.children.length > 0 ? `<span class="cmd-note">${item.children.length} 个子命令</span>` : ''
          btn.innerHTML = `<span class="cmd-title">${item.label}</span>${note}`
          btn.addEventListener('click', () => {
            try { hideSheet(_commandsSheetOverlay) } catch {}
            try {
              if (item.onClick) {
                item.onClick()
              } else if (item.children && item.children.length > 0) {
                try { togglePluginDropdown(btn, item.children) } catch {}
              }
            } catch (err) { console.warn('Plugin quick command failed', err) }
          })
          list.appendChild(btn)
        })
        body.appendChild(list)
      }
    }
    if (open) showSheet(sheet.overlay)
  }

  function refreshQuickCommandsSheet(openIfVisible = false): void {
    const isOpen = _commandsSheetOverlay ? (_commandsSheetOverlay.classList.contains('show') && !_commandsSheetOverlay.classList.contains('hidden')) : false
    if (!_commandsSheetOverlay && !openIfVisible && pluginsMenuItems.size === 0) return
    renderQuickCommandsSheet(openIfVisible || isOpen)
  }

  function initMobileBottomBar(): void {
    if (_bottomBarEl || !isMobilePlatform()) return
    const bar = document.createElement('div')
    bar.id = 'mobile-bottom-bar'
    bar.innerHTML = `
      <button type="button" data-action="new-tab"><i class="fa-solid fa-plus" aria-hidden="true"></i><span class="label">新标签</span></button>
      <button type="button" data-action="manage-tabs"><i class="fa-solid fa-table-cells-large" aria-hidden="true"></i><span class="label">标签管理</span></button>
      <button type="button" data-action="search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span class="label">搜索</span></button>
      <button type="button" data-action="commands"><i class="fa-solid fa-bolt" aria-hidden="true"></i><span class="label">快捷命令</span></button>
    `
    document.body.appendChild(bar)
    document.body.classList.add('has-bottom-bar')
    _bottomBarEl = bar
    bar.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest('button')
      if (!btn) return
      const act = btn.getAttribute('data-action')
      if (act === 'new-tab') {
        void (async () => { try { await newFile() } catch (e) { console.warn('新建标签失败', e) } })()
      } else if (act === 'manage-tabs') {
        openTabManagerSheet()
      } else if (act === 'search') {
        showFindPanelFindOnly()
      } else if (act === 'commands') {
        renderQuickCommandsSheet(true)
      }
    })
  }

  function bindTabManagerForUi(tabManager: any): void {
    _tabManagerRef = tabManager
    if (_tabEventsUnsub) { try { _tabEventsUnsub() } catch {} ; _tabEventsUnsub = null }
    if (tabManager?.addEventListener) {
      const off = tabManager.addEventListener(() => { refreshTabSheet(false) })
      if (typeof off === 'function') _tabEventsUnsub = off
    }
  }

  // 撤销友好插入/删除：通过 execCommand / setRangeText 保持到原生撤销栈
  function insertUndoable(ta: HTMLTextAreaElement, text: string): boolean {
    try { ta.focus(); document.execCommand('insertText', false, text); return true } catch {
      try {
        const s = ta.selectionStart >>> 0, e = ta.selectionEnd >>> 0
        ta.setRangeText(text, s, e, 'end')
        ta.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
        return true
      } catch { return false }
    }
  }
  function deleteUndoable(ta: HTMLTextAreaElement): boolean {
    try { ta.focus(); document.execCommand('delete'); return true } catch {
      const s = ta.selectionStart >>> 0, e = ta.selectionEnd >>> 0
      if (s !== e) {
        ta.setRangeText('', s, e, 'end')
        ta.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }))
        return true
      }
      return false
    }
  }

  // 源码模式：成对标记补全（自动/环绕/跳过/成对删除）
  try {
    (editor as HTMLTextAreaElement).addEventListener('keydown', (e: KeyboardEvent) => { if ((e as any).defaultPrevented) return; if (e.ctrlKey || e.metaKey || e.altKey) return
      // 反引号特殊处理：支持 ``` 围栏（空选区自动补全围栏；有选区则环绕为代码块）
      if (e.key === '`') {
        try { if (_btTimer) { clearTimeout(_btTimer); _btTimer = null } } catch {}
        _btCount = (_btCount || 0) + 1
        const ta = editor as HTMLTextAreaElement
        const val = String(ta.value || '')
        const s0 = ta.selectionStart >>> 0
        const e0 = ta.selectionEnd >>> 0
        if (_btCount === 1) { _btSelS = s0; _btSelE = e0 }
        e.preventDefault()
        const commit = () => {
          const s = _btSelS >>> 0
          const epos = _btSelE >>> 0
          const before = val.slice(0, s)
          const mid = val.slice(s, epos)
          const after = val.slice(epos)
          const hasNewline = /\n/.test(mid)
          if (_btCount >= 3 || hasNewline) {
            // 代码块围栏（可撤销）
            const content = (epos > s ? ('\n' + mid + '\n') : ('\n\n'))
            ta.selectionStart = s; ta.selectionEnd = epos
            if (!insertUndoable(ta, '```' + content + '```')) {
              ta.value = before + '```' + content + '```' + after
            }
            ta.selectionStart = ta.selectionEnd = (epos > s ? (s + content.length + 3) : (s + 4))
          } else if (_btCount === 2) {
            // 双反引号：当作行内代码（兼容场景，可撤销）
            ta.selectionStart = s; ta.selectionEnd = epos
            const ins = '``' + (epos > s ? mid : '') + '``'
            if (!insertUndoable(ta, ins)) {
              ta.value = before + ins + after
            }
            if (epos > s) { ta.selectionStart = s + 2; ta.selectionEnd = s + 2 + mid.length } else { ta.selectionStart = ta.selectionEnd = s + 2 }
          } else {
            // 单反引号：行内代码（可撤销）
            ta.selectionStart = s; ta.selectionEnd = epos
            const ins = '`' + (epos > s ? mid : '') + '`'
            if (!insertUndoable(ta, ins)) {
              ta.value = before + ins + after
            }
            if (epos > s) { ta.selectionStart = s + 1; ta.selectionEnd = s + 1 + mid.length } else { ta.selectionStart = ta.selectionEnd = s + 1 }
          }
          dirty = true; try { refreshTitle(); refreshStatus() } catch {}
          if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
          _btCount = 0; _btTimer = null
        }
        _btTimer = (setTimeout as any)(commit, 320)
        return
      }
            // 星号连击：1次斜体(*)；2次加粗(**)；与反引号逻辑一致，延迟收敛，避免第二次被当成“跳过右侧”
      if (e.key === '*') {
        try { if (_astTimer) { clearTimeout(_astTimer as any); _astTimer = null } } catch {}
        _astCount = (_astCount || 0) + 1
        const ta = editor as HTMLTextAreaElement
        const val = String(ta.value || '')
        const s0 = ta.selectionStart >>> 0
        const e0 = ta.selectionEnd >>> 0
        // 特判：处于 *|* 中间时，再按 * 扩展为 **|**（不跳过右侧）
        if (s0 === e0 && s0 > 0 && val[s0 - 1] === '*' && val[s0] === '*') {
          e.preventDefault()
          const left = s0 - 1, right = s0 + 1
          ta.selectionStart = left; ta.selectionEnd = right
          if (!insertUndoable(ta, '****')) {
            ta.value = val.slice(0, left) + '****' + val.slice(right)
          }
          ta.selectionStart = ta.selectionEnd = left + 2
          dirty = true; try { refreshTitle(); refreshStatus() } catch {}
          if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
          _astCount = 0; _astTimer = null
          return
        }
        if (_astCount === 1) { _astSelS = s0; _astSelE = e0 }
        e.preventDefault()
        const commitStar = () => {
          const s = _astSelS >>> 0
          const epos = _astSelE >>> 0
          const before = val.slice(0, s)
          const mid = val.slice(s, epos)
          const after = val.slice(epos)
          const ta2 = editor as HTMLTextAreaElement
          ta2.selectionStart = s; ta2.selectionEnd = epos
          if (_astCount >= 2) {
            // 加粗：**选区** 或 **|**
            const ins = '**' + (epos > s ? mid : '') + '**'
            if (!insertUndoable(ta2, ins)) { ta2.value = before + ins + after }
            if (epos > s) { ta2.selectionStart = s + 2; ta2.selectionEnd = s + 2 + mid.length } else { ta2.selectionStart = ta2.selectionEnd = s + 2 }
          } else {
            // 斜体：*选区* 或 *|*
            const ins = '*' + (epos > s ? mid : '') + '*'
            if (!insertUndoable(ta2, ins)) { ta2.value = before + ins + after }
            if (epos > s) { ta2.selectionStart = s + 1; ta2.selectionEnd = s + 1 + mid.length } else { ta2.selectionStart = ta2.selectionEnd = s + 1 }
          }
          dirty = true; try { refreshTitle(); refreshStatus() } catch {}
          if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
          _astCount = 0; _astTimer = null
        }
        _astTimer = (setTimeout as any)(commitStar, 280)
        return
      }
      // 波浪线：一次按键即完成成对环抱补全（~~ 语法）
      if (e.key === '~') {
        const ta = editor as HTMLTextAreaElement
        const val = String(ta.value || '')
        const s0 = ta.selectionStart >>> 0
        const e0 = ta.selectionEnd >>> 0
        e.preventDefault()
        ta.selectionStart = s0; ta.selectionEnd = e0
        const mid = val.slice(s0, e0)
        const ins = (e0 > s0) ? ('~~' + mid + '~~') : '~~~~'
        if (!insertUndoable(ta, ins)) {
          ta.value = val.slice(0, s0) + ins + val.slice(e0)
        }
        if (e0 > s0) { ta.selectionStart = s0 + 2; ta.selectionEnd = s0 + 2 + mid.length } else { ta.selectionStart = ta.selectionEnd = s0 + 2 }
        dirty = true; try { refreshTitle(); refreshStatus() } catch {}
        if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
        return
      }
      const _pairs: Array<[string, string]> = [
        ["(", ")"], ["[", "]"], ["{", "}"], ['"', '"'], ["'", "'"], ["*", "*"], ["_", "_"],
        ["（", "）"], ["【", "】"], ["《", "》"], ["「", "」"], ["『", "』"], ["“", "”"], ["‘", "’"]
      ]
      try { _pairs.push([String.fromCharCode(96), String.fromCharCode(96)]) } catch {}
      const openClose: Record<string, string> = Object.fromEntries(_pairs as any)
      const closers = new Set(Object.values(openClose))
      const ta = editor as HTMLTextAreaElement
      const val = String(ta.value || '')
      const s = ta.selectionStart >>> 0
      const epos = ta.selectionEnd >>> 0

      // 成对删除：Backspace 位于一对括号/引号之间（可撤销）
      if (e.key === 'Backspace' && s === epos && s > 0 && s < val.length) {
        const prev = val[s - 1]
        const next = val[s]
        // 处理 ~~|~~ 的成对删除
        if (s >= 2 && s + 2 <= val.length && val.slice(s - 2, s) === '~~' && val.slice(s, s + 2) === '~~') {
          e.preventDefault()
          ta.selectionStart = s - 2; ta.selectionEnd = s + 2
          if (!deleteUndoable(ta)) {
            ta.value = val.slice(0, s - 2) + val.slice(s + 2)
            ta.selectionStart = ta.selectionEnd = s - 2
          } else {
            ta.selectionStart = ta.selectionEnd = s - 2
          }
          dirty = true; try { refreshTitle(); refreshStatus() } catch {}
          if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
          return
        }
        if (openClose[prev] && openClose[prev] === next) {
          e.preventDefault()
          ta.selectionStart = s - 1; ta.selectionEnd = s + 1
          if (!deleteUndoable(ta)) {
            ta.value = val.slice(0, s - 1) + val.slice(s + 1)
            ta.selectionStart = ta.selectionEnd = s - 1
          } else {
            ta.selectionStart = ta.selectionEnd = s - 1
          }
          dirty = true; try { refreshTitle(); refreshStatus() } catch {}
          if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
          return
        }
      }

      // 跳过右侧：输入右括号/引号，若当前位置已是相同字符，则只移动光标
      if (closers.has(e.key) && s === epos && val[s] === e.key) {
        e.preventDefault()
        ta.selectionStart = ta.selectionEnd = s + 1
        return
      }

      // 自动/环绕补全
      const close = openClose[e.key]
      // 交给 imePatch 在 beforeinput 阶段处理，避免与此处重复
        if (!close) return
      e.preventDefault()
      if (s !== epos) {
        // 环绕选区
        const before = val.slice(0, s)
        const mid = val.slice(s, epos)
        const after = val.slice(epos)
        ta.value = before + e.key + mid + close + after
        ta.selectionStart = s + 1
        ta.selectionEnd = s + 1 + mid.length
      } else {
        // 插入成对并定位中间
        const before = val.slice(0, s)
        const after = val.slice(epos)
        ta.value = before + e.key + close + after
        ta.selectionStart = ta.selectionEnd = s + 1
      }
      dirty = true; try { refreshTitle(); refreshStatus() } catch {}
      if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
    })
  } catch {}  // 源码模式：Tab/Shift+Tab 段落缩进/反缩进
  try {
    (editor as HTMLTextAreaElement).addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.ctrlKey || e.metaKey) return
      e.preventDefault()
      try {
        const ta = editor as HTMLTextAreaElement
        const val = String(ta.value || '')
        const start = ta.selectionStart >>> 0
        const end = ta.selectionEnd >>> 0
        const isShift = !!e.shiftKey
        const indent = "&emsp;&emsp;" // 使用 HTML 实体 &emsp;&emsp; 模拟缩进，避免触发代码块
        // 选区起始行与结束行的起始偏移
        const lineStart = val.lastIndexOf('\n', start - 1) + 1
        const lineEndBoundary = val.lastIndexOf('\n', Math.max(end - 1, 0)) + 1
        const sel = val.slice(lineStart, end)
        if (start === end) {
          if (isShift) {
            if (val.slice(lineStart).startsWith(indent)) {
              const nv = val.slice(0, lineStart) + val.slice(lineStart + indent.length)
              ta.value = nv
              const newPos = Math.max(lineStart, start - indent.length)
              ta.selectionStart = ta.selectionEnd = newPos
            }
          } else {
            if (!val.slice(lineStart).startsWith(indent)) {
              const nv = val.slice(0, lineStart) + indent + val.slice(lineStart)
              ta.value = nv
              const newPos = start + indent.length
              ta.selectionStart = ta.selectionEnd = newPos
            }
          }
        } else if (start !== end && sel.includes('\n')) {
          // 多行：逐行缩进或反缩进
          const lines = val.slice(lineStart, end).split('\n')
          const changed = lines.map((ln) => {
            if (isShift) {
              if (ln.startsWith(indent)) return ln.slice(indent.length)
              if (ln.startsWith(' \t')) return ln.slice(1) // 宽松回退
              if (ln.startsWith('\t')) return ln.slice(1)
              return ln
            } else {
              return (ln.startsWith(indent) ? ln : indent + ln)
            }
          }).join('\n')
          const newVal = val.slice(0, lineStart) + changed + val.slice(end)
          const delta = changed.length - (end - lineStart)
          ta.value = newVal
          // 调整新选区：覆盖处理的整段
          ta.selectionStart = lineStart
          ta.selectionEnd = end + delta
        } else {
          // 单行：在光标处插入/删除缩进
          const curLineStart = lineStart
          if (isShift) {
            const cur = val.slice(curLineStart)
            if (cur.startsWith(indent, start - curLineStart)) {
              const newVal = val.slice(0, start - indent.length) + val.slice(start)
              ta.value = newVal
              ta.selectionStart = ta.selectionEnd = start - indent.length
            } else if ((start - curLineStart) > 0 && val.slice(curLineStart, curLineStart + 1) === '\t') {
              const newVal = val.slice(0, curLineStart) + val.slice(curLineStart + 1)
              ta.value = newVal
              const shift = (start > curLineStart) ? 1 : 0
              ta.selectionStart = ta.selectionEnd = start - shift
            }
          } else {
            const newVal = val.slice(0, start) + indent + val.slice(end)
            ta.value = newVal
            ta.selectionStart = ta.selectionEnd = start + indent.length
          }
        }
        dirty = true
        try { refreshTitle(); refreshStatus() } catch {}
        if (mode === 'preview') { try { void renderPreview() } catch {} } else if (wysiwyg) { try { scheduleWysiwygRender() } catch {} }
      } catch {}
    })
  } catch {}
  if (btnUpdate) btnUpdate.addEventListener('click', guard(() => checkUpdateInteractive()))
  // 代码复制按钮（事件委托）
  // 库侧栏右键菜单
  document.addEventListener('contextmenu', (ev) => {
    const target = ev.target as HTMLElement
    const row = target?.closest?.('.lib-node') as HTMLElement | null
    if (!row) return
    const tree = document.getElementById('lib-tree') as HTMLDivElement | null
    if (!tree || !tree.contains(row)) return
    ev.preventDefault()
    const path = (row as any).dataset?.path as string || ''
    const isDir = row.classList.contains('lib-dir')
    let menu = document.getElementById('lib-ctx') as HTMLDivElement | null
    if (!menu) {
      menu = document.createElement('div') as HTMLDivElement
      menu.id = 'lib-ctx'
      menu.style.position = 'absolute'
      menu.style.zIndex = '9999'
      menu.style.background = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#fff'
      menu.style.color = getComputedStyle(document.documentElement).getPropertyValue('--fg') || '#111'
      menu.style.border = '1px solid ' + (getComputedStyle(document.documentElement).getPropertyValue('--border') || '#e5e7eb')
      menu.style.borderRadius = '8px'
      menu.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
      menu.style.minWidth = '160px'
      menu.addEventListener('click', (e2) => e2.stopPropagation())
      document.body.appendChild(menu)
    }
    const mkItem = (txt: string, act: () => void) => {
      const a = document.createElement('div') as HTMLDivElement
      a.textContent = txt
      a.style.padding = '8px 12px'
      a.style.cursor = 'pointer'
      a.addEventListener('mouseenter', () => a.style.background = 'rgba(127,127,127,0.12)')
      a.addEventListener('mouseleave', () => a.style.background = 'transparent')
      a.addEventListener('click', () => { act(); hide() })
      return a
    }
    const hide = () => {
      if (menu) { menu.style.display = 'none' }
      document.removeEventListener('click', onDoc)
      if (_libCtxKeyHandler) {
        document.removeEventListener('keydown', _libCtxKeyHandler)
        _libCtxKeyHandler = null
      }
    }
    const onDoc = () => hide()
    menu.innerHTML = ''

    // 文件节点专属操作：在新实例中打开 / 生成便签
    if (!isDir) {
      // 在新实例中打开：若当前文档有未保存改动且路径相同，则阻止，避免用户误以为新实例包含未保存内容
      menu.appendChild(mkItem(t('ctx.openNewInstance'), async () => {
        try {
          const win = (window as any)
          const openFn = win?.flymdOpenInNewInstance as ((p: string) => Promise<void>) | undefined
          if (typeof openFn !== 'function') {
            alert('当前环境不支持新实例打开，请直接从系统中双击该文件。')
            return
          }
          try {
            const cur = currentFilePath ? normalizePath(currentFilePath) : ''
            const target = normalizePath(path)
            if (cur && cur === target && dirty) {
              alert('当前文档有未保存的更改，禁止在新实例中打开。\n请先保存后再尝试。')
              return
            }
          } catch {}
          await openFn(path)
        } catch (e) {
          console.error('[库树] 新实例打开文档失败:', e)
        }
      }))

      // 生成便签：若当前文档即该路径且有未保存改动，先尝试自动保存（与标签栏行为保持一致）
      menu.appendChild(mkItem(t('ctx.createSticky'), async () => {
        try {
          const win = (window as any)
          const createFn = win?.flymdCreateStickyNote as ((p: string) => Promise<void>) | undefined
          if (typeof createFn !== 'function') {
            alert('当前环境不支持便签功能。')
            return
          }
          try {
            const cur = currentFilePath ? normalizePath(currentFilePath) : ''
            const target = normalizePath(path)
            if (cur && cur === target && dirty) {
              const saveFn = win?.flymdSaveFile as (() => Promise<void>) | undefined
              if (typeof saveFn === 'function') {
                try {
                  await saveFn()
                } catch (err) {
                  console.error('[库树] 自动保存失败:', err)
                  alert('自动保存失败，无法生成便签。')
                  return
                }
              }
            }
          } catch {}
          await createFn(path)
        } catch (e) {
          console.error('[库树] 生成便签失败:', e)
        }
      }))
    }

    if (isDir) {
      menu.appendChild(mkItem(t('ctx.newFile'), async () => {
        try {
          let p2 = await newFileSafe(path)
          // 弹出重命名对话框
          const oldName = p2.split(/[\\/]+/).pop() || ''
          const m = oldName.match(/^(.*?)(\.[^.]+)$/)
          const stem = m ? m[1] : oldName
          const ext = m ? m[2] : '.md'
          const newStem = await openRenameDialog(stem, ext)
          if (newStem && newStem !== stem) {
            const newName = newStem + ext
            p2 = await renameFileSafe(p2, newName)
          }
          await openFile2(p2)
          mode='edit'
          preview.classList.add('hidden')
          try { (editor as HTMLTextAreaElement).focus() } catch {}
          const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
          if (treeEl && !fileTreeReady) {
            await fileTree.init(treeEl, {
              getRoot: getLibraryRoot,
              onOpenFile: async (p: string) => { await openFile2(p) },
              onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} },
              onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} }
            })
            fileTreeReady = true
          } else if (treeEl) {
            await fileTree.refresh()
          }
          const n2 = Array.from((document.getElementById('lib-tree')||document.body).querySelectorAll('.lib-node.lib-dir') as any).find((n:any) => n.dataset?.path === path)
          if (n2 && !n2.classList.contains('expanded')) {
            n2.dispatchEvent(new MouseEvent('click', { bubbles: true }))
          }
        } catch (e) {
          showError('新建失败', e)
        }
      }))
      menu.appendChild(mkItem(t('ctx.newFolder'), async () => { try { await newFolderSafe(path); const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null; if (treeEl && !fileTreeReady) { await fileTree.init(treeEl, { getRoot: getLibraryRoot, onOpenFile: async (p: string) => { await openFile2(p) }, onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} }, onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} } }); fileTreeReady = true } else if (treeEl) { await fileTree.refresh() }; const n2 = Array.from((document.getElementById('lib-tree')||document.body).querySelectorAll('.lib-node.lib-dir') as any).find((n:any) => n.dataset?.path === path); if (n2 && !n2.classList.contains('expanded')) { n2.dispatchEvent(new MouseEvent('click', { bubbles: true })) } } catch (e) { showError('新建文件夹失败', e) } }))
    }
    // 拖拽托底：右键"移动到…"以便选择目标目录
    menu.appendChild(mkItem(t('ctx.moveTo'), async () => {
      try {
        const root = await getLibraryRoot(); if (!root) { alert('请先选择库目录'); return }
        if (!isInside(root, path)) { alert('仅允许移动库内文件/文件夹'); return }
        if (typeof open !== 'function') { alert('该功能需要在 Tauri 应用中使用'); return }
        const defaultDir = path.replace(/[\\/][^\\/]*$/, '')
        const picked = await open({ directory: true, defaultPath: defaultDir || root }) as any
        const dest = (typeof picked === 'string') ? picked : ((picked as any)?.path || '')
        if (!dest) return
        if (!isInside(root, dest)) { alert('仅允许移动到库目录内'); return }
        const name = (path.split(/[\\/]+/).pop() || '')
        const sep = dest.includes('\\') ? '\\' : '/'
        const dst = dest.replace(/[\\/]+$/, '') + sep + name
        if (dst === path) return
        if (await exists(dst)) {
          const ok = await ask('目标已存在，是否覆盖？')
          if (!ok) return
        }
        await moveFileSafe(path, dst)
        if (currentFilePath === path) { currentFilePath = dst as any; refreshTitle() }
        const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
        if (treeEl && !fileTreeReady) { await fileTree.init(treeEl, { getRoot: getLibraryRoot, onOpenFile: async (p: string) => { await openFile2(p) }, onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} }, onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} } }); fileTreeReady = true }
        else if (treeEl) { await fileTree.refresh() }
      } catch (e) { showError('移动失败', e) }
    }))
    // 重命名操作
    const doRename = async () => { void renamePathWithDialog(path) }
    // 删除操作
    const doDelete = async () => { try { console.log('[删除] 右键菜单删除, 路径:', path); const confirmMsg = isDir ? '确定删除该文件夹及其所有内容？将移至回收站' : '确定删除该文件？将移至回收站'; const ok = await confirmNative(confirmMsg); console.log('[删除] 用户确认结果:', ok); if (!ok) return; console.log('[删除] 开始删除', isDir ? '文件夹' : '文件'); await deleteFileSafe(path, false); console.log('[删除] 删除完成'); if (currentFilePath === path) { currentFilePath = null as any; if (editor) (editor as HTMLTextAreaElement).value = ''; if (preview) preview.innerHTML = ''; refreshTitle() } const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null; if (treeEl && !fileTreeReady) { await fileTree.init(treeEl, { getRoot: getLibraryRoot, onOpenFile: async (p: string) => { await openFile2(p) }, onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} }, onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} } }); fileTreeReady = true } else if (treeEl) { await fileTree.refresh() } } catch (e) { showError('删除失败', e) } }
    menu.appendChild(mkItem(t('ctx.rename'), doRename))
    menu.appendChild(mkItem(t('ctx.delete'), doDelete))

    // 排列方式（名称/修改时间）和文件夹排序重置
    try {
      const sep = document.createElement('div') as HTMLDivElement
      sep.style.borderTop = '1px solid ' + (getComputedStyle(document.documentElement).getPropertyValue('--border') || '#e5e7eb')
      sep.style.margin = '6px 0'
      menu.appendChild(sep)
      const applySort = async (mode: LibSortMode) => {
        await setLibrarySort(mode)
        try { fileTree.setSort(mode) } catch {}
        try { await fileTree.refresh() } catch {}
      }
      menu.appendChild(mkItem(t('ctx.sortNameAsc'), () => { void applySort('name_asc') }))
      menu.appendChild(mkItem(t('ctx.sortNameDesc'), () => { void applySort('name_desc') }))
      menu.appendChild(mkItem(t('ctx.sortTimeDesc'), () => { void applySort('mtime_desc') }))
      menu.appendChild(mkItem(t('ctx.sortTimeAsc'), () => { void applySort('mtime_asc') }))

      if (isDir) {
        menu.appendChild(mkItem('恢复当前文件夹排序', async () => {
          try {
            // 仅清空当前目录的手动文件夹排序，不影响文件和其他目录
            try { (await import('./fileTree')).clearFolderOrderForParent(path) } catch {}
            try { await fileTree.refresh() } catch {}
          } catch {}
        }))
      }
    } catch {}
    menu.style.left = Math.min(ev.clientX, (window.innerWidth - 180)) + 'px'
    menu.style.top = Math.min(ev.clientY, (window.innerHeight - 120)) + 'px'
    menu.style.display = 'block'
    setTimeout(() => document.addEventListener('click', onDoc, { once: true }), 0)

    // 添加键盘快捷键支持：M 键重命名，D 键删除
    _libCtxKeyHandler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault()
        hide()
        void doRename()
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault()
        hide()
        void doDelete()
      }
    }
    document.addEventListener('keydown', _libCtxKeyHandler)
  })
  // 所见模式：右键打印（已去除，根据用户反馈移除该菜单）
  document.addEventListener('click', async (ev) => {
    const t = ev?.target as HTMLElement
    if (t && t.classList.contains('code-copy')) {
      ev.preventDefault()
      let text: string | null = null
      const direct = (t as any).__copyText
      if (typeof direct === 'string') text = direct
      if (text == null) {
        const box = t.closest('.codebox') as HTMLElement | null
        let pre = box?.querySelector('pre') as HTMLElement | null
        if (!pre) {
          const id = t.getAttribute('data-copy-target')
          if (id) { pre = document.querySelector(`pre[data-code-copy-id="${id}"]`) as HTMLElement | null }
        }
        if (pre) {
          // 提取语言信息并构造 Markdown 格式
          const codeEl = pre.querySelector('code') as HTMLElement | null
          const raw = codeEl ? (codeEl.textContent || '') : (pre.textContent || '')
          let lang = ''
          if (codeEl) {
            const codeClasses = codeEl.className || ''
            const preClasses = pre.className || ''
            const langMatch = (codeClasses + ' ' + preClasses).match(/language-(\w+)/)
            if (langMatch && langMatch[1]) {
              lang = langMatch[1]
            }
          }
          text = lang ? ('```' + lang + '\n' + raw + '\n```') : ('```\n' + raw + '\n```')
        } else {
          text = ''
        }
      }
      text = text || ''
      let ok = false
      try { await navigator.clipboard.writeText(text); ok = true } catch {}
      if (!ok) {
        try {
          const ta = document.createElement('textarea')
          ta.value = text
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
          ok = true
        } catch {}
      }
      t.textContent = ok ? '已复制' : '复制失败'
      setTimeout(() => { (t as HTMLButtonElement).textContent = '复制' }, 1200)
    }
  }, { capture: true })
  // 库重命名/删除快捷键
  
  // 快捷键：插入链接、重命名、删除（库树）
  document.addEventListener('keydown', guard(async (e: KeyboardEvent) => {
    // 开发模式：F12 / Ctrl+Shift+I 打开 DevTools（不影响生产）
    try {
      if ((import.meta as any).env?.DEV) {
        const isF12 = e.key === 'F12'
        const isCtrlShiftI = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i'
        if (isF12 || isCtrlShiftI) {
          e.preventDefault()
          try { getCurrentWebview().openDevtools() } catch {}
          return
        }
      }
    } catch {}
    // 记录最近一次 Ctrl/Cmd(+Shift)+V 组合键（仅在编辑器/所见模式聚焦时生效，用于区分普通粘贴与纯文本粘贴）
    try {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        const active = document.activeElement as HTMLElement | null
        const inMdEditor = active === (editor as any)
        const inWysiwyg = !!(active && (active.classList.contains('ProseMirror') || active.closest('.ProseMirror')))
        _lastPasteCombo = (inMdEditor || inWysiwyg) ? (e.shiftKey ? 'plain' : 'normal') : null
        try { (window as any).__flymdLastPasteCombo = _lastPasteCombo } catch {}
      }
    } catch {}
    // 编辑快捷键（全局）：插入链接 / 加粗 / 斜体
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); guard(insertLink)(); return }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      await toggleWysiwyg();
      // 更新专注模式侧栏背景色
      setTimeout(() => updateFocusSidebarBg(), 100);
      return
    }
    // Ctrl+Shift+R：打开最近文件面板
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
      e.preventDefault()
      try { await renderRecentPanel(true) } catch {}
      return
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      try { e.stopPropagation(); /* 防止编辑器内部再次处理 */ } catch {}
      try { (e as any).stopImmediatePropagation && (e as any).stopImmediatePropagation() } catch {}
      saveScrollPosition()  // 保存当前滚动位置
      try {
        if (wysiwyg) {
          // 先确定进入"阅读"(预览)状态，再退出所见，避免退出所见时根据旧 mode 隐藏预览
          mode = 'preview'
          try { preview.classList.remove('hidden') } catch {}
          try { await renderPreview() } catch {}
          try { await setWysiwygEnabled(false) } catch {}
          try { syncToggleButton() } catch {}
          // 更新专注模式侧栏背景色
          setTimeout(() => updateFocusSidebarBg(), 100);
          // 更新外圈UI颜色
          try { updateChromeColorsForMode('preview') } catch {}
          restoreScrollPosition()  // 恢复滚动位置
          try { notifyModeChange() } catch {}
          return
        }
      } catch {}
      if (mode !== 'preview') {
        mode = 'preview'
        try { preview.classList.remove('hidden') } catch {}
        try { await renderPreview() } catch {}
        try { syncToggleButton() } catch {}
        // 更新专注模式侧栏背景色
        setTimeout(() => updateFocusSidebarBg(), 100);
        // 更新外圈UI颜色
        try { updateChromeColorsForMode('preview') } catch {}
        restoreScrollPosition()  // 恢复滚动位置
        try { notifyModeChange() } catch {}
      }
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      try { e.stopPropagation() } catch {}
      try { (e as any).stopImmediatePropagation && (e as any).stopImmediatePropagation() } catch {}
      await handleToggleModeShortcut();
      return
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      await formatBold()
      if (mode === 'preview') {
        void renderPreview()
      } else if (wysiwyg && !wysiwygV2Active) {
        // 仅旧所见模式需要从 Markdown 重渲染；V2 直接在编辑视图内部操作
        scheduleWysiwygRender()
      }
      return
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      await formatItalic()
      if (mode === 'preview') {
        void renderPreview()
      } else if (wysiwyg && !wysiwygV2Active) {
        scheduleWysiwygRender()
      }
      return
    }
    // 专注模式快捷键 Ctrl+Shift+F
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); await toggleFocusMode(); return }
    // 文件操作快捷键
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); await openFile2(); return }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); await saveAs(); return }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); await saveFile(); return }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault()
      const flymd = (window as any)
      if (flymd.flymdNewFile) {
        await flymd.flymdNewFile()
      }
      return
    }
    try {
      const lib = document.getElementById('library') as HTMLDivElement | null
      const libVisible = lib && !lib.classList.contains('hidden')
      if (!libVisible) return
      const row = document.querySelector('#lib-tree .lib-node.selected') as HTMLElement | null
      if (!row) return
      const p = (row as any).dataset?.path as string || ''
      if (!p) return
      if (e.key === 'F2') {
        e.preventDefault()
        const base = p.replace(/[\\/][^\\/]*$/, '')
        const oldName = p.split(/[\\/]+/).pop() || ''
        const name = window.prompt('重命名为：', oldName) || ''
        if (!name || name === oldName) return
        const root = await getLibraryRoot(); if (!root) return
        if (!isInside(root, p)) { alert('越权操作禁止'); return }
        const dst = base + (base.includes('\\') ? '\\' : '/') + name
        if (await exists(dst)) { alert('同名已存在'); return }
        await moveFileSafe(p, dst)
        if (currentFilePath === p) { currentFilePath = dst as any; refreshTitle() }
      const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null; if (treeEl && !fileTreeReady) { await fileTree.init(treeEl, { getRoot: getLibraryRoot, onOpenFile: async (p: string) => { await openFile2(p) }, onOpenNewFile: async (p: string) => { await openFile2(p); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} }, onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} } }); fileTreeReady = true } else if (treeEl) { await fileTree.refresh() }
        return
      }
      // Delete 键删除文件功能已移除，避免干扰编辑器中的文字删除
      // 用户可以通过右键菜单或其他方式删除文件
    } catch (e) { showError('操作失败', e) }
  }), { capture: true })
  if (btnNew) btnNew.addEventListener('click', guard(async () => {
    try {
      const lib = document.getElementById('library') as HTMLDivElement | null
      const libVisible = lib && !lib.classList.contains('hidden')
      let dir = selectedFolderPath || null
      if (!dir) {
        if (currentFilePath) dir = currentFilePath.replace(/[\\/][^\\/]*$/, '')
        if (!dir) dir = await getLibraryRoot()
        if (!dir) dir = await pickLibraryRoot()
      }
      if (!dir) return
      const p = await newFileSafe(dir)
      await openFile2(p)
      mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {}
      const treeEl = document.getElementById('lib-tree') as HTMLDivElement | null
      if (treeEl && !fileTreeReady) { await fileTree.init(treeEl, { getRoot: getLibraryRoot, onOpenFile: async (q: string) => { await openFile2(q) }, onOpenNewFile: async (q: string) => { await openFile2(q); mode='edit'; preview.classList.add('hidden'); try { (editor as HTMLTextAreaElement).focus() } catch {} }, onMoved: async (src: string, dst: string) => { try { if (currentFilePath === src) { currentFilePath = dst as any; refreshTitle() } } catch {} } }); fileTreeReady = true } else if (treeEl) { await fileTree.refresh() }
      try { const tree = document.getElementById('lib-tree') as HTMLDivElement | null; const nodes = Array.from(tree?.querySelectorAll('.lib-node.lib-dir') || []) as HTMLElement[]; const target = nodes.find(n => (n as any).dataset?.path === dir); if (target) target.dispatchEvent(new MouseEvent('click', { bubbles: true })) } catch {}
      return
    } catch (e) { showError('新建文件失败', e) }
  }))
  if (btnRecent) btnRecent.addEventListener('click', guard(() => renderRecentPanel(true)))
  if (btnLibrary) btnLibrary.addEventListener('click', guard(async () => {
    const lib = document.getElementById('library')
    const showing = lib && !lib.classList.contains('hidden')
    if (showing) { showLibrary(false); return }
    // 显示并准备数据
    showLibrary(true)
    let root = await getLibraryRoot()
    if (!root) root = await pickLibraryRoot()
    const needTreeRefresh = !fileTreeReady
    try { await refreshLibraryUiAndTree(needTreeRefresh) } catch {}
  }))
  // 非固定模式：点击库外空白自动隐藏
  document.addEventListener('mousedown', (ev) => {
    try {
      const lib = document.getElementById('library') as HTMLDivElement | null
      if (!lib) return
      const visible = !lib.classList.contains('hidden')
      if (!visible) return
      if (libraryDocked) return // 仅非固定模式
      const t = ev.target as Node
      if (lib && !lib.contains(t)) showLibrary(false, false)
    } catch {}
  }, { capture: true })
  if (btnAbout) btnAbout.addEventListener('click', guard(() => showAbout(true)))
  if (btnUploader) btnUploader.addEventListener('click', guard(() => openUploaderDialog()))

  // 所见模式：输入/合成结束/滚动时联动渲染与同步
  editor.addEventListener('input', () => { scheduleSaveDocPos() })
  editor.addEventListener('compositionend', () => { scheduleSaveDocPos() })
  editor.addEventListener('scroll', () => { scheduleSaveDocPos() })
  editor.addEventListener('keyup', () => { scheduleSaveDocPos(); try { notifySelectionChangeForPlugins() } catch {} })
  editor.addEventListener('click', () => { scheduleSaveDocPos(); try { notifySelectionChangeForPlugins() } catch {} })

  // 预览滚动也记录阅读位置
  preview.addEventListener('scroll', () => { scheduleSaveDocPos() })

  // ===== 初始化滚动条自动隐藏（支持悬停保持显示） =====
  try {
    initAutoHideScrollbar()
  } catch (err) {
    console.warn('滚动条自动隐藏初始化失败', err)
    // 失败不影响应用其他功能
  }

  // 绑定全局点击（图床弹窗测试按钮）
  document.addEventListener('click', async (ev) => {
    const t = ev?.target as HTMLElement
    if (t && t.id === 'upl-test') {
      ev.preventDefault()
      const overlay = document.getElementById('uploader-overlay') as HTMLDivElement | null
      const testRes = overlay?.querySelector('#upl-test-result') as HTMLDivElement | null
      const ep = (overlay?.querySelector('#upl-endpoint') as HTMLInputElement)?.value || ''
      if (testRes) { testRes.textContent = '测试中...'; (testRes as any).className = ''; testRes.id = 'upl-test-result' }
      try {
        const res = await testUploaderConnectivity(ep)
        if (testRes) { testRes.textContent = res.ok ? '可达' : '不可达'; (testRes as any).className = res.ok ? 'ok' : 'err' }
      } catch (e: any) {
        if (testRes) { testRes.textContent = '测试失败'; (testRes as any).className = 'err' }
      }
    }
  })


  // 文本变化
  editor.addEventListener('input', () => {
    dirty = true
    refreshTitle()
  })
  editor.addEventListener('keyup', (ev) => { refreshStatus(ev); try { notifySelectionChangeForPlugins() } catch {} })
  editor.addEventListener('click', (ev) => { refreshStatus(ev); try { notifySelectionChangeForPlugins() } catch {} })
  // 粘贴到编辑器：
  // - Ctrl+Shift+V：始终按纯文本粘贴（忽略 HTML/图片等富文本信息）
  // - 普通 Ctrl+V：优先将 HTML 转译为 Markdown；其次处理图片文件占位+异步上传；否则走默认粘贴
  editor.addEventListener('paste', guard(async (e: ClipboardEvent) => {
    try {
      const dt = e.clipboardData
      if (!dt) return

      // 统一提取常用数据，便于后续分支复用
      const types = dt.types ? Array.from(dt.types) : []
      const hasHtmlType = types.some(t => String(t).toLowerCase() === 'text/html')
      const html = hasHtmlType ? dt.getData('text/html') : ''
      const plainText = dt.getData('text/plain') || dt.getData('text') || ''
      const plainTrim = plainText.trim()
      const pasteCombo = _lastPasteCombo
      // 使用一次即清空，避免状态污染后续粘贴
      _lastPasteCombo = null

      // 0) Ctrl+Shift+V：强制走"纯文本粘贴"路径，完全忽略 HTML / 图片 等富文本
      if (pasteCombo === 'plain') {
        try {
          e.preventDefault()
          if (plainText) {
            insertAtCursor(plainText)
            if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
          }
        } catch {}
        return
      }

      // 1) 处理 HTML → Markdown（像 Typora 那样保留格式）
      try {
        if (html && html.trim()) {
          // 粗略判断是否为“富文本”而非纯文本包装，避免过度拦截
          const looksRich = /<\s*(p|div|h[1-6]|ul|ol|li|pre|table|img|a|blockquote|strong|em|b|i|code)[\s>]/i.test(html)
          if (looksRich) {
            // 这里必须同步阻止默认粘贴，避免出现“纯文本 + Markdown”双重插入
            e.preventDefault()

            // 按需加载 DOMPurify 做一次基本清洗，避免恶意剪贴板 HTML 注入
            let safe = html
            // 提取 base href 以便相对链接转绝对（若存在）
            let baseUrl: string | undefined
            try {
              const m = html.match(/<base\s+href=["']([^"']+)["']/i)
              if (m && m[1]) baseUrl = m[1]
            } catch {}
            try {
              if (!sanitizeHtml) {
                const mod: any = await import('dompurify')
                const DOMPurify = mod?.default || mod
                sanitizeHtml = (h: string, cfg?: any) => DOMPurify.sanitize(h, cfg)
              }
              safe = sanitizeHtml!(html)
            } catch {}

            // 转成 Markdown 文本（动态导入）
            let mdText = ''
            try {
              const { htmlToMarkdown } = await import('./html2md')
              mdText = htmlToMarkdown(safe, { baseUrl }) || ''
            } catch (err) {
              console.warn('HTML to Markdown conversion failed:', err)
            }

            // 转译失败时退回纯文本，保证不会“吃掉”粘贴内容
            const finalText = (mdText && mdText.trim()) ? mdText : plainText
            if (finalText) {
              insertAtCursor(finalText)
              if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
            }
            return
          }
        }
      } catch {}

      // 1b) Ctrl+V 且仅有单个 URL：插入占位提示 [正在抓取title]，异步抓取网页标题后替换为 [标题](url)
      if (pasteCombo === 'normal') {
        try {
          const url = plainTrim
          // 仅在剪贴板内容是“单行 http/https URL”时触发，避免误伤普通文本
          if (url && /^https?:\/\/[^\s]+$/i.test(url)) {
            e.preventDefault()
            const placeholder = '[正在抓取title]'
            // 先插入占位提示，让用户感知到粘贴正在进行；此处不触发预览渲染，避免多次重绘
            insertAtCursor(placeholder)

            let finalText = url
            try {
              const title = await fetchPageTitle(url)
              if (title && title.trim()) {
                // 基本转义标题中的方括号，避免破坏 Markdown 语法
                const safeTitle = title.replace(/[\[\]]/g, '\\$&')
                finalText = `[${safeTitle}](${url})`
              }
            } catch {}

            try {
              const v = String((editor as HTMLTextAreaElement).value || '')
              const idx = v.indexOf(placeholder)
              if (idx >= 0) {
                const before = v.slice(0, idx)
                const after = v.slice(idx + placeholder.length)
                const next = before + finalText + after
                ;(editor as HTMLTextAreaElement).value = next
                const caret = before.length + finalText.length
                ;(editor as HTMLTextAreaElement).selectionStart = caret
                ;(editor as HTMLTextAreaElement).selectionEnd = caret
                dirty = true
                refreshTitle()
                refreshStatus()
              } else {
                // 占位符已被用户编辑删除，退回为在当前位置插入最终文本
                insertAtCursor(finalText)
              }
              if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
            } catch {}
            return
          }
        } catch {}
      }

      // 2) 若包含图片文件，使用占位 + 异步上传
      const items = Array.from(dt.items || [])
      const imgItem = items.find((it) => it.kind === 'file' && /^image\//i.test(it.type))
      if (!imgItem) return

      const file = imgItem.getAsFile()
      if (!file) return

      e.preventDefault()

      // 生成文件名
      const mime = (file.type || '').toLowerCase()
      const ext = (() => {
        if (mime.includes('jpeg')) return 'jpg'
        if (mime.includes('png')) return 'png'
        if (mime.includes('gif')) return 'gif'
        if (mime.includes('webp')) return 'webp'
        if (mime.includes('bmp')) return 'bmp'
        if (mime.includes('avif')) return 'avif'
        if (mime.includes('svg')) return 'svg'
        return 'png'
      })()
      const ts = new Date()
      const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
      const rand = Math.random().toString(36).slice(2, 6)
      const fname = `pasted-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}-${rand}.${ext}`

      // 占位符 + 异步上传，不阻塞编辑（已拆分到 core/imageUpload）
      await _imageUploader.startAsyncUploadFromFile(file, fname)
      return
      // 若开启直连上传（S3/R2），优先尝试上传，成功则直接插入外链并返回
      try {
        const upCfg = await getUploaderConfig()
        if (upCfg) {
          const pub = await uploadImageToS3R2(file, fname, file.type || 'application/octet-stream', upCfg)
          insertAtCursor(`![${fname}](${pub.publicUrl})`)
          if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
          else if (wysiwyg) scheduleWysiwygRender()
          return
        }
      } catch (e) {
        console.warn('直连上传失败，改用本地保存/内联', e)
      }

      await _imageUploader.startAsyncUploadFromFile(file, fname)
    } catch (err) {
      showError('处理粘贴图片失败', err)
    }
  }))
  // 拖拽到编辑器：插入图片（本地文件或 URL）
  editor.addEventListener('dragover', (e) => { e.preventDefault() })
  editor.addEventListener('drop', async (e) => {
    try {
      e.preventDefault()
      const dt = e.dataTransfer
      if (!dt) return
      const files = Array.from(dt.files || [])
      // 在 Tauri 环境下，文件拖入统一交给 tauri://file-drop 处理，避免与 DOM 层重复
      if (isTauriRuntime() && files.length > 0) {
        return
      }
      if (files.length > 0) {
        // Always-save-local: prefer local images folder
        try {
          const alwaysLocal = await getAlwaysSaveLocalImages()
          if (alwaysLocal) {
            const imgFiles = files.filter((f) => extIsImage(f.name) || (f.type && f.type.startsWith('image/')))
            if (imgFiles.length > 0) {
              const partsLocal: string[] = []
              if (isTauriRuntime() && currentFilePath) {
                const base = currentFilePath.replace(/[\\/][^\\/]*$/, '')
                const sep = base.includes('\\') ? '\\' : '/'
                const imgDir = base + sep + 'images'
                try { await ensureDir(imgDir) } catch {}
                for (const f of imgFiles) {
                  try {
                    const dst = imgDir + sep + f.name
                    const buf = new Uint8Array(await f.arrayBuffer())
                    await writeFile(dst as any, buf as any)
                    const needAngle = /[\s()]/.test(dst) || /^[a-zA-Z]:/.test(dst) || /\\/.test(dst)
                    const mdUrl = needAngle ? `<${dst}>` : dst
                    partsLocal.push(`![${f.name}](${mdUrl})`)
                  } catch {}
                }
                if (partsLocal.length > 0) {
                  insertAtCursor(partsLocal.join('\n'))
                  if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                  return
                }
              } else if (isTauriRuntime() && !currentFilePath) {
                const dir = await getDefaultPasteDir()
                if (dir) {
                  const baseDir = dir.replace(/[\\/]+$/, '')
                  const sep = baseDir.includes('\\') ? '\\' : '/'
                  try { await ensureDir(baseDir) } catch {}
                  for (const f of imgFiles) {
                    try {
                      const dst = baseDir + sep + f.name
                      const buf = new Uint8Array(await f.arrayBuffer())
                      await writeFile(dst as any, buf as any)
                      const needAngle = /[\s()]/.test(dst) || /^[a-zA-Z]:/.test(dst) || /\\/.test(dst)
                      const mdUrl = needAngle ? `<${dst}>` : dst
                      partsLocal.push(`![${f.name}](${mdUrl})`)
                    } catch {}
                  }
                  if (partsLocal.length > 0) {
                    insertAtCursor(partsLocal.join('\n'))
                    if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                    return
                  }
                }
              }
              // Fallback to data URLs
              const partsData: string[] = []
              for (const f of imgFiles) {
                try { const url = await fileToDataUrl(f); partsData.push(`![${f.name}](${url})`) } catch {}
              }
              if (partsData.length > 0) {
                insertAtCursor(partsData.join('\n'))
                if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                return
              }
            }
          }
        } catch {}
        // 优先检查是否有 MD 文件（浏览器环境）
        const mdFile = files.find((f) => /\.(md|markdown|txt)$/i.test(f.name))
        if (mdFile) {
          const reader = new FileReader()
          reader.onload = async (evt) => {
            try {
              const content = evt.target?.result as string
              if (content !== null && content !== undefined) {
                if (dirty) {
                  const ok = await confirmNative('当前文件尚未保存，是否放弃更改并打开拖拽的文件？', '打开文件')
                  if (!ok) return
                }
                editor.value = content
                currentFilePath = null
                dirty = false
                refreshTitle()
                refreshStatus()
                if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                // 拖入 MD 文件后默认预览
                await switchToPreviewAfterOpen()
              }
            } catch (err) {
              showError('读取拖拽的MD文件失败', err)
            }
          }
          reader.onerror = () => showError('文件读取失败', reader.error)
          reader.readAsText(mdFile, 'UTF-8')
          return
        }
        // 若启用直连上传，优先尝试上传到 S3/R2，成功则直接插入外链后返回
        try {
          const upCfg = await getUploaderConfig()
          if (upCfg) {
            const partsUpload: string[] = []
            for (const f of files) {
              if (extIsImage(f.name) || (f.type && f.type.startsWith('image/'))) {
                try {
                  let fileForUpload: Blob = f
                  let nameForUpload: string = f.name
                  let typeForUpload: string = f.type || 'application/octet-stream'
                  try {
                    if (upCfg?.convertToWebp) {
                      const r = await transcodeToWebpIfNeeded(f, nameForUpload, upCfg.webpQuality ?? 0.85, { skipAnimated: true })
                      fileForUpload = r.blob
                      nameForUpload = r.fileName
                      typeForUpload = r.type || 'image/webp'
                    }
                  } catch {}
                  const pub = await uploadImageToS3R2(fileForUpload, nameForUpload, typeForUpload, upCfg)
                  partsUpload.push(`![${nameForUpload}](${pub.publicUrl})`)
                } catch (e) {
                  console.warn('直连上传失败，跳过此文件使用本地兜底', f.name, e)
                }
              }
            }
            if (partsUpload.length > 0) {
              insertAtCursor(partsUpload.join('\n'))
              if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
              return
            }
          }
        } catch {}
        // 处理图片
        const parts: string[] = []
        for (const f of files) {
          if (extIsImage(f.name) || (f.type && f.type.startsWith('image/'))) {
            const url = await fileToDataUrl(f)
            parts.push(`![${f.name}](${url})`)
          }
        }
        if (parts.length > 0) {
          insertAtCursor(parts.join('\n'))
          if (mode === 'preview') await renderPreview()
          }
        return
      }
      const uriList = dt.getData('text/uri-list') || ''
      const plain = dt.getData('text/plain') || ''
      const cand = (uriList.split('\n').find((l) => /^https?:/i.test(l)) || '').trim() || plain.trim()
      if (cand && /^https?:/i.test(cand)) {
        const isImg = extIsImage(cand)
        insertAtCursor(`${isImg ? '!' : ''}[${isImg ? 'image' : 'link'}](${cand})`)
        if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
      }
    } catch (err) {
      showError('拖拽处理失败', err)
    }
  })

  // 快捷键
  

  // 关闭前确认（未保存）
  // 注意：Windows 平台上在 onCloseRequested 中调用浏览器 confirm 可能被拦截/无效，
  // 使用 Tauri 原生 ask 更稳定；必要时再降级到 confirm。
  try {
    void getCurrentWindow().onCloseRequested(async (event) => {
      let portableActive = false
      try { portableActive = await isPortableModeEnabled() } catch {}
      const runPortableExportOnExit = async () => {
        if (portableActive) {
          try { await exportPortableBackupSilent() } catch (err) { console.warn('[Portable] 关闭时导出失败', err) }
        }
      }
      if (!dirty) {
        await runPortableExportOnExit()
        return
      }

      // 阻止默认关闭，进行异步确认
      event.preventDefault()
      try { await saveCurrentDocPosNow() } catch {}

      let shouldExit = false
      let wantSave = false

      // 使用自定义三按钮对话框
      const result = await showThreeButtonDialog(
        '检测到当前文档有未保存的更改',
        '退出确认'
      )

      if (result === 'save') {
        // 保存并退出
        wantSave = true
      } else if (result === 'discard') {
        // 直接退出，放弃更改
        shouldExit = true
      } else {
        // cancel - 取消退出，不做任何操作
        return
      }

      if (wantSave) {
        try {
          if (!currentFilePath) await saveAs()
          else await saveFile()
          // 保存成功
          shouldExit = true
        } catch (e) {
          showError('保存失败', e)
          shouldExit = false
        }
      }

      if (shouldExit) {
        // 便签模式：关闭前先恢复窗口大小和位置，避免 tauri-plugin-window-state 记住便签的小窗口尺寸
        if (stickyNoteMode) {
          try { await restoreWindowStateBeforeSticky() } catch {}
        }
        await runPortableExportOnExit()
        // 若启用“关闭前同步”，沿用后台隐藏 + 同步 + 退出的策略
        try {
          const cfg = await getWebdavSyncConfig()
          if (cfg.enabled && cfg.onShutdown) {
            const win = getCurrentWindow()
            try { await win.hide() } catch {}
            try { await webdavSyncNow('shutdown') } catch {}
            try { await new Promise(r => setTimeout(r, 300)) } catch {}
            try { await win.destroy() } catch {}
            return
          }
        } catch {}

        // 未启用关闭前同步，直接退出
        try { await getCurrentWindow().destroy() } catch { try { await getCurrentWindow().close() } catch {} }
      }
    })
  } catch (e) {
    console.log('窗口关闭监听注册失败（浏览器模式）')
  }

  // 点击外部区域时关闭最近文件面板
  // 浏览器/非 Tauri 环境下的关闭前确认兜底
  try {
    if (!isTauriRuntime()) {
      window.addEventListener('beforeunload', (e) => {
        try { void saveCurrentDocPosNow() } catch {}
        if (dirty) {
          e.preventDefault()
          ;(e as any).returnValue = ''
        }
      })
    }
  } catch {}
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('recent-panel') as HTMLDivElement
    if (!panel || panel.classList.contains('hidden')) return
    const target = e.target as Node | null
    // 只要点击在面板外部，就关闭最近文件面板
    if (target && !panel.contains(target)) {
      panel.classList.add('hidden')
    }
  })

  // 便签模式：全局屏蔽右键菜单（仅便签模式生效，避免影响其他模式）
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    if (!stickyNoteMode) return
    e.preventDefault()
    e.stopPropagation()
  }, true)

  // 库按钮内部操作
  try {
    const chooseBtn = document.getElementById('lib-choose') as HTMLButtonElement | null
    const refreshBtn = document.getElementById('lib-refresh') as HTMLButtonElement | null
    if (chooseBtn) chooseBtn.addEventListener('click', guard(async () => { await showLibraryMenu() }))
    if (refreshBtn) refreshBtn.addEventListener('click', guard(async () => { try { await refreshLibraryUiAndTree(true) } catch {} }))
  } catch {}

  // 关于弹窗：点击遮罩或“关闭”按钮关闭
  const overlay = document.getElementById('about-overlay') as HTMLDivElement | null
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) showAbout(false)
    })
    const closeBtn = document.getElementById('about-close') as HTMLButtonElement | null
    if (closeBtn) closeBtn.addEventListener('click', () => showAbout(false))
  }

  // 监听 Tauri 文件拖放（用于直接打开 .md/.markdown/.txt 文件）
  ;(async () => {
    try {
      const mod = await import('@tauri-apps/api/event')
      if (typeof mod.listen === 'function') {
        const DRAG_DROP = (mod as any)?.TauriEvent?.DRAG_DROP ?? 'tauri://drag-drop'
        await getCurrentWindow().listen(DRAG_DROP, async (ev: any) => {
          try {
            const payload: any = ev?.payload ?? ev
            // 仅在真正 drop 时处理（避免 hover/cancel 噪声）
            if (payload && typeof payload === 'object' && payload.action && payload.action !== 'drop') return
            const arr = Array.isArray(payload) ? payload : (payload?.paths || payload?.urls || payload?.files || [])
            const paths: string[] = (Array.isArray(arr) ? arr : []).map((p) => normalizePath(p))
            const md = paths.find((p) => /\.(md|markdown|txt)$/i.test(p))
            if (md) { void openFile2(md); return }
            const imgs = paths.filter((p) => /\.(png|jpe?g|gif|svg|webp|bmp|avif|ico)$/i.test(p))
            if (imgs.length > 0) {
              // 若所见 V2 激活：交由所见模式自身处理（支持拖拽到编辑区）
              if (wysiwygV2Active) {
                return
              }
              // Always-save-local: prefer local images folder for dropped files
              try {
                const alwaysLocal = await getAlwaysSaveLocalImages()
                if (alwaysLocal) {
                  const partsLocal: string[] = []
                  if (isTauriRuntime() && currentFilePath) {
                    const base = currentFilePath.replace(/[\\/][^\\/]*$/, '')
                    const sep = base.includes('\\') ? '\\' : '/'
                    const imgDir = base + sep + 'images'
                    try { await ensureDir(imgDir) } catch {}
                    for (const p of imgs) {
                      try {
                        const name = (p.split(/[\\/]+/).pop() || 'image')
                        const dst = imgDir + sep + name
                        const bytes = await readFile(p as any)
                        await writeFile(dst as any, bytes as any)
                        const needAngle = /[\s()]/.test(dst) || /^[a-zA-Z]:/.test(dst) || /\\/.test(dst)
                        const mdUrl = needAngle ? `<${dst}>` : dst
                        partsLocal.push(`![${name}](${mdUrl})`)
                      } catch {}
                    }
                    if (partsLocal.length > 0) {
                      insertAtCursor(partsLocal.join('\n'))
                      if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                      return
                    }
                  }
                }
              } catch {}
              // 若启用直连上传，优先尝试上传到 S3/R2
              try {
                const upCfg = await getUploaderConfig()
                if (upCfg) {
                  const toLabel = (p: string) => { const segs = p.split(/[\\/]+/); return segs[segs.length - 1] || 'image' }
                  const parts: string[] = []
                  for (const p of imgs) {
                    try {
                      const name = toLabel(p)
                      const mime = (() => {
                        const m = name.toLowerCase().match(/\.([a-z0-9]+)$/); const ext = m ? m[1] : ''
                        if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
                        if (ext === 'png') return 'image/png'
                        if (ext === 'gif') return 'image/gif'
                        if (ext === 'webp') return 'image/webp'
                        if (ext === 'bmp') return 'image/bmp'
                        if (ext === 'avif') return 'image/avif'
                        if (ext === 'svg') return 'image/svg+xml'
                        if (ext === 'ico') return 'image/x-icon'
                        return 'application/octet-stream'
                      })()
                      const bytes = await readFile(p as any)
                      let blob: Blob = new Blob([bytes], { type: mime })
                      let name2: string = name
                      let mime2: string = mime
                      try {
                        if (upCfg?.convertToWebp) {
                          const r = await transcodeToWebpIfNeeded(blob, name, upCfg.webpQuality ?? 0.85, { skipAnimated: true })
                          blob = r.blob
                          name2 = r.fileName
                          mime2 = r.type || 'image/webp'
                        }
                      } catch {}
                      const pub = await uploadImageToS3R2(blob, name2, mime2, upCfg)
                      parts.push(`![${name2}](${pub.publicUrl})`)
                    } catch (e) {
                      console.warn('单张图片上传失败，跳过：', p, e)
                      const needAngle = /[\s()]/.test(p) || /^[a-zA-Z]:/.test(p) || /\\/.test(p)
                      parts.push(`![${toLabel(p)}](${needAngle ? `<${p}>` : p})`)
                    }
                  }
                  insertAtCursor(parts.join('\n'))
                  if (mode === 'preview') await renderPreview(); else if (wysiwyg) scheduleWysiwygRender()
                  return
                }
              } catch (e) { console.warn('直连上传失败或未配置，回退为本地路径', e) }
              const toLabel = (p: string) => { const segs = p.split(/[\\/]+/); return segs[segs.length - 1] || 'image' }
              // 直接插入原始本地路径；预览阶段会自动转换为 asset: 以便显示
              const toMdUrl = (p: string) => {
                const needAngle = /[\s()]/.test(p) || /^[a-zA-Z]:/.test(p) || /\\/.test(p)
                return needAngle ? `<${p}>` : p
              }
              const text = imgs.map((p) => `![${toLabel(p)}](${toMdUrl(p)})`).join('\n')
              insertAtCursor(text)
              if (mode === 'preview') await renderPreview(); return
            }
          } catch (err) {
            showError('文件拖拽事件处理失败', err)
          }
        })
        await mod.listen('open-file', (ev: any) => {
          try {
            const payload = ev?.payload ?? ev
            if (typeof payload === 'string' && payload) void openFile2(payload)
          } catch (err) {
            showError('打开方式参数处理失败', err)
          }
        })
      }
    } catch {
      // 非 Tauri 环境或事件 API 不可用，忽略
    }
  })()
}

// 启动
(async () => {
  try {
    console.log('flyMD (飞速MarkDown) 应用启动...')
    try { logInfo('打点:JS启动') } catch {}

    // Linux 平台：设置不透明背景，修复 WebKitGTK/AppImage 透明窗口问题
    if (navigator.platform.toLowerCase().includes('linux')) {
      try {
        await getCurrentWindow().setBackgroundColor('#ffffff')
      } catch {
        document.body.style.background = '#ffffff'
      }
    }

    // 尝试初始化存储（确保完成后再加载扩展，避免读取不到已安装列表）
    await initStore()
    try {
      const layout = await getOutlineLayout()
      outlineLayout = layout
      applyOutlineLayout()
    } catch {}
    // 读取紧凑标题栏设置并应用
    try {
      const compact = await getCompactTitlebar()
      await setCompactTitlebar(compact, false)
    } catch {}
    await maybeAutoImportPortableBackup()
    try {
      const side = await getLibrarySide()
      await setLibrarySide(side, false)
    } catch {}
    try {
      const docked = await getLibraryDocked()
      await setLibraryDocked(docked, false)
    } catch {}

    // 开发模式：不再自动打开 DevTools，改为快捷键触发，避免干扰首屏
    // 快捷键见下方全局 keydown（F12 或 Ctrl+Shift+I）

    // 核心功能：必须执行
    refreshTitle()
    refreshStatus()
    bindEvents()  // 关键：无论存储是否成功，都要绑定事件
    initContextMenuListener()  // 初始化右键菜单监听
    // 注意：专注模式状态恢复移至便签模式检测之后，见下方
    // 依据当前语言，应用一次 UI 文案（含英文简写，避免侧栏溢出）
    try { applyI18nUi() } catch {}
    try { logInfo('打点:事件绑定完成') } catch {}

    // 性能标记：首次渲染完成
    performance.mark('flymd-first-render')

    // 绑定扩展按钮（立即绑定，但延迟加载扩展）
    try { const btnExt = document.getElementById('btn-extensions'); if (btnExt) btnExt.addEventListener('click', () => { void showExtensionsOverlay(true) }) } catch {}

    // 延迟初始化扩展系统和 WebDAV（使用 requestIdleCallback）
    const ric: any = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 100))
      ric(async () => {
        try {
          // 扩展：初始化目录并激活已启用扩展（此时 Store 已就绪）
          await ensurePluginsDir()
          // 初始化统一的"插件"菜单按钮
          initPluginsMenu()
          await loadAndActivateEnabledPlugins()
          await ensureCoreExtensionsAfterStartup()
          // 启动后后台检查一次扩展更新（仅提示，不自动更新）
          await checkPluginUpdatesOnStartup()
        } catch (e) {
          console.warn('[Extensions] 延迟初始化失败:', e)
        }
      })
    ric(async () => {
      try {
        setOnSyncComplete(async () => {
          try { await refreshLibraryUiAndTree(true) } catch (e) { console.warn('[WebDAV] 刷新库失败:', e) }
        })
        await initWebdavSync()
      } catch (e) {
        console.warn('[WebDAV] 延迟初始化失败:', e)
      }
    })
    // 开启 DevTools 快捷键（生产/开发环境均可）
    try {
      document.addEventListener('keydown', (e: KeyboardEvent) => {
        const isF12 = e.key === 'F12'
        const isCtrlShiftI = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i'
        if (isF12 || isCtrlShiftI) { e.preventDefault(); try { getCurrentWebview().openDevtools() } catch {} }
      })
    } catch {}

    // 便签模式检测：检查启动参数中是否有 --sticky-note
    let isStickyNoteStartup = false
    try {
      const cliArgs = await invoke<string[]>('get_cli_args')
      const stickyIndex = (cliArgs || []).findIndex(a => a === '--sticky-note')
      if (stickyIndex >= 0) {
        const stickyFilePath = cliArgs[stickyIndex + 1]
        if (stickyFilePath && typeof stickyFilePath === 'string') {
          isStickyNoteStartup = true
          // 延迟执行，确保 UI 初始化完成
          setTimeout(async () => {
            try { await enterStickyNoteMode(stickyFilePath) } catch (e) {
              console.error('[便签模式] 进入便签模式失败:', e)
            }
          }, 300)
        }
      }
    } catch (e) {
      console.warn('[便签模式] 检测启动参数失败:', e)
    }

    // 非便签模式启动时，检查是否有便签前保存的状态需要恢复（若存在则恢复并清除记录），并将窗口居中
    if (!isStickyNoteStartup) {
      // 1) 若存在便签前窗口状态，先恢复
      try { await restoreWindowStateBeforeSticky() } catch {}
      // 2) 兜底：窗口过小则拉回 960x640，避免残留便签尺寸
      try { await ensureMinWindowSize() } catch {}
      // 3) 兜底：强制退出专注模式并恢复原生标题栏，防止异常无标题栏状态
      try { await resetFocusModeDecorations() } catch {}
      // 4) 统一将窗口居中显示，避免位置跑偏
      try { await centerWindow() } catch {}

      // 移除透明度 CSS 变量，确保主窗口不透明
      try { document.documentElement.style.removeProperty('--sticky-opacity') } catch {}

      // 恢复源码模式状态（如果有便签前记录）
      try {
        if (store) {
          const editorState = await store.get('editorModeBeforeSticky') as { mode: string; wysiwygV2Active: boolean } | null
          if (editorState) {
            // 恢复源码模式，并清除记录
            // 注意：这里只是恢复状态变量，UI 切换会在后续文件打开时自动处理
            mode = editorState.mode as 'edit' | 'preview'
            // wysiwygV2Active 的恢复需要等 UI 加载完成后处理，这里只清除记录
            await store.delete('editorModeBeforeSticky')
            await store.save()
          }
        }
      } catch (e) {
        console.warn('[启动] 恢复源码模式状态失败:', e)
      }
    }

    // 兜底：主动询问后端是否有"默认程序/打开方式"传入的待打开路径
    try {
      const path = await invoke<string | null>('get_pending_open_path')
      if (path && typeof path === 'string') {
        void openFile2(path)
      } else {
        // macOS 兜底：通过后端命令读取启动参数，获取 Finder "打开方式"传入的文件
        try {
          const ua = navigator.userAgent || ''
          const isMac = /Macintosh|Mac OS X/i.test(ua)
          if (isMac) {
            const args = await invoke<string[]>('get_cli_args')
            const pick = (args || []).find((a) => {
              if (!a || typeof a !== 'string') return false
              const low = a.toLowerCase()
              if (low.startsWith('-psn_')) return false
              return /\.(md|markdown|txt|pdf)$/.test(low)
            })
            if (pick) { void openFile2(pick) }
          }
        } catch {}
      }
    } catch {}

    // 尝试加载最近文件（可能失败）
    try {
      void renderRecentPanel(false)
    } catch (e) {
      console.warn('最近文件面板加载失败:', e)
    }

    setTimeout(() => { try { editor.focus() } catch {}; try { logInfo('打点:可输入') } catch {} }, 0)
    // 可交互后预热常用动态模块（不阻塞首屏）
    try {
      const ric: any = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 200))
      ric(async () => {
        try {
          await Promise.allSettled([
            import('markdown-it'),
            import('dompurify'),
            import('highlight.js'),
          ])
        } catch {}
      })
    } catch {}
    // 性能标记：应用就绪
    performance.mark('flymd-app-ready')

    // 计算并输出启动性能
    try {
      const appStart = performance.getEntriesByName('flymd-app-start')[0]?.startTime || 0
      const domReady = performance.getEntriesByName('flymd-dom-ready')[0]?.startTime || 0
      const firstRender = performance.getEntriesByName('flymd-first-render')[0]?.startTime || 0
      const appReady = performance.getEntriesByName('flymd-app-ready')[0]?.startTime || 0
      console.log('[启动性能]', {
        'DOM就绪': `${(domReady - appStart).toFixed(0)}ms`,
        '首次渲染': `${(firstRender - appStart).toFixed(0)}ms`,
        '应用就绪': `${(appReady - appStart).toFixed(0)}ms`,
        '总耗时': `${(appReady - appStart).toFixed(0)}ms`
      })
    } catch {}

    console.log('应用初始化完成')
    void logInfo('flyMD (飞速MarkDown) 应用初始化完成')

    // 检查是否默认启用所见模式（便签模式下不启用，避免覆盖便签的阅读模式样式）
    try {
      const WYSIWYG_DEFAULT_KEY = 'flymd:wysiwyg:default'
      const SOURCEMODE_DEFAULT_KEY = 'flymd:sourcemode:default'
      const wysiwygDefault = localStorage.getItem(WYSIWYG_DEFAULT_KEY) === 'true'
      const sourcemodeDefault = localStorage.getItem(SOURCEMODE_DEFAULT_KEY) === 'true'
      const hasCurrentPdf = !!(currentFilePath && currentFilePath.toLowerCase().endsWith('.pdf'))

      // 若同时存在旧数据冲突，以“源码模式默认”为优先，确保语义明确；
      // 但若启动时已通过“打开方式”直接打开的是 PDF，则不要在这里强制切到所见模式，避免覆盖 PDF 预览。
      const shouldEnableWysiwyg = wysiwygDefault && !sourcemodeDefault && !hasCurrentPdf

      if (shouldEnableWysiwyg && !wysiwyg && !stickyNoteMode) {
        // 延迟一小段时间，确保编辑器已完全初始化
        setTimeout(async () => {
          try {
            await setWysiwygEnabled(true)
            console.log('[WYSIWYG] 默认启用所见模式')
          } catch (e) {
            console.error('[WYSIWYG] 默认启用所见模式失败:', e)
          }
        }, 200)
      }
    } catch (e) {
      console.error('[WYSIWYG] 检查默认所见模式设置失败:', e)
    }

    // 延迟更新检查到空闲时间（原本是 5 秒后）
    const ricUpdate: any = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 5000))
    ricUpdate(() => {
      try {
        checkUpdateSilentOnceAfterStartup()
      } catch (e) {
        console.warn('[Update] 延迟检查失败:', e)
      }
    })
  } catch (error) {
    console.error('应用启动失败:', error)
    showError('应用启动失败', error)

    // 即使启动失败，也尝试绑定基本事件
    try {
      bindEvents()
      console.log('已降级绑定基本事件')
    } catch (e) {
      console.error('事件绑定也失败了:', e)
    }
  }
})()





// 获取用户图片目录：优先使用 Tauri API，失败则基于 homeDir 猜测 Pictures
// ========= 粘贴/拖拽异步上传占位支持 =========
// 兼容入口：保留旧函数名，内部委托给核心模块
function startAsyncUploadFromFile(file: File, fname: string): Promise<void> {
  return _imageUploader.startAsyncUploadFromFile(file, fname)
}

// 获取用户图片目录：优先使用 Tauri API，失败则基于 homeDir 猜测 Pictures
async function getUserPicturesDir(): Promise<string | null> {
  try {
    const mod: any = await import('@tauri-apps/api/path')
    if (mod && typeof mod.pictureDir === 'function') {
      const p = await mod.pictureDir()
      if (p && typeof p === 'string') return p.replace(/[\\/]+$/, '')
    }
    if (mod && typeof mod.homeDir === 'function') {
      const h = await mod.homeDir()
      if (h && typeof h === 'string') {
        const base = h.replace(/[\\/]+$/, '')
        const sep = base.includes('\\') ? '\\' : '/'
        return base + sep + 'Pictures'
      }
    }
  } catch {}
  return null
}

function startAsyncUploadFromBlob(blob: Blob, fname: string, mime: string): Promise<void> {
  // NOTE: Blob 版本目前只被内部调用，保持向后兼容但委托给核心上传模块
  return _imageUploader.startAsyncUploadFromBlob(blob, fname, mime)
}
// ========= END =========

// ========== 扩展/插件：运行时与 UI ==========
type CoreExtensionState = 'pending' | 'installed' | 'blocked'
const CORE_EXT_STATE_KEY = 'coreExtensions:autoInstall'
const CORE_AI_EXTENSION_ID = 'ai-assistant'
const CORE_AI_MANIFEST_URL = 'https://raw.githubusercontent.com/flyhunterl/flymd/main/public/plugins/ai-assistant/manifest.json'

async function getCoreExtensionStateMap(): Promise<Record<string, CoreExtensionState>> {
  try {
    if (!store) return {}
    const raw = await store.get(CORE_EXT_STATE_KEY)
    if (raw && typeof raw === 'object') {
      const next: Record<string, CoreExtensionState> = {}
      for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
        if (val === 'blocked' || val === 'installed' || val === 'pending') {
          next[key] = val
        }
      }
      return next
    }
  } catch {}
  return {}
}

async function setCoreExtensionStateMap(map: Record<string, CoreExtensionState>): Promise<void> {
  try {
    if (!store) return
    await store.set(CORE_EXT_STATE_KEY, map)
    await store.save()
  } catch {}
}

async function getCoreExtensionState(id: string): Promise<CoreExtensionState> {
  const map = await getCoreExtensionStateMap()
  return map[id] ?? 'pending'
}

async function setCoreExtensionState(id: string, state: CoreExtensionState): Promise<void> {
  try {
    if (!store) return
    const map = await getCoreExtensionStateMap()
    if (map[id] === state) return
    map[id] = state
    await setCoreExtensionStateMap(map)
  } catch {}
}

async function markCoreExtensionBlocked(id: string): Promise<void> {
  await setCoreExtensionState(id, 'blocked')
}

async function ensureCoreExtensionsAfterStartup(): Promise<void> {
  await ensureAiAssistantAutoInstall()
}

async function ensureAiAssistantAutoInstall(): Promise<void> {
  try {
    if (!store) return
    const state = await getCoreExtensionState(CORE_AI_EXTENSION_ID)
    if (state === 'blocked') return
    const installed = await getInstalledPlugins()
    if (installed[CORE_AI_EXTENSION_ID]) {
      if (state !== 'installed') await setCoreExtensionState(CORE_AI_EXTENSION_ID, 'installed')
      return
    }
    await setCoreExtensionState(CORE_AI_EXTENSION_ID, 'pending')
    const rec = await installPluginFromGit(CORE_AI_MANIFEST_URL)
    await activatePlugin(rec)
    await setCoreExtensionState(CORE_AI_EXTENSION_ID, 'installed')
    try { logInfo('AI 助手扩展已自动安装') } catch {}
  } catch (error) {
    console.warn('[CoreExt] 自动安装 AI 助手失败', error)
  }
}

function pluginNotice(msg: string, level: 'ok' | 'err' = 'ok', ms?: number) {
  try {
    // 使用新的通知系统
    const type: NotificationType = level === 'ok' ? 'plugin-success' : 'plugin-error'
    NotificationManager.show(type, msg, ms)
  } catch (e) {
    // 降级：使用旧的状态栏
    try {
      const el = document.getElementById('status')
      if (el) {
        el.textContent = (level === 'ok' ? '✔ ' : '✖ ') + msg
        setTimeout(() => { try { el.textContent = '' } catch {} }, ms || 1600)
      }
    } catch {}
  }
}

async function getInstalledPlugins(): Promise<Record<string, InstalledPlugin>> {
  return await loadInstalledPlugins(store)
}

async function setInstalledPlugins(map: Record<string, InstalledPlugin>): Promise<void> {
  await saveInstalledPlugins(store, map)
}

// 插件市场：通过 extensions/market 模块实现，保留旧 API 名称
const _pluginMarket = createPluginMarket({
  getStore: () => store,
  fetchTextSmart,
})

async function getMarketUrl(): Promise<string | null> {
  return _pluginMarket.getMarketUrl()
}

type PluginMarketChannel = 'github' | 'official'

async function getMarketChannel(): Promise<PluginMarketChannel> {
  return _pluginMarket.getMarketChannel()
}

async function setMarketChannel(channel: PluginMarketChannel): Promise<void> {
  await _pluginMarket.setMarketChannel(channel)
}

async function loadInstallablePlugins(force = false): Promise<InstallableItem[]> {
  return _pluginMarket.loadInstallablePlugins(force)
}
async function installPluginFromGit(inputRaw: string, opt?: { enabled?: boolean }): Promise<InstalledPlugin> {
  return await installPluginFromGitCore(inputRaw, opt, {
    appVersion: APP_VERSION,
    store,
  })
}

// 从本地文件夹安装扩展
async function installPluginFromLocal(sourcePath: string, opt?: { enabled?: boolean }): Promise<InstalledPlugin> {
  return await installPluginFromLocalCore(sourcePath, opt, {
    appVersion: APP_VERSION,
    store,
  })
}

async function readPluginMainCode(p: InstalledPlugin): Promise<string> {
  const path = `${p.dir}/${p.main || 'main.js'}`
  return await readTextFile(path as any, { baseDir: BaseDirectory.AppLocalData } as any)
}

async function activatePlugin(p: InstalledPlugin): Promise<void> {
  if (activePlugins.has(p.id)) return
  const code = await readPluginMainCode(p)
  const dataUrl = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(code)
  const mod: any = await import(/* @vite-ignore */ dataUrl)
  const http = await getHttpClient()
  const pluginAssetsAbs = await resolvePluginInstallAbsolute(p.dir)
  async function openAiWindow() {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
      const label = 'ai-assistant-' + Math.random().toString(36).slice(2, 8)
      new WebviewWindow(label, { url: 'index.html#ai-assistant', width: 860, height: 640, title: 'AI 助手' })
    } catch (e) { console.error('openAiWindow 失败', e) }
  }
  const getSourceTextForPlugin = () => {
    try { return String(editor.value || '') } catch { return '' }
  }
  // 供插件使用的 HTML → Markdown 转换工具：按需动态加载内部转换器，避免主包体积膨胀
  const htmlToMarkdownForPlugin = async (html: string, opts?: { baseUrl?: string }): Promise<string> => {
    try {
      const raw = String(html || '')
      if (!raw.trim()) return ''
      const mod: any = await import('./html2md')
      const fn = (mod && (mod.htmlToMarkdown || mod.default)) as unknown
      if (typeof fn !== 'function') {
        console.warn(`[Plugin ${p.id}] htmlToMarkdown: 内部转换函数不可用`)
        return ''
      }
      return await (fn as (h: string, o?: any) => string)(raw, opts || {})
    } catch (e) {
      console.error(`[Plugin ${p.id}] htmlToMarkdown 失败:`, e)
      return ''
    }
  }
  // 供插件使用的 Front Matter/正文获取工具：始终基于当前源码文本即时计算，避免额外状态耦合
  const getFrontMatterForPlugin = () => {
    try {
      const src = getSourceTextForPlugin()
      const r = splitYamlFrontMatter(src)
      return r.frontMatter
    } catch {
      return null
    }
  }
  const getDocBodyForPlugin = () => {
    try {
      const src = getSourceTextForPlugin()
      const r = splitYamlFrontMatter(src)
      return r.body
    } catch {
      return getSourceTextForPlugin()
    }
  }
  const getDocMetaForPlugin = (): any | null => {
    try {
      const fm = getFrontMatterForPlugin()
      if (!fm) return null
      // 提取 YAML 内容：去掉首尾分隔线，仅保留中间部分
      let s = String(fm)
      // 去掉 BOM 与起始 ---
      s = s.replace(/^\uFEFF?---\s*\r?\n?/, '')
      // 去掉结尾 ---（行首行尾的空白一并去除）
      s = s.replace(/\r?\n---\s*$/, '')
      const doc = yamlLoad(s)
      if (!doc || typeof doc !== 'object') return null
      return doc
    } catch {
      return null
    }
  }
  const getSourceSelectionForPlugin = () => {
    try {
      const s = editor.selectionStart >>> 0
      const e = editor.selectionEnd >>> 0
      const a = Math.min(s, e)
      const b = Math.max(s, e)
      const text = getSourceTextForPlugin().slice(a, b)
      return { start: a, end: b, text }
    } catch {
      return { start: 0, end: 0, text: '' }
    }
  }
  const getLineTextForPlugin = (lineNumber: number): string => {
    try {
      const n = Number(lineNumber)
      if (!Number.isFinite(n)) return ''
      const idx = Math.max(1, Math.floor(n)) - 1
      const lines = getSourceTextForPlugin().split(/\r?\n/)
      if (idx < 0 || idx >= lines.length) return ''
      return lines[idx]
    } catch {
      return ''
    }
  }
  const notifySelectionChangeForPlugins = () => {
    try {
      const sel = getSourceSelectionForPlugin()
      for (const fn of pluginSelectionHandlers.values()) {
        if (typeof fn === 'function') {
          try { fn(sel) } catch (e) { console.error('[Plugin] onSelectionChange 失败', e) }
        }
      }
    } catch {}
  }
  const ctx = {
    http,
    // HTML 相关工具
    htmlToMarkdown: (html: string, opts?: { baseUrl?: string }) => htmlToMarkdownForPlugin(html, opts),
    invoke,
    openAiWindow,
    getAssetUrl: (relPath: string) => toPluginAssetUrl(pluginAssetsAbs, relPath),
    layout: {
      // 注册一个由宿主管理间距的 Panel（如 AI 助手侧边栏/底部面板）
      registerPanel: (panelId: string, opt: { side: PluginDockSide; size: number; visible?: boolean }): PluginDockPanelHandle => {
        try {
          const id = String(panelId || 'default')
          const key = getPluginDockKey(p.id, id)
          const side: PluginDockSide = (opt && opt.side) || 'left'
          const size = Math.max(0, Number(opt && opt.size) || 0)
          const visible = !!(opt && (typeof opt.visible === 'boolean' ? opt.visible : true))
          const state: PluginDockPanelState = { pluginId: p.id, panelId: id, side, size, visible }
          pluginDockPanels.set(key, state)
          updatePluginDockGaps()
          const handle: PluginDockPanelHandle = {
            setVisible(v: boolean) {
              const cur = pluginDockPanels.get(key)
              if (!cur) return
              cur.visible = !!v
              pluginDockPanels.set(key, cur)
              updatePluginDockGaps()
            },
            setSide(s: PluginDockSide) {
              const cur = pluginDockPanels.get(key)
              if (!cur) return
              cur.side = s
              pluginDockPanels.set(key, cur)
              updatePluginDockGaps()
            },
            setSize(sz: number) {
              const cur = pluginDockPanels.get(key)
              if (!cur) return
              cur.size = Math.max(0, Number(sz) || 0)
              pluginDockPanels.set(key, cur)
              updatePluginDockGaps()
            },
            update(opt2: { side?: PluginDockSide; size?: number; visible?: boolean }) {
              const cur = pluginDockPanels.get(key)
              if (!cur) return
              if (opt2.side) cur.side = opt2.side
              if (typeof opt2.size === 'number') cur.size = Math.max(0, Number(opt2.size) || 0)
              if (typeof opt2.visible === 'boolean') cur.visible = opt2.visible
              pluginDockPanels.set(key, cur)
              updatePluginDockGaps()
            },
            dispose() {
              pluginDockPanels.delete(key)
              updatePluginDockGaps()
            }
          }
          return handle
        } catch {
          const noop: PluginDockPanelHandle = {
            setVisible: () => {},
            setSide: () => {},
            setSize: () => {},
            update: () => {},
            dispose: () => {}
          }
          return noop
        }
      }
    },
    storage: {
      get: async (key: string) => {
        try { if (!store) return null; const all = (await store.get('plugin:' + p.id)) as any || {}; return all[key] } catch { return null }
      },
      set: async (key: string, value: any) => { try { if (!store) return; const all = (await store.get('plugin:' + p.id)) as any || {}; all[key] = value; await store.set('plugin:' + p.id, all); await store.save() } catch {} }
    },
    addMenuItem: (opt: { label: string; title?: string; onClick?: () => void; children?: any[] }) => {
      try {
        if (pluginMenuAdded.get(p.id)) return () => {}
        pluginMenuAdded.set(p.id, true)

        // 检查是否独立显示在菜单栏
        if (p.showInMenuBar) {
          // 独立显示：添加到菜单栏（原有逻辑）
          const bar = document.querySelector('.menubar') as HTMLDivElement | null
          if (!bar) return () => {}

          const el = document.createElement('div')
          el.className = 'menu-item'
          el.textContent = (p.id === 'typecho-publisher-flymd') ? '发布' : (opt.label || '扩展')
          if (opt.title) el.title = opt.title

          // 支持下拉菜单
          if (opt.children && opt.children.length > 0) {
            el.addEventListener('click', (ev) => {
              ev.preventDefault()
              ev.stopPropagation()
              try {
                togglePluginDropdown(el, opt.children || [])
              } catch (e) { console.error(e) }
            })
          } else {
            el.addEventListener('click', (ev) => {
              ev.preventDefault()
              ev.stopPropagation()
              try { opt.onClick && opt.onClick() } catch (e) { console.error(e) }
            })
          }

          bar.appendChild(el)
          return () => { try { el.remove() } catch {} }
        } else {
          // 收纳到"插件"菜单
          addToPluginsMenu(p.id, {
            label: opt.label || '扩展',
            onClick: opt.onClick,
            children: opt.children
          })
          return () => { removeFromPluginsMenu(p.id) }
        }
      } catch { return () => {} }
    },
    ui: {
      // 简化的通知方法（向后兼容）
      notice: (msg: string, level?: 'ok' | 'err', ms?: number) => pluginNotice(msg, level, ms),
      // 完整的通知 API
      showNotification: (message: string, options?: { type?: 'success' | 'error' | 'info', duration?: number, onClick?: () => void }) => {
        try {
          const opt = options || {}
          let notifType: NotificationType = 'plugin-success'
          if (opt.type === 'error') notifType = 'plugin-error'
          else if (opt.type === 'info') notifType = 'extension'
          else notifType = 'plugin-success'

          return NotificationManager.show(notifType, message, opt.duration, opt.onClick)
        } catch (e) {
          console.error('[Plugin] showNotification 失败', e)
          return ''
        }
      },
      // 隐藏通知
      hideNotification: (id: string) => {
        try {
          NotificationManager.hide(id)
        } catch (e) {
          console.error('[Plugin] hideNotification 失败', e)
        }
      },
      // 确认对话框
      confirm: async (message: string) => { try { return await confirmNative(message, '确认') } catch { return false } }
    },
    // 当前文件相关
    getCurrentFilePath: () => {
      try {
        return currentFilePath
      } catch {
        return null
      }
    },
    getEditorValue: () => getSourceTextForPlugin(),
    setEditorValue: (v: string) => { try { editor.value = v; dirty = true; refreshTitle(); refreshStatus(); if (mode === 'preview') { void renderPreview() } else if (wysiwyg) { scheduleWysiwygRender() } } catch {} },
    getSelection: () => getSourceSelectionForPlugin(),
    getSelectedMarkdown: () => getSourceSelectionForPlugin().text,
    getSourceText: () => getSourceTextForPlugin(),
    // Front Matter / 元数据相关 API：若文首未使用标准头部写法，则返回 null 或原始全文
    getFrontMatterRaw: () => getFrontMatterForPlugin(),
    getDocBody: () => getDocBodyForPlugin(),
    getDocMeta: () => getDocMetaForPlugin(),
    getLineText: (lineNumber: number) => getLineTextForPlugin(lineNumber),
    replaceRange: (start: number, end: number, text: string) => { try { const v = String(editor.value || ''); const a = Math.max(0, Math.min(start >>> 0, end >>> 0)); const b = Math.max(start >>> 0, end >>> 0); editor.value = v.slice(0, a) + String(text || '') + v.slice(b); const caret = a + String(text || '').length; editor.selectionStart = editor.selectionEnd = caret; dirty = true; refreshTitle(); refreshStatus(); if (mode === 'preview') { void renderPreview() } else if (wysiwyg) { scheduleWysiwygRender() } } catch {} },
    insertAtCursor: (text: string) => { try { const s = editor.selectionStart >>> 0; const e = editor.selectionEnd >>> 0; const a = Math.min(s, e); const b = Math.max(s, e); const v = String(editor.value || ''); editor.value = v.slice(0, a) + String(text || '') + v.slice(b); const caret = a + String(text || '').length; editor.selectionStart = editor.selectionEnd = caret; dirty = true; refreshTitle(); refreshStatus(); if (mode === 'preview') { void renderPreview() } else if (wysiwyg) { scheduleWysiwygRender() } } catch {} },
    // 按绝对路径读取本地二进制文件（主要用于 PDF / 图片等）
    readFileBinary: async (absPath: string) => {
      try {
        const p = String(absPath || '').trim()
        if (!p) {
          throw new Error('absPath 不能为空')
        }
        const bytes = await readFile(p as any)
        if (bytes instanceof Uint8Array) return bytes
        if (Array.isArray(bytes)) return new Uint8Array(bytes as any)
        if ((bytes as any)?.buffer instanceof ArrayBuffer) return new Uint8Array((bytes as any).buffer)
        throw new Error('无法解析文件字节数据')
      } catch (e) {
        console.error(`[Plugin ${p.id}] readFileBinary 失败:`, e)
        throw e
      }
    },
    openFileByPath: async (path: string) => {
      try { await openFile2(path) } catch (e) { console.error('plugin openFileByPath 失败', e); throw e }
    },
    createStickyNote: async (filePath: string) => {
      try {
        const fn = (window as any).flymdCreateStickyNote
        if (typeof fn !== 'function') {
          throw new Error('当前环境不支持便签功能')
        }
        await fn(filePath)
      } catch (e) {
        console.error('plugin createStickyNote 失败', e)
        throw e
      }
    },
    exportCurrentToPdf: async (target: string) => {
      try { await exportCurrentDocToPdf(target) } catch (e) { console.error('plugin exportCurrentToPdf 失败', e); throw e }
    },
    pickDirectory: async (opt?: { defaultPath?: string }) => {
      try {
        if (typeof open !== 'function') {
          alert('目录选择功能需要在桌面版中使用')
          return ''
        }
        const picked = await open({
          directory: true,
          defaultPath: opt && opt.defaultPath ? opt.defaultPath : undefined
        } as any)
        const dir = (typeof picked === 'string') ? picked : ((picked as any)?.path || '')
        return dir ? String(dir) : ''
      } catch (e) {
        console.error('plugin pickDirectory 失败', e)
        return ''
      }
    },
    pickDocFiles: async (opt?: { multiple?: boolean }) => {
      try {
        if (typeof open !== 'function') {
          alert('文件打开功能需要在 Tauri 应用中使用')
          return [] as string[]
        }
        const sel = await open({
          multiple: !!(opt && opt.multiple),
          filters: [
            { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
          ]
        })
        if (!sel) return [] as string[]
        if (Array.isArray(sel)) return sel.map(x => String(x || ''))
        return [String(sel)]
      } catch (e) {
        console.error('plugin pickDocFiles 失败', e)
        return [] as string[]
      }
    },
    addContextMenuItem: (config: ContextMenuItemConfig) => {
      try {
        // 注册右键菜单项
        pluginContextMenuItems.push({
          pluginId: p.id,
          config: config
        })

        // 返回移除函数
        return () => {
          try {
            const index = pluginContextMenuItems.findIndex(
              item => item.pluginId === p.id && item.config === config
            )
            if (index >= 0) {
              pluginContextMenuItems.splice(index, 1)
            }
          } catch {}
        }
      } catch {
        return () => {}
      }
    },
    // 插件间通信 API
    registerAPI: (namespace: string, api: any) => {
      try {
        if (!namespace || typeof namespace !== 'string') {
          console.warn(`[Plugin ${p.id}] registerAPI: namespace 必须是非空字符串`)
          return
        }

        // 检查命名空间是否已被占用
        const existing = pluginAPIRegistry.get(namespace)
        if (existing && existing.pluginId !== p.id) {
          console.warn(
            `[Plugin ${p.id}] registerAPI: 命名空间 "${namespace}" 已被插件 "${existing.pluginId}" 占用，` +
            `请使用不同的命名空间或卸载冲突的插件`
          )
          return
        }

        // 注册 API
        pluginAPIRegistry.set(namespace, {
          pluginId: p.id,
          api: api
        })

        console.log(`[Plugin ${p.id}] 已注册 API: ${namespace}`)
      } catch (e) {
        console.error(`[Plugin ${p.id}] registerAPI 失败:`, e)
      }
    },
      getPluginAPI: (namespace: string) => {
        try {
          if (!namespace || typeof namespace !== 'string') {
            console.warn(`[Plugin ${p.id}] getPluginAPI: namespace 必须是非空字符串`)
            return null
          }

          const record = pluginAPIRegistry.get(namespace)
          if (!record) {
            return null
          }

          return record.api
        } catch (e) {
          console.error(`[Plugin ${p.id}] getPluginAPI 失败:`, e)
          return null
        }
      },
      // 编辑器源码选区变化监听（供协同等高级插件使用）
      onSelectionChange: (listener: ((sel: { start: number; end: number; text: string }) => void) | null) => {
        try {
          if (!listener) {
            pluginSelectionHandlers.delete(p.id)
          } else {
            pluginSelectionHandlers.set(p.id, listener)
          }
       } catch {}
      },
     // 获取预览 DOM 元素（用于导出等功能）
     getPreviewElement: () => {
       try {
         return preview.querySelector('.preview-body') as HTMLElement | null
       } catch (e) {
         console.error(`[Plugin ${p.id}] getPreviewElement 失败:`, e)
         return null
       }
     },
     // 读取本地图片并返回 data URL，供视觉类插件使用
     readImageAsDataUrl: async (absPath: string) => {
       try {
         if (typeof readFile !== 'function') {
           throw new Error('读取图片功能需要在 Tauri 应用中使用')
         }
         const abs = String(absPath || '').trim()
         if (!abs) {
           throw new Error('absPath 不能为空')
         }
         const bytes = await readFile(abs as any)
         const mime = (() => {
           const m = abs.toLowerCase().match(/\.([a-z0-9]+)$/)
           switch (m?.[1]) {
             case 'jpg':
             case 'jpeg': return 'image/jpeg'
             case 'png': return 'image/png'
             case 'gif': return 'image/gif'
             case 'webp': return 'image/webp'
             case 'bmp': return 'image/bmp'
             case 'avif': return 'image/avif'
             case 'ico': return 'image/x-icon'
             case 'svg': return 'image/svg+xml'
             default: return 'application/octet-stream'
           }
         })()
         const blob = new Blob([bytes], { type: mime })
         const dataUrl = await new Promise<string>((resolve, reject) => {
           try {
             const fr = new FileReader()
             fr.onerror = () => reject(fr.error || new Error('读取图片失败'))
             fr.onload = () => resolve(String(fr.result || ''))
             fr.readAsDataURL(blob)
           } catch (e) { reject(e as any) }
         })
         return dataUrl
       } catch (e) {
         console.error(`[Plugin ${p.id}] readImageAsDataUrl 失败:`, e)
         throw e
       }
     },
     // 弹出保存对话框并保存二进制文件
     saveFileWithDialog: async (opt: { filters?: Array<{ name: string, extensions: string[] }>, data: Uint8Array, defaultName?: string }) => {
       try {
         if (typeof save !== 'function' || typeof writeFile !== 'function') {
           throw new Error('文件保存功能需要在 Tauri 应用中使用')
        }
        if (!opt || !opt.data) {
          throw new Error('缺少 data 参数')
        }
        const target = await save({
          filters: opt.filters || [{ name: '所有文件', extensions: ['*'] }],
          defaultPath: opt.defaultName
        })
        if (!target) {
          return null // 用户取消
        }
        await writeFile(target as any, opt.data as any)
        return target as string
      } catch (e) {
        console.error(`[Plugin ${p.id}] saveFileWithDialog 失败:`, e)
        throw e
      }
    },
  }
  try { (window as any).__pluginCtx__ = (window as any).__pluginCtx__ || {}; (window as any).__pluginCtx__[p.id] = ctx } catch {}
  if (typeof mod?.activate === 'function') {
    await mod.activate(ctx)
  }
  activePlugins.set(p.id, mod)
}

async function deactivatePlugin(id: string): Promise<void> {
  const mod = activePlugins.get(id)
  if (!mod) return
  try { if (typeof mod?.deactivate === 'function') await mod.deactivate() } catch {}
  activePlugins.delete(id)
  try { pluginMenuAdded.delete(id) } catch {}
  // 移除插件注册的右键菜单项
  try {
    for (let i = pluginContextMenuItems.length - 1; i >= 0; i--) {
      if (pluginContextMenuItems[i]?.pluginId === id) {
        pluginContextMenuItems.splice(i, 1)
      }
    }
  } catch {}
  // 移除插件注册的布局 Panel
  try {
    const keysToDelete: string[] = []
    for (const [key, panel] of pluginDockPanels.entries()) {
      if (panel.pluginId === id) {
        keysToDelete.push(key)
      }
    }
    for (const key of keysToDelete) {
      pluginDockPanels.delete(key)
    }
    updatePluginDockGaps()
  } catch {}
  // 移除插件注册的所有 API
  try {
    const namespacesToRemove: string[] = []
    for (const [namespace, record] of pluginAPIRegistry.entries()) {
      if (record.pluginId === id) {
        namespacesToRemove.push(namespace)
      }
    }
    for (const namespace of namespacesToRemove) {
      pluginAPIRegistry.delete(namespace)
      console.log(`[Plugin ${id}] 已移除 API: ${namespace}`)
    }
  } catch {}
}

  // 启动时扩展更新检查：仅在应用启动后后台检查一次
  async function checkPluginUpdatesOnStartup(): Promise<void> {
    try {
      if (!store) return
      // 只在有安装的扩展且带版本号时才进行检查
      const installedMap = await getInstalledPlugins()
      const installedArr = Object.values(installedMap).filter((p) => !!p && !!p.version)
      if (!installedArr.length) return

      let marketItems: InstallableItem[] = []
      try {
        marketItems = await loadInstallablePlugins(false)
      } catch {
        marketItems = FALLBACK_INSTALLABLES.slice()
      }
      if (!marketItems.length) return

      const updateMap = await getPluginUpdateStates(installedArr, marketItems)
      const ids = Object.keys(updateMap || {})
      if (!ids.length) return

      const updatedPlugins = ids
        .map((id) => installedMap[id])
        .filter((p): p is InstalledPlugin => !!p)

      if (!updatedPlugins.length) return

      // 构造提示文案（保持多语言）
      const names = updatedPlugins.map((p) => String(p.name || p.id || '')).filter(Boolean)
      if (!names.length) return

      let msg = ''
      if (names.length === 1) {
        msg = t('ext.update.notice.single')
          .replace('{name}', names[0])
      } else {
        const joined = names.slice(0, 3).join('、')
        msg = t('ext.update.notice.multi')
          .replace('{count}', String(names.length))
          .replace('{names}', joined + (names.length > 3 ? '…' : ''))
      }

      try {
        // 使用新的通知系统显示扩展更新通知（5秒后自动消失）
        NotificationManager.show('extension', msg, 5000)
      } catch {}
    } catch (e) {
      console.warn('[Extensions] 启动扩展更新检查失败', e)
    }
  }

// ���°�װָ��������չ���������״̬
async function updateInstalledPlugin(p: InstalledPlugin, info: PluginUpdateState): Promise<InstalledPlugin> {
  const enabled = !!p.enabled
  try { await deactivatePlugin(p.id) } catch {}
  try { await removeDirRecursive(p.dir) } catch {}
  const rec = await installPluginFromGit(info.manifestUrl, { enabled })
  try {
    if (enabled) await activatePlugin(rec)
  } catch {}
  return rec
}

// 创建扩展市场加载指示器
function createLoadingIndicator(): HTMLElement {
  const container = document.createElement('div')
  container.className = 'ext-loading'

  const spinner = document.createElement('div')
  spinner.className = 'ext-loading-spinner'

  const text = document.createElement('div')
  text.className = 'ext-loading-text'
  text.textContent = t('ext.market.loading')

  container.appendChild(spinner)
  container.appendChild(text)

  return container
}

// 仅刷新“已安装扩展”区块（避免每次操作都重建市场列表）
async function refreshInstalledExtensionsUI(): Promise<void> {
  try {
    if (!_extListHost) return
    const host = _extListHost
    const unifiedList = host.querySelector('.ext-list') as HTMLDivElement | null
    if (!unifiedList) return

    let installedMap: Record<string, InstalledPlugin> = {}
    try {
      installedMap = await getInstalledPlugins()
    } catch {
      installedMap = {}
    }

    const arr = Object.values(installedMap)
    let updateMap: Record<string, PluginUpdateState> = {}
    if (arr.length > 0 && _extLastMarketItems && _extLastMarketItems.length > 0) {
      try {
        updateMap = await getPluginUpdateStates(arr, _extLastMarketItems)
      } catch {
        updateMap = {}
      }
    }

    renderInstalledExtensions(unifiedList, installedMap, updateMap)
  } catch {}
}

// 渲染“已安装扩展”区块（统一复用，支持局部刷新）
function renderInstalledExtensions(
  unifiedList: HTMLDivElement,
  installedMap: Record<string, InstalledPlugin>,
  updateMap: Record<string, PluginUpdateState>
): void {
  try {
    const installedRows = unifiedList.querySelectorAll('[data-type=\"installed\"]')
    installedRows.forEach((row) => row.remove())
  } catch {}

  // 根据当前搜索关键字过滤已安装扩展（名称 / id / 描述）
  const keywordRaw = (_extMarketSearchText || '').trim().toLowerCase()
  let arr = Object.values(installedMap).filter((p) => {
    if (!keywordRaw) return true
    try {
      const parts: string[] = []
      if (p.name) parts.push(String(p.name))
      if (p.id) parts.push(String(p.id))
      if (p.description) parts.push(String(p.description))
      const hay = parts.join(' ').toLowerCase()
      return hay.includes(keywordRaw)
    } catch {
      // 出现异常时，不要因为搜索直接把条目干掉
      return true
    }
  })

  // “可更新”过滤：仅显示有更新版本的已安装扩展
  if (_extUpdatesOnly) {
    arr = arr.filter((p) => !!updateMap[p.id])
  }

  // 排序规则：按名称首字母 A-Z 排序（与市场保持一致，不受安装顺序影响）
  arr = arr.slice().sort((a, b) => {
    const na = String(a?.name || a?.id || '')
    const nb = String(b?.name || b?.id || '')
    // 优先使用统一 order 值，其次按名称 A-Z
    const oa = getPluginOrder(a.id, na)
    const ob = getPluginOrder(b.id, nb)
    if (oa !== ob) return oa - ob
    return na.localeCompare(nb, 'en', { sensitivity: 'base' })
  })

  for (const p of arr) {
    const row = document.createElement('div')
    row.className = 'ext-item'
    row.setAttribute('data-type', 'installed')
    try { row.style.order = String(getPluginOrder(p.id, p.name || p.id)) } catch {}
    const meta = document.createElement('div'); meta.className = 'ext-meta'
    const name = document.createElement('div'); name.className = 'ext-name'
    const nameText = document.createElement('span')
    const fullName = `${p.name || p.id} ${p.version ? '(' + p.version + ')' : ''}`
    nameText.textContent = fullName
    nameText.title = fullName  // 悬浮显示完整名称
    name.appendChild(nameText)
    const installedTag = document.createElement('span')
    installedTag.className = 'ext-tag'
    installedTag.textContent = '已安装'
    installedTag.style.marginLeft = 'auto'
    installedTag.style.color = '#22c55e'
    name.appendChild(installedTag)
    const updateInfo = updateMap[p.id]
    if (updateInfo) {
      const badge = document.createElement('span'); badge.className = 'ext-update-badge'; badge.textContent = 'UP'
      name.appendChild(badge)
    }
    const desc = document.createElement('div'); desc.className = 'ext-desc'; desc.textContent = p.description || p.dir
    meta.appendChild(name); meta.appendChild(desc)
    const actions = document.createElement('div'); actions.className = 'ext-actions'
    // 独立显示开关
    const showToggleLabel = document.createElement('label')
    showToggleLabel.className = 'ext-show-toggle'
    showToggleLabel.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;margin-right:8px'
    const showToggleCheckbox = document.createElement('input')
    showToggleCheckbox.type = 'checkbox'
    showToggleCheckbox.checked = !!p.showInMenuBar
    showToggleCheckbox.style.cursor = 'pointer'
    showToggleCheckbox.addEventListener('change', async (e) => {
      try {
        const checked = (e.target as HTMLInputElement).checked
        p.showInMenuBar = checked
        installedMap[p.id] = p
        await setInstalledPlugins(installedMap)
        // 重新激活插件以应用变更
        if (p.enabled) {
          await deactivatePlugin(p.id)
          await activatePlugin(p)
        }
        pluginNotice(checked ? '已设置为独立显示' : '已收纳到插件菜单', 'ok', 1500)
      } catch (err) {
        showError('切换显示模式失败', err)
      }
    })
    const showToggleText = document.createElement('span')
    showToggleText.textContent = '独立显示'
    showToggleText.style.fontSize = '12px'
    showToggleLabel.appendChild(showToggleCheckbox)
    showToggleLabel.appendChild(showToggleText)
    actions.appendChild(showToggleLabel)

    if (p.enabled) {
      const btnSet = document.createElement('button'); btnSet.className = 'btn'; btnSet.textContent = t('ext.settings')
      btnSet.addEventListener('click', async () => {
        try {
          const mod = activePlugins.get(p.id)
          const http = await getHttpClient()
          const ctx = {
            http,
            invoke,
            storage: {
              get: async (key: string) => { try { if (!store) return null; const all = (await store.get('plugin:' + p.id)) as any || {}; return all[key] } catch { return null } },
              set: async (key: string, value: any) => { try { if (!store) return; const all = (await store.get('plugin:' + p.id)) as any || {}; all[key] = value; await store.set('plugin:' + p.id, all); await store.save() } catch {} }
            },
            ui: {
              notice: (msg: string, level?: 'ok' | 'err', ms?: number) => pluginNotice(msg, level, ms),
              showNotification: (message: string, options?: { type?: 'success' | 'error' | 'info', duration?: number, onClick?: () => void }) => {
                try {
                  const opt = options || {}
                  let notifType: NotificationType = 'plugin-success'
                  if (opt.type === 'error') notifType = 'plugin-error'
                  else if (opt.type === 'info') notifType = 'extension'
                  else notifType = 'plugin-success'
                  return NotificationManager.show(notifType, message, opt.duration, opt.onClick)
                } catch (err) {
                  console.error('[Plugin] showNotification 失败', err)
                  return ''
                }
              },
              hideNotification: (id: string) => {
                try {
                  NotificationManager.hide(id)
                } catch (err) {
                  console.error('[Plugin] hideNotification 失败', err)
                }
              },
              confirm: async (m: string) => { try { return await confirmNative(m) } catch { return false } }
            },
            getEditorValue: () => editor.value,
            setEditorValue: (v: string) => {
              try {
                editor.value = v
                dirty = true
                refreshTitle()
                refreshStatus()
                if (mode === 'preview') { void renderPreview() } else if (wysiwyg) { scheduleWysiwygRender() }
              } catch {}
            },
          }
          if (mod && typeof mod.openSettings === 'function') { await mod.openSettings(ctx) }
          else pluginNotice(t('ext.settings.notProvided'), 'err', 1600)
        } catch (err) { showError(t('ext.settings.openFail'), err) }
      })
      actions.appendChild(btnSet)
    }

    const btnToggle = document.createElement('button'); btnToggle.className = 'btn'; btnToggle.textContent = p.enabled ? t('ext.toggle.disable') : t('ext.toggle.enable')
    btnToggle.addEventListener('click', async () => {
      try {
        p.enabled = !p.enabled
        installedMap[p.id] = p
        await setInstalledPlugins(installedMap)
        if (p.enabled) await activatePlugin(p)
        else await deactivatePlugin(p.id)
        await refreshInstalledExtensionsUI()
      } catch (err) { showError(t('ext.toggle.fail'), err) }
    })
    const info = updateMap[p.id]
    if (info) {
      const btnUpdate = document.createElement('button'); btnUpdate.className = 'btn'; btnUpdate.textContent = t('ext.update.btn')
      btnUpdate.addEventListener('click', async () => {
        try {
          btnUpdate.textContent = t('ext.update.btn') + '...'; (btnUpdate as HTMLButtonElement).disabled = true
          await updateInstalledPlugin(p, info)
          await refreshInstalledExtensionsUI()
          pluginNotice(t('ext.update.ok'), 'ok', 1500)
        } catch (err) {
          try { btnUpdate.textContent = t('ext.update.btn') } catch {}
          try { (btnUpdate as HTMLButtonElement).disabled = false } catch {}
          showError(t('ext.update.fail'), err)
        }
      })
      actions.appendChild(btnUpdate)
    }
    const btnRemove = document.createElement('button'); btnRemove.className = 'btn warn'; btnRemove.textContent = t('ext.remove')
    btnRemove.addEventListener('click', async () => {
      const ok = await confirmNative(t('ext.remove.confirm', { name: p.name || p.id }))
      if (!ok) return
      try {
        await deactivatePlugin(p.id)
        await removeDirRecursive(p.dir)
        delete installedMap[p.id]; await setInstalledPlugins(installedMap)
        if (p.id === CORE_AI_EXTENSION_ID) {
          await markCoreExtensionBlocked(p.id)
        }
        await refreshExtensionsUI()
        pluginNotice(t('ext.removed'), 'ok', 1200)
      } catch (err) { showError(t('ext.remove.fail'), err) }
    })
    actions.appendChild(btnToggle)
    actions.appendChild(btnRemove)
    row.appendChild(meta); row.appendChild(actions)
    unifiedList.appendChild(row)
  }
}

async function refreshExtensionsUI(): Promise<void> {
  if (!_extListHost) return
  const host = _extListHost
  host.innerHTML = ''

  // 1) 创建统一的扩展列表容器
  const unifiedSection = document.createElement('div')
  unifiedSection.className = 'ext-section'
  const hd = document.createElement('div')
  hd.className = 'ext-subtitle'
  const hdText = document.createElement('span')
  hdText.textContent = '扩展管理'
  hd.appendChild(hdText)

  // 优雅的加载指示器（小型 spinner）
  const loadingSpinner = document.createElement('span')
  loadingSpinner.className = 'ext-loading-spinner'
  loadingSpinner.style.cssText = 'display:inline-block;width:14px;height:14px;border:2px solid rgba(127,127,127,0.2);border-top-color:#2563eb;border-radius:50%;animation:ext-spin 0.8s linear infinite;margin-left:10px'
  hd.appendChild(loadingSpinner)

  // 仅显示已安装开关
  const installedOnlyWrap = document.createElement('label')
  installedOnlyWrap.className = 'ext-market-channel'
  installedOnlyWrap.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer'
  const installedOnlyCheckbox = document.createElement('input')
  installedOnlyCheckbox.type = 'checkbox'
  installedOnlyCheckbox.id = 'ext-installed-only'
  installedOnlyCheckbox.checked = false
  installedOnlyCheckbox.style.cursor = 'pointer'
  installedOnlyCheckbox.addEventListener('change', () => {
    void applyMarketFilter()
  })
  const installedOnlyLabel = document.createElement('span')
  installedOnlyLabel.textContent = '已安装'
  installedOnlyLabel.style.fontSize = '12px'
  installedOnlyWrap.appendChild(installedOnlyCheckbox)
  installedOnlyWrap.appendChild(installedOnlyLabel)
  hd.appendChild(installedOnlyWrap)

  // 仅显示“可更新”的已安装扩展
  const updatesOnlyWrap = document.createElement('label')
  updatesOnlyWrap.className = 'ext-market-channel'
  updatesOnlyWrap.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer'
  const updatesOnlyCheckbox = document.createElement('input')
  updatesOnlyCheckbox.type = 'checkbox'
  updatesOnlyCheckbox.id = 'ext-updates-only'
  updatesOnlyCheckbox.checked = _extUpdatesOnly
  updatesOnlyCheckbox.style.cursor = 'pointer'
  updatesOnlyCheckbox.addEventListener('change', () => {
    _extUpdatesOnly = updatesOnlyCheckbox.checked
    void (async () => {
      try { await refreshInstalledExtensionsUI() } catch {}
      try { await applyMarketFilter() } catch {}
    })()
  })
  const updatesOnlyLabel = document.createElement('span')
  updatesOnlyLabel.textContent = '可更新'
  updatesOnlyLabel.style.fontSize = '12px'
  updatesOnlyWrap.appendChild(updatesOnlyCheckbox)
  updatesOnlyWrap.appendChild(updatesOnlyLabel)
  hd.appendChild(updatesOnlyWrap)

  // 渠道选择：GitHub / 官网
  const channelWrap = document.createElement('div')
  channelWrap.className = 'ext-market-channel'
  const channelLabel = document.createElement('span')
  channelLabel.className = 'ext-market-channel-label'
  channelLabel.textContent = t('ext.market.channel')
  const channelSelect = document.createElement('select')
  channelSelect.className = 'ext-market-channel-select'
  const optGithub = document.createElement('option')
  optGithub.value = 'github'
  optGithub.textContent = t('ext.market.channel.github')
  const optOfficial = document.createElement('option')
  optOfficial.value = 'official'
  optOfficial.textContent = t('ext.market.channel.official')
  channelSelect.appendChild(optGithub)
  channelSelect.appendChild(optOfficial)
  ;(async () => {
    try {
      const ch = await getMarketChannel()
      channelSelect.value = ch === 'official' ? 'official' : 'github'
    } catch {
      channelSelect.value = 'github'
    }
  })()
  channelSelect.addEventListener('change', () => {
    const v = channelSelect.value === 'official' ? 'official' : 'github'
    void (async () => {
      await setMarketChannel(v)
      await loadInstallablePlugins(true)
      await refreshExtensionsUI()
    })()
  })
  channelWrap.appendChild(channelLabel)
  channelWrap.appendChild(channelSelect)
  hd.appendChild(channelWrap)

  const searchWrap = document.createElement('div'); searchWrap.className = 'ext-market-search'
  const searchInput = document.createElement('input'); searchInput.type = 'text'; searchInput.className = 'ext-market-search-input'
  searchInput.placeholder = t('ext.market.search.placeholder')
  if (_extMarketSearchText) searchInput.value = _extMarketSearchText
  searchInput.addEventListener('input', () => {
    _extMarketSearchText = searchInput.value || ''
    // 搜索变化时，同时刷新“已安装扩展”与“市场扩展”两个区块
    void (async () => {
      try { await refreshInstalledExtensionsUI() } catch {}
      try { await applyMarketFilter() } catch {}
    })()
  })
  searchWrap.appendChild(searchInput)
  hd.appendChild(searchWrap)

  const btnRefresh = document.createElement('button'); btnRefresh.className = 'btn'; btnRefresh.textContent = t('ext.refresh')
  btnRefresh.addEventListener('click', async () => {
    try {
      (btnRefresh as HTMLButtonElement).disabled = true
      await loadInstallablePlugins(true)
      await refreshExtensionsUI()
    } finally {
      (btnRefresh as HTMLButtonElement).disabled = false
    }
  })
  hd.appendChild(btnRefresh)
  unifiedSection.appendChild(hd)

  // 统一的扩展列表
  const unifiedList = document.createElement('div')
  unifiedList.className = 'ext-list'
  unifiedSection.appendChild(unifiedList)
  host.appendChild(unifiedSection)

  // 2) 填充 Builtins（仅依赖本地 Store，不走网络）
  for (const b of builtinPlugins) {
    const row = document.createElement('div')
    row.className = 'ext-item'
    row.setAttribute('data-type', 'builtin')
    try { row.style.order = String(getPluginOrder(b.id, b.name, -1000)) } catch {}
    const meta = document.createElement('div'); meta.className = 'ext-meta'
    const name = document.createElement('div'); name.className = 'ext-name'
    const nameText = document.createElement('span')
    const fullName = `${b.name} (${b.version})`
    nameText.textContent = fullName
    nameText.title = fullName  // 悬浮显示完整名称
    name.appendChild(nameText)
    const builtinTag = document.createElement('span')
    builtinTag.className = 'ext-tag'
    builtinTag.textContent = '内置'
    builtinTag.style.marginLeft = '8px'
    builtinTag.style.color = '#3b82f6'
    name.appendChild(builtinTag)
    const desc = document.createElement('div'); desc.className = 'ext-desc'; desc.textContent = b.description || ''
    meta.appendChild(name); meta.appendChild(desc)
    const actions = document.createElement('div'); actions.className = 'ext-actions'
    if (b.id === 'uploader-s3') {
      try {
        const upCfg = await (async () => { try { if (store) return (await store.get('uploader')) as any } catch { return null } })()
        const tag = document.createElement('span'); tag.className = 'ext-tag'; tag.textContent = upCfg?.enabled ? t('ext.enabled.tag.on') : t('ext.enabled.tag.off')
        tag.style.opacity = '0.75'; tag.style.marginRight = '8px'; tag.style.color = upCfg?.enabled ? '#22c55e' : '#94a3b8'
        actions.appendChild(tag)
      } catch {}
      const btn = document.createElement('button'); btn.className = 'btn primary'; btn.textContent = t('ext.settings')
      btn.addEventListener('click', () => { try { void showExtensionsOverlay(false); void openUploaderDialog() } catch {} })
      actions.appendChild(btn)
    } else if (b.id === 'webdav-sync') {
      try {
        const cfg = await getWebdavSyncConfig()
        const tag = document.createElement('span'); tag.className = 'ext-tag'; tag.textContent = cfg.enabled ? t('ext.enabled.tag.on') : t('ext.enabled.tag.off')
        tag.style.opacity = '0.75'; tag.style.marginRight = '8px'; tag.style.color = cfg.enabled ? '#22c55e' : '#94a3b8'
        actions.appendChild(tag)
      } catch {}
      const btn2 = document.createElement('button'); btn2.className = 'btn primary'; btn2.textContent = t('ext.settings')
      btn2.addEventListener('click', () => { try { void showExtensionsOverlay(false); void openWebdavSyncDialog() } catch {} })
      actions.appendChild(btn2)
    }
    row.appendChild(meta); row.appendChild(actions)
    unifiedList.appendChild(row)
  }

  // 3) 并行加载“已安装扩展列表”和“市场索引”，避免无谓的串行等待
  let installedMap: Record<string, InstalledPlugin> = {}
  let marketItems: InstallableItem[] = []

  // 市场列表过滤与渲染（可选接受一份覆盖的索引，用于后台静默刷新）
  async function applyMarketFilter(itemsOverride?: InstallableItem[] | null): Promise<void> {
    try {
      // 先移除所有市场扩展
      const marketRows = unifiedList.querySelectorAll('[data-type="market"]')
      marketRows.forEach(r => r.remove())

      // 如果处于“仅显示已安装”或“仅显示可更新”模式，则不渲染市场扩展
      if (installedOnlyCheckbox.checked || _extUpdatesOnly) {
        return
      }

      const base = Array.isArray(itemsOverride) ? itemsOverride : marketItems
      let source = Array.isArray(base) ? base : []
      if (!source || source.length === 0) {
        const loadingRow = document.createElement('div')
        loadingRow.className = 'ext-item'
        loadingRow.setAttribute('data-type', 'market')
        loadingRow.appendChild(createLoadingIndicator())
        unifiedList.appendChild(loadingRow)
        return
      }

      // 如果勾选了"仅显示已安装"，直接返回，不显示市场扩展
      if (installedOnlyCheckbox.checked) {
        return
      }

      // 每次根据最新安装列表过滤，已安装的扩展不再出现在市场区块
      let installedMapNow: Record<string, InstalledPlugin> = {}
      try {
        installedMapNow = await getInstalledPlugins()
      } catch {
        installedMapNow = {}
      }
      const installedIds = new Set(Object.keys(installedMapNow))

      const keywordRaw = (_extMarketSearchText || '').trim().toLowerCase()
      let items = source.filter((it) => {
        try {
          if (!it || !it.id) return false
          if (installedIds.has(it.id)) return false
          return true
        } catch {
          return true
        }
      })
      if (keywordRaw) {
        items = items.filter((it) => {
          try {
            const parts: string[] = []
            if (it.name) parts.push(String(it.name))
            if (it.id) parts.push(String(it.id))
            if (it.description) parts.push(String(it.description))
            if (it.author) parts.push(String(it.author))
            const hay = parts.join(' ').toLowerCase()
            return hay.includes(keywordRaw)
          } catch {
            return true
          }
        })
      }

      // 排序：推荐优先，其次按名称首字母 A-Z（与索引加载时保持一致，确保在过滤后顺序稳定）
      try {
        items = items.slice().sort(compareInstallableItems)
      } catch {}

      if (!items.length) {
        // 如果已安装/内置扩展中仍有条目（可能匹配当前搜索），就不要再显示“没有匹配”的提示
        const hasOtherRows = unifiedList.querySelector('[data-type=\"installed\"], [data-type=\"builtin\"]')
        if (!hasOtherRows) {
          const empty = document.createElement('div')
          empty.className = 'ext-empty'
          empty.textContent = t('ext.market.empty.search')
          empty.setAttribute('data-type', 'market')
          unifiedList.appendChild(empty)
        }
        return
      }

      for (const it of items) {
        const row = document.createElement('div')
        row.className = 'ext-item'
        row.setAttribute('data-type', 'market')
        try { row.setAttribute('data-plugin-id', String(it.id || '')) } catch {}

        const meta = document.createElement('div'); meta.className = 'ext-meta'
        const name = document.createElement('div'); name.className = 'ext-name'
        const fullName = String(it.name || it.id)
        try { row.style.order = String(getPluginOrder(String(it.id || ''), fullName)) } catch {}
        const spanName = document.createElement('span')
        spanName.textContent = fullName
        spanName.title = fullName  // 悬浮显示完整名称
        name.appendChild(spanName)

        try {
          if ((it as any).featured === true) {
            const badge = document.createElement('span')
            badge.className = 'ext-tag'
            badge.textContent = '推荐'
            badge.style.marginLeft = '8px'
            badge.style.color = '#f97316'
            name.appendChild(badge)
          }
        } catch {}

        const desc = document.createElement('div'); desc.className = 'ext-desc'
        if (it.description) {
          const descText = document.createElement('span'); descText.textContent = it.description
          desc.appendChild(descText)
        }
        if (it.author || it.homepage) {
          const spacing = document.createTextNode('  ')
          desc.appendChild(spacing)
          if (it.author) {
            const authorSpan = document.createElement('span'); authorSpan.textContent = t('ext.author') + (it.author || '')
            desc.appendChild(authorSpan)
            if (it.homepage) { desc.appendChild(document.createTextNode(' ')) }
          }
          if (it.homepage) {
            const a = document.createElement('a'); a.href = it.homepage!; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = t('ext.homepage')
            a.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); try { void openInBrowser(it.homepage!) } catch {} })
            desc.appendChild(a)
          }
        }
        meta.appendChild(name); meta.appendChild(desc)

        const actions = document.createElement('div'); actions.className = 'ext-actions'
        const btnInstall = document.createElement('button'); btnInstall.className = 'btn primary'; btnInstall.textContent = t('ext.install.btn')
        btnInstall.addEventListener('click', async () => {
          try {
            btnInstall.textContent = t('ext.install.btn') + '...'; (btnInstall as HTMLButtonElement).disabled = true
            const rec = await installPluginFromGit(it.install.ref)
            await activatePlugin(rec)
            try {
              await refreshInstalledExtensionsUI()
              await applyMarketFilter()
            } catch {}
            pluginNotice('安装成功', 'ok', 1500)
          } catch (e) {
            try { btnInstall.textContent = '安装' } catch {}
            try { (btnInstall as HTMLButtonElement).disabled = false } catch {}
            void appendLog('ERROR', '安装扩展失败', e)
            const errMsg = (e instanceof Error) ? e.message : String(e)
            pluginNotice('安装扩展失败' + (errMsg ? ': ' + errMsg : ''), 'err', 3000)
          }
        })
        actions.appendChild(btnInstall)
        row.appendChild(meta); row.appendChild(actions)
        unifiedList.appendChild(row)
      }
    } catch {
      const marketRows = unifiedList.querySelectorAll('[data-type="market"]')
      marketRows.forEach(r => r.remove())
      const loadingRow = document.createElement('div')
      loadingRow.className = 'ext-item'
      loadingRow.setAttribute('data-type', 'market')
      loadingRow.appendChild(createLoadingIndicator())
      unifiedList.appendChild(loadingRow)
    }
  }

  try {
    installedMap = await getInstalledPlugins()
  } catch { installedMap = {} }
  try {
    marketItems = await loadInstallablePlugins(false)
  } catch {
    marketItems = FALLBACK_INSTALLABLES.slice()
  }

  _extLastMarketItems = marketItems
  // 基于当前市场索引构建统一排序顺序（推荐优先 + 名称 A-Z），与安装状态解耦
  _extGlobalOrder = {}
  try {
    const sortedForOrder = (marketItems || []).slice().sort(compareInstallableItems)
    let idx = 0
    for (const it of sortedForOrder) {
      if (!it || !it.id) continue
      _extGlobalOrder[it.id] = 100 + idx++
    }
  } catch {}
  // 内置扩展固定靠前，但保留相对顺序
  try {
    let idx = 0
    for (const b of builtinPlugins) {
      if (!b || !b.id) continue
      _extGlobalOrder[b.id] = idx++
    }
  } catch {}
  // 记录供后台静默刷新重用的过滤函数（复用当前 unifiedList / 控件状态）
  _extApplyMarketFilter = applyMarketFilter

  const arr = Object.values(installedMap)
  let updateMap: Record<string, PluginUpdateState> = {}
  if (arr.length > 0 && marketItems.length > 0) {
    try {
      updateMap = await getPluginUpdateStates(arr, marketItems)
    } catch { updateMap = {} }
  }

  // 4) 填充"已安装扩展"区块
  renderInstalledExtensions(unifiedList, installedMap, updateMap)

  // 5) 填充"可安装的扩展"区块（扩展市场）
  await applyMarketFilter()

  // 所有扩展加载完成，隐藏加载指示器
  loadingSpinner.remove()
}

async function removeDirRecursive(dir: string): Promise<void> {
  try {
    const entries = await readDir(dir as any, { baseDir: BaseDirectory.AppLocalData } as any)
    for (const e of entries as any[]) {
      if (e.isDir) { await removeDirRecursive(`${dir}/${e.name}`) }
      else { try { await remove(`${dir}/${e.name}` as any, { baseDir: BaseDirectory.AppLocalData } as any) } catch {} }
    }
    try { await remove(dir as any, { baseDir: BaseDirectory.AppLocalData } as any) } catch {}
  } catch {}
}

// 简单判断一个字符串是否更像本地路径（用于区分本地/远程安装）
function isLikelyLocalPath(input: string): boolean {
  const v = (input || '').trim()
  if (!v) return false
  if (/^[A-Za-z]:[\\/]/.test(v)) return true  // Windows 盘符路径
  if (/^\\\\/.test(v)) return true            // Windows UNC 路径
  if (v.startsWith('/')) return true          // 类 Unix 绝对路径
  return false
}

function ensureExtensionsOverlayMounted() {
  if (_extOverlayEl) return
  const overlay = document.createElement('div')
  overlay.className = 'ext-overlay sheet-overlay hidden'
  overlay.id = 'extensions-overlay'
  overlay.innerHTML = `
    <div class=\"ext-dialog sheet-panel\" role=\"dialog\" aria-modal=\"true\">
      <div class=\"ext-header\">
        <div>${t('ext.title')}</div>
        <button class=\"ext-close\" id=\"ext-close\">×</button>
      </div>
      <div class=\"ext-body\">
        <div class=\"ext-section\">
          <div class=\"ext-subtitle\">${t('ext.install.section')}</div>
          <div class=\"ext-install\">
            <input type=\"text\" id=\"ext-install-input\" placeholder=\"${t('ext.install.placeholder')}\">
            <button id=\"ext-browse-local-btn\">浏览...</button>
            <button class=\"primary\" id=\"ext-install-btn\">${t('ext.install.btn')}</button>
          </div>
        </div>
        <div class=\"ext-section\" id=\"ext-list-host\"></div>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  _extOverlayEl = overlay
  _extListHost = overlay.querySelector('#ext-list-host') as HTMLDivElement | null
  _extInstallInput = overlay.querySelector('#ext-install-input') as HTMLInputElement | null
  const btnClose = overlay.querySelector('#ext-close') as HTMLButtonElement | null
  const btnInstall = overlay.querySelector('#ext-install-btn') as HTMLButtonElement | null
  const btnBrowseLocal = overlay.querySelector('#ext-browse-local-btn') as HTMLButtonElement | null

  btnClose?.addEventListener('click', () => showExtensionsOverlay(false))
  overlay.addEventListener('click', (e) => { if (e.target === overlay) showExtensionsOverlay(false) })
  try {
    const panel = overlay.querySelector('.ext-dialog') as HTMLDivElement | null
    attachBottomSheetSwipe(overlay, panel, () => showExtensionsOverlay(false))
  } catch {}

  // GitHub/URL/本地 安装（统一入口，根据输入内容区分）
  btnInstall?.addEventListener('click', async () => {
    const v = (_extInstallInput?.value || '').trim()
    if (!v) return
    try {
      let rec: InstalledPlugin
      if (isLikelyLocalPath(v)) {
        rec = await installPluginFromLocal(v)
      } else {
        rec = await installPluginFromGit(v)
      }
      await activatePlugin(rec)
      _extInstallInput!.value = ''
      try { await refreshExtensionsUI() } catch {}
      pluginNotice(t('ext.install.ok'), 'ok', 1500)
    } catch (e) {
      void appendLog('ERROR', t('ext.install.fail'), e)
      const errMsg = (e instanceof Error) ? e.message : String(e)
      pluginNotice(t('ext.install.fail') + (errMsg ? ': ' + errMsg : ''), 'err', 3000)
    }
  })

  // 浏览本地文件夹
  async function browseLocalFolder() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择扩展文件夹'
      })
      if (selected && typeof selected === 'string') {
        if (_extInstallInput) _extInstallInput.value = selected
      }
    } catch (e) {
      console.error('选择文件夹失败', e)
    }
  }

  btnBrowseLocal?.addEventListener('click', () => { void browseLocalFolder() })
}

async function showExtensionsOverlay(show: boolean): Promise<void> {
  ensureExtensionsOverlayMounted()
  if (!_extOverlayEl) return
  if (show) {
    showSheet(_extOverlayEl)
    // 第一次打开：完整刷新（可能触发网络请求和市场索引加载）
    if (!_extOverlayRenderedOnce) {
      _extOverlayRenderedOnce = true
      await refreshExtensionsUI()
    } else {
      // 之后再次打开：仅做轻量刷新，避免每次都重建 DOM / 触发远程请求
      try { await refreshInstalledExtensionsUI() } catch {}
      // 后台静默刷新市场列表：尊重缓存 TTL，不显示 loading，不阻塞 UI
      const fn = _extApplyMarketFilter
      if (fn) {
        void (async () => {
          try {
            const items = await loadInstallablePlugins(false)
            if (!Array.isArray(items) || items.length === 0) return
            _extLastMarketItems = items
            await fn(items)
          } catch {
            // 静默失败，不打扰用户
          }
        })()
      }
    }
  } else {
    hideSheet(_extOverlayEl)
  }
}

async function loadAndActivateEnabledPlugins(): Promise<void> {
  try {
    const map = await getInstalledPlugins()
    const toEnable = Object.values(map).filter((p) => p.enabled)

    // 向后兼容：为旧插件设置默认 showInMenuBar = true
    let needSave = false
    for (const p of toEnable) {
      if (p.showInMenuBar === undefined) {
        p.showInMenuBar = true // 旧插件默认独立显示，保持原有行为
        needSave = true
      }
    }
    if (needSave) {
      await setInstalledPlugins(map)
    }

    for (const p of toEnable) {
      try { await activatePlugin(p) } catch (e) { console.warn('插件激活失败', p.id, e) }
    }
    // 如果当前窗口为 AI 独立窗口，尝试自动挂载 AI 助手
    try {
      if (location.hash === '#ai-assistant') {
        const ai = (map as any)['ai-assistant']
        if (ai) {
          const mod = activePlugins.get('ai-assistant') as any
          const ctx = (window as any).__pluginCtx__?.['ai-assistant']
          if (mod && typeof mod?.standalone === 'function' && ctx) {
            await mod.standalone(ctx)
          }
        }
        // 独立窗口：隐藏主界面元素，仅保留插件窗口
        try {
          const style = document.createElement('style')
          style.id = 'ai-standalone-style'
          style.textContent = 'body>*{display:none !important} #ai-assist-win{display:block !important}'
          document.head.appendChild(style)
        } catch {}
      }
    } catch {}
  } catch {}
}



// 将所见模式开关暴露到全局，便于在 WYSIWYG V2 覆盖层中通过双击切换至源码模式
try { (window as any).flymdSetWysiwygEnabled = async (enable: boolean) => { try { await setWysiwygEnabled(enable) } catch (e) { console.error('flymdSetWysiwygEnabled 调用失败', e) } } } catch {}

// 公开设置插件市场地址的 helper，便于远端/本地切换索引
try {
  (window as any).flymdSetPluginMarketUrl = async (url: string | null) => {
    try {
      if (!store) return false
      const key = 'pluginMarket:url'
      if (url && /^https?:\/\//i.test(url)) { await store.set(key, url) } else { await store.set(key, null as any) }
      await store.set('pluginMarket:cache', null as any)
      await store.save()
      console.log('[Extensions] Plugin market URL set to:', url)
      return true
    } catch (e) { console.error('flymdSetPluginMarketUrl 失败', e); return false }
  }
} catch {}


// 预览消毒开关：允许在发行版关闭预览消毒（定位构建差异问题），
// 并支持用 localStorage 覆盖（flymd:sanitizePreview = '0'/'false' 关闭；'1'/'true' 开启）。
function shouldSanitizePreview(): boolean {
  try {
    const v = localStorage.getItem('flymd:sanitizePreview')
    if (v != null) {
      const s = String(v).toLowerCase()
      if (s === '0' || s === 'false' || s === 'off' || s === 'no') return false
      if (s === '1' || s === 'true' || s === 'on' || s === 'yes') return true
    }
  } catch {}
  // 默认策略：开发环境开启，发行版关闭（仅针对预览渲染，粘贴/更新弹窗仍保留基础消毒）
  try { return !!((import.meta as any).env?.DEV) } catch { return false }
}

// 初始化多标签系统（包装器模式，最小侵入）
import('./tabs/integration')
  .then((mod) => { try { bindTabManagerForUi(mod.tabManager) } catch (err) { console.warn('[Tabs] bind ui failed', err) } })
  .catch(e => console.warn('[Tabs] Failed to load tab system:', e))
