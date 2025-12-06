import { readDir, stat, mkdir, rename, remove, exists, writeTextFile, writeFile, readFile, watchImmediate } from '@tauri-apps/plugin-fs'
import { t } from './i18n'
import appIconUrl from '../Flymdnew.png?url'

export type FileTreeOptions = {
  // 鑾峰彇搴撴牴鐩綍锛堟湭璁剧疆鏃惰繑鍥?null锛?  getRoot: () => Promise<string | null>
  // 鎵撳紑宸叉湁鏂囦欢锛堝弻鍑绘枃浠惰Е鍙戯級
  onOpenFile: (path: string) => Promise<void> | void
  // 鏂板缓鏂囦欢鍚庢墦寮€锛堢敤浜庨粯璁よ繘鍏ョ紪杈戞€侊級
  onOpenNewFile?: (path: string) => Promise<void> | void
  // 鐘舵€佸彉鏇村洖璋冿紙閫変腑/灞曞紑鍙樺寲鏃跺彲閫氱煡澶栧眰锛?  onStateChange?: () => void
  // 鏂囦欢琚Щ鍔ㄥ悗鐨勯€氱煡锛堢敤浜庡灞傛洿鏂板綋鍓嶆墦寮€鏂囦欢璺緞绛夛級
  onMoved?: (src: string, dst: string) => Promise<void> | void
}

export type FileTreeAPI = {
  init: (container: HTMLElement, opts: FileTreeOptions) => Promise<void>
  refresh: () => Promise<void>
  getSelectedDir: () => string | null
  newFileInSelected: () => Promise<void>
  newFolderInSelected: () => Promise<void>
  // 璁剧疆鎺掑簭鏂瑰紡
  setSort: (mode: 'name_asc' | 'name_desc' | 'mtime_asc' | 'mtime_desc') => void
}

const state = {
  container: null as HTMLElement | null,
  opts: null as FileTreeOptions | null,
  expanded: new Set<string>(),
  selected: null as string | null,
  selectedIsDir: false,
  watching: false,
  unwatch: null as null | (() => void),
  sortMode: 'name_asc' as 'name_asc' | 'name_desc' | 'mtime_asc' | 'mtime_desc',
  currentRoot: null as string | null,
}

const EXPANDED_KEY_PREFIX = 'flymd:libExpanded:'
function expandedStorageKey(root: string) {
  return `${EXPANDED_KEY_PREFIX}${root}`
}

function restoreExpandedState(root: string | null) {
  state.expanded = new Set<string>()
  if (!root) return
  let restored = false
  try {
    const raw = localStorage.getItem(expandedStorageKey(root))
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        restored = true
        for (const item of arr) {
          if (typeof item === 'string') state.expanded.add(item)
        }
      }
    }
  } catch {}
  if (!restored) state.expanded.add(root)
}

function persistExpandedState() {
  try {
    const root = state.currentRoot
    if (!root) return
    const arr = Array.from(state.expanded)
    localStorage.setItem(expandedStorageKey(root), JSON.stringify(arr))
  } catch {}
}

function setExpandedState(path: string, expanded: boolean) {
  state.expanded[expanded ? 'add' : 'delete'](path)
  persistExpandedState()
}

// 鐩綍閫掑綊鍖呭惈鍙楁敮鎸佹枃妗ｇ殑缂撳瓨
const hasDocCache = new Map<string, boolean>()
const hasDocPending = new Map<string, Promise<boolean>>()

// 鏂囦欢澶硅嚜瀹氫箟鎺掑簭鏄犲皠锛氱埗鐩綍 -> 瀛愮洰褰曡矾寰?-> 椤哄簭绱㈠紩锛堜粎浣滅敤浜庢枃浠跺す锛?const folderOrder: Record<string, Record<string, number>> = {}
const FOLDER_ORDER_KEY = 'flymd:folderOrder'

function loadFolderOrder() {
  try {
    const raw = localStorage.getItem(FOLDER_ORDER_KEY)
    if (!raw) return
    const obj = JSON.parse(raw)
    if (!obj || typeof obj !== 'object') return
    for (const [parent, children] of Object.entries(obj as any)) {
      if (!children || typeof children !== 'object') continue
      const m: Record<string, number> = {}
      for (const [child, ord] of Object.entries(children as any)) {
        const n = Number(ord)
        if (Number.isFinite(n)) m[child] = n
      }
      folderOrder[parent] = m
    }
  } catch {}
}

function saveFolderOrder() {
  try {
    localStorage.setItem(FOLDER_ORDER_KEY, JSON.stringify(folderOrder))
  } catch {}
}

// 获取某父目录下单个子目录的手动顺序索引（未设置时返回 Infinity）
function getFolderOrder(parent: string, child: string): number {
  const m = folderOrder[parent]
  if (!m) return Number.POSITIVE_INFINITY
  const n = m[child]
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
}

// 鏇存柊鏌愮埗鐩綍涓嬬殑鏂囦欢澶归『搴忥紙浼犲叆褰撳墠鐨勫瓙鐩綍璺緞鏁扮粍锛屾寜璇ユ暟缁勯『搴忛噸寤虹储寮曪級
function setFolderOrderForParent(parent: string, children: string[]) {
  const m: Record<string, number> = {}
  let idx = 0
  for (const p of children) {
    m[p] = idx++
  }
  folderOrder[parent] = m
  saveFolderOrder()
}

// 娓呯┖鏌愪釜鐖剁洰褰曚笅鐨勮嚜瀹氫箟鎺掑簭
export function clearFolderOrderForParent(parent: string) {
  try {
    if (folderOrder[parent]) delete folderOrder[parent]
    saveFolderOrder()
  } catch {}
}

function sep(p: string): string { return p.includes('\\') ? '\\' : '/' }
function norm(p: string): string { return p.replace(/[\\/]+/g, sep(p)) }
function join(a: string, b: string): string { const s = sep(a); return (a.endsWith(s) ? a : a + s) + b }
function base(p: string): string { return p.split(/[\\/]+/).slice(0, -1).join(sep(p)) }
function nameOf(p: string): string { const n = p.split(/[\\/]+/).pop() || p; return n }
function isInside(root: string, p: string): boolean { const r = norm(root).toLowerCase(); const q = norm(p).toLowerCase(); const s = r.endsWith(sep(r)) ? r : r + sep(r); return q.startsWith(s) }
function friendlyDisplayName(raw: string): string {
  try {
    let name = raw || ''
    try { name = decodeURIComponent(name) } catch {}
    // SAF tree/document/primary:xxx 褰㈠紡
    if (name.includes(':')) name = name.split(':').pop() || name
    name = name.replace(/^tree\//i, '').replace(/^document\//i, '')
    name = name.split(/[/\\]+/).filter(Boolean).pop() || name
    return name || raw
  } catch {
    return raw
  }
}
function displayNameForRoot(p: string): string {
  try {
    let tail = p.split(/[\\/]+/).filter(Boolean).pop() || p
    try { tail = decodeURIComponent(tail) } catch {}
    if (tail.includes(':')) tail = tail.split(':').pop() || tail
    tail = tail.replace(/^tree\//i, '').replace(/^document\//i, '')
    tail = tail.split(/[/]+/).filter(Boolean).pop() || tail
    return tail || p
  } catch {
    return p
  }
}

async function ensureDir(dir: string) { try { await mkdir(dir, { recursive: true } as any) } catch {} }

async function moveFileSafe(src: string, dst: string): Promise<void> {
  try { await rename(src, dst) } catch {
    const data = await readFile(src)
    await ensureDir(base(dst))
    await writeFile(dst, data as any)
    try { await remove(src) } catch {}
  }
}

async function newFileSafe(dir: string, hint = '新建文档.md'): Promise<string> {
  const s = sep(dir)
  let n = hint, i = 1
  while (await exists(dir + s + n)) {
    const m = hint.match(/^(.*?)(\.[^.]+)$/); const stem = m ? m[1] : hint; const ext = m ? m[2] : ''
    n = `${stem} ${++i}${ext}`
  }
  const full = dir + s + n
  await ensureDir(dir)
  await writeTextFile(full, '# 标题\\n\\n', {} as any)
  return full
}

async function newFolderSafe(dir: string, hint = '新建文件夹'): Promise<string> {
  const s = sep(dir)
  let n = hint, i = 1
  while (await exists(dir + s + n)) { n = `${hint} ${++i}` }
  const full = dir + s + n
  await mkdir(full, { recursive: true } as any)
  // 创建一个占位文件，使文件夹在库侧栏中可见
  const placeholder = full + s + 'README.md'
  await writeTextFile(placeholder, '# ' + n + '\n\n', {} as any)
  return full
}

function saveSelection(path: string, isDir: boolean, row: HTMLElement) {
  state.selected = path
  state.selectedIsDir = isDir
  try {
    state.container?.querySelectorAll('.lib-node.selected').forEach(el => el.classList.remove('selected'))
  } catch {}
  row.classList.add('selected')
  state.opts?.onStateChange?.()
}

function toMtimeMs(meta: any): number {
  try {
    const cands = [
      meta?.modifiedAt,
      meta?.modifiedTime,
      meta?.mtimeMs,
      meta?.mtime,
      meta?.modificationTime,
      meta?.st_mtime_ms,
      meta?.st_mtime,
      meta?.changedAt,
      meta?.ctimeMs,
      meta?.ctime,
    ]
    for (const v of cands) {
      if (v == null) continue
      const n = Number(v)
      if (Number.isFinite(n) && n > 0) return n
      if (typeof v === 'string') {
        const t = Date.parse(v)
        if (Number.isFinite(t)) return t
      }
      try { if (v instanceof Date) { const t = (v as Date).getTime(); if (Number.isFinite(t)) return t } } catch {}
    }
  } catch {}
  return 0
}

async function listDir(root: string, dir: string): Promise<{ name: string; path: string; isDir: boolean }[]> {
  const items: { name: string; path: string; isDir: boolean; mtime?: number; ext?: string }[] = []
  let ents: any[] = []
  try { ents = await readDir(dir, { recursive: false } as any) as any[] } catch { ents = [] }
  const dirs: { name: string; path: string; isDir: boolean; mtime?: number }[] = []
  // 浠呭睍绀烘寚瀹氬悗缂€鐨勬枃妗ｏ紙md / markdown / txt / pdf锛?  const allow = new Set(['md', 'markdown', 'txt', 'pdf'])
  for (const it of ents) {
    const needMtime = (state.sortMode === 'mtime_asc' || state.sortMode === 'mtime_desc')
    const p: string = typeof it?.path === 'string' ? it.path : join(dir, it?.name || '')
    let isDir = !!(it as any)?.isDirectory
    let st: any = null
    if ((it as any)?.isDirectory === undefined) {
      try { st = await stat(p) as any; isDir = !!st?.isDirectory } catch { isDir = false }
    }
    if (!st && needMtime) {
      try { st = await stat(p) as any } catch {}
    }
    if (isDir) {
      // 浠呬繚鐣欌€滃寘鍚彈鏀寔鏂囨。(閫掑綊)鈥濈殑鐩綍
      if (await dirHasSupportedDocRecursive(p, allow)) {
        dirs.push({ name: nameOf(p), path: p, isDir: true, mtime: needMtime ? toMtimeMs(st) : undefined })
      }
    } else {
      const nm = nameOf(p)
      const ext = (nm.split('.').pop() || '').toLowerCase()
      if (allow.has(ext)) {
        items.push({ name: nm, path: p, isDir: false, mtime: needMtime ? toMtimeMs(st) : undefined, ext })
      }
    }
  }
  const isPdf = (e: any) => (e.ext || '').toLowerCase() === 'pdf'
  const pdfGrouped = (base: (a: any, b: any) => number) => (a: any, b: any) => {
    const ap = isPdf(a)
    const bp = isPdf(b)
    // pdf 姘歌繙鎴愮粍锛氶潪 pdf 鍦ㄥ墠锛宲df 鍦ㄥ悗
    if (ap && !bp) return 1
    if (!ap && bp) return -1
    return base(a, b)
  }

  const byNameAsc = (a: any, b: any) => a.name.localeCompare(b.name)
  const byNameDesc = (a: any, b: any) => -a.name.localeCompare(b.name)
  const byMtimeAsc = (a: any, b: any) => ((a.mtime ?? 0) - (b.mtime ?? 0)) || a.name.localeCompare(b.name)
  const byMtimeDesc = (a: any, b: any) => ((b.mtime ?? 0) - (a.mtime ?? 0)) || a.name.localeCompare(b.name)

  // 鐩綍鎺掑簭锛氭墜鍔ㄩ『搴?+ 鍘熸湁瑙勫垯
  const dirManualFirst = (cmp: (a: any, b: any) => number) => (a: any, b: any) => {
    const oa = getFolderOrder(dir, a.path)
    const ob = getFolderOrder(dir, b.path)
    const da = Number.isFinite(oa)
    const db = Number.isFinite(ob)
    if (da && !db) return -1
    if (!da && db) return 1
    if (da && db && oa !== ob) return oa - ob
    return cmp(a, b)
  }

  if (state.sortMode === 'name_asc') { dirs.sort(dirManualFirst(byNameAsc)); items.sort(pdfGrouped(byNameAsc)) }
  else if (state.sortMode === 'name_desc') { dirs.sort(dirManualFirst(byNameDesc)); items.sort(pdfGrouped(byNameDesc)) }
  else if (state.sortMode === 'mtime_asc') { dirs.sort(dirManualFirst(byMtimeAsc)); items.sort(pdfGrouped(byMtimeAsc)) }
  else if (state.sortMode === 'mtime_desc') { dirs.sort(dirManualFirst(byMtimeDesc)); items.sort(pdfGrouped(byMtimeDesc)) }
  else { dirs.sort(dirManualFirst(byNameAsc)); items.sort(pdfGrouped(byNameAsc)) }
  return [...dirs, ...items]
}

// 閫掑綊鍒ゆ柇鐩綍鏄惁鍖呭惈鍙楁敮鎸佹枃妗ｏ紙甯︾紦瀛橈級

async function dirHasSupportedDocRecursive(dir: string, allow: Set<string>, depth = 20): Promise<boolean> {
  try {
    if (hasDocCache.has(dir)) return hasDocCache.get(dir) as boolean
    if (hasDocPending.has(dir)) return await (hasDocPending.get(dir) as Promise<boolean>)

    const p = (async (): Promise<boolean> => {
      if (depth <= 0) { hasDocCache.set(dir, false); return false }
      let entries: any[] = []
      try { entries = await readDir(dir, { recursive: false } as any) as any[] } catch { entries = [] }

      // ?????????
      for (const it of (entries || [])) {
        const full: string = typeof it?.path === 'string' ? it.path : join(dir, it?.name || '')
        let isDir = false
        if ((it as any)?.isDirectory !== undefined) { isDir = !!(it as any)?.isDirectory } else { try { isDir = !!(await stat(full) as any)?.isDirectory } catch { isDir = false } }
        if (!isDir) {
          const nm = nameOf(full)
          const ext = (nm.split('.').pop() || '').toLowerCase()
          if (allow.has(ext)) { hasDocCache.set(dir, true); return true }
        }
      }

      // ????????
      for (const it of (entries || [])) {
        const full: string = typeof it?.path === 'string' ? it.path : join(dir, it?.name || '')
        let isDir = false
        if ((it as any)?.isDirectory !== undefined) { isDir = !!(it as any)?.isDirectory } else { try { isDir = !!(await stat(full) as any)?.isDirectory } catch { isDir = false } }
        if (isDir) {
          const ok = await dirHasSupportedDocRecursive(full, allow, depth - 1)
          if (ok) { hasDocCache.set(dir, true); return true }
        }
      }

      hasDocCache.set(dir, false)
      return false
    })()

    hasDocPending.set(dir, p)
    const r = await p
    hasDocPending.delete(dir)
    return r
  } catch {
    return false
  }
}

function makeTg(): HTMLElement { const s = document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('viewBox','0 0 24 24'); s.classList.add('lib-tg'); const p=document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('d','M9 6l6 6-6 6'); s.appendChild(p); return s as any }
function makeFolderIcon(path?: string): HTMLElement {
  const span = document.createElement('span')
  span.className = 'lib-ico lib-ico-folder'
  // ????????????????????????
  let icon = '\u{1F4C1}'
  try {
    if (path) {
      const customIcons = JSON.parse(localStorage.getItem('flymd:folderIcons') || '{}')
      if (customIcons[path]) icon = customIcons[path]
      else {
        const prefs = JSON.parse(localStorage.getItem('flymd:theme:prefs') || '{}')
        if (prefs.folderIcon) icon = prefs.folderIcon
      }
    } else {
      const prefs = JSON.parse(localStorage.getItem('flymd:theme:prefs') || '{}')
      if (prefs.folderIcon) icon = prefs.folderIcon
    }
  } catch {}
  span.textContent = icon
  span.style.fontSize = '16px'
  return span as any
}

function stripExt(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

async function buildDir(root: string, dir: string, parent: HTMLElement) {
  parent.innerHTML = ''
  const entries = await listDir(root, dir)
  const dirEntries = entries.filter(e => e.isDir)
  const fileEntries = entries.filter(e => !e.isDir)

  // 鐩綍琛屾瀯寤烘椂锛岄渶瑕佺煡閬撳悓绾х洰褰曠殑椤哄簭锛岀敤浜庢嫋鎷芥帓搴忓悗閲嶅啓 folderOrder
  const allDirPaths = dirEntries.map(e => e.path)

  for (const e of [...dirEntries, ...fileEntries]) {
    const row = document.createElement('div')
    row.className = 'lib-node ' + (e.isDir ? 'lib-dir' : 'lib-file')
    ;(row as any).dataset.path = e.path
    const label = document.createElement('span')
    label.className = 'lib-name'
    // 文件隐藏扩展名，文件夹保持原名（友好化 SAF 名称)
    const dispName = friendlyDisplayName(e.name)
    label.textContent = e.isDir ? dispName : stripExt(dispName)

    if (e.isDir) {
      const tg = makeTg()
      const ico = makeFolderIcon(e.path)
      row.appendChild(tg); row.appendChild(ico); row.appendChild(label)
      const kids = document.createElement('div')
      kids.className = 'lib-children'
      kids.style.display = 'none'
      parent.appendChild(row)
      parent.appendChild(kids)

      const exp = state.expanded.has(e.path)
      if (exp) { kids.style.display = ''; row.classList.add('expanded'); await buildDir(root, e.path, kids) }

      row.addEventListener('click', async (ev) => {
        const was = state.expanded.has(e.path)
        if (ev.detail === 2) return
        saveSelection(e.path, true, row)
        const now = !was
        setExpandedState(e.path, now)
        kids.style.display = now ? '' : 'none'
        row.classList.toggle('expanded', now)
        if (now && kids.childElementCount === 0) await buildDir(root, e.path, kids)
      })

      // 鐩綍鍚岀骇鍐呴儴鎷栨嫿鎺掑簭锛堜粎浣滅敤浜庢樉绀洪『搴忥紝涓嶇Щ鍔ㄧ湡瀹炴枃浠讹級
      ;(() => {
        let down = false
        let sx = 0, sy = 0
        let moved = false
        let ghost: HTMLDivElement | null = null
        let hoverRow: HTMLElement | null = null

        const onMouseMove = (ev: MouseEvent) => {
          if (!down) return
          const dx = ev.clientX - sx
          const dy = ev.clientY - sy
          if (!moved && Math.hypot(dx, dy) > 6) {
            moved = true
            ghost = document.createElement('div')
            ghost.className = 'ft-ghost'
            const gico = document.createElement('span')
            gico.textContent = '\u{1F4C1}'
            gico.style.marginRight = '6px'
            const glab = document.createElement('span')
            glab.textContent = friendlyDisplayName(e.name)
            glab.style.fontSize = '12px'
            ghost.appendChild(gico)
            ghost.appendChild(glab)
            ghost.style.position = 'fixed'
            ghost.style.left = ev.clientX + 8 + 'px'
            ghost.style.top = ev.clientY + 8 + 'px'
            ghost.style.padding = '6px 10px'
            ghost.style.background = 'rgba(17,17,17,0.85)'
            ghost.style.color = '#fff'
            ghost.style.borderRadius = '8px'
            ghost.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)'
            ghost.style.pointerEvents = 'none'
            ghost.style.zIndex = '99999'
            document.body.appendChild(ghost)
            try { document.body.style.userSelect = 'none' } catch {}
          }
          if (moved && ghost) {
            ghost.style.left = ev.clientX + 8 + 'px'
            ghost.style.top = ev.clientY + 8 + 'px'
            const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
            const rowEl = el?.closest?.('.lib-node.lib-dir') as HTMLElement | null
            if (hoverRow && hoverRow !== rowEl) hoverRow.classList.remove('selected')
            if (rowEl) rowEl.classList.add('selected')
            hoverRow = rowEl
          }
        }

        const cleanup = () => {
          document.removeEventListener('mousemove', onMouseMove)
          document.removeEventListener('mouseup', onMouseUp, true)
          down = false
          moved = false
          if (ghost && ghost.parentElement) ghost.parentElement.removeChild(ghost)
          ghost = null
          if (hoverRow) hoverRow.classList.remove('selected')
          hoverRow = null
          try { document.body.style.userSelect = '' } catch {}
        }

        const onMouseUp = async (ev: MouseEvent) => {
          try {
            if (!moved) return
            ev.preventDefault()
            ev.stopPropagation()
            const target = hoverRow
            if (!target) return
            const targetPath = (target as any).dataset?.path as string | undefined
            if (!targetPath || targetPath === e.path) return
            const before = allDirPaths.slice()
            const srcIdx = before.indexOf(e.path)
            const dstIdx = before.indexOf(targetPath)
            if (srcIdx === -1 || dstIdx === -1) return
            before.splice(srcIdx, 1)
            before.splice(dstIdx, 0, e.path)
            setFolderOrderForParent(dir, before)
            await refresh()
          } finally {
            cleanup()
          }
        }

        row.addEventListener('mousedown', (ev) => {
          if (ev.button !== 0) return
          // Ctrl/Shift 绛夌粍鍚堥敭淇濈暀缁欓€夋嫨锛岄伩鍏嶈鍚姩鎺掑簭鎷栨嫿
          if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return
          // 鍦ㄧ洰褰曡妭鐐逛笂鎸変綇宸﹂敭锛屽惎鍔ㄦ帓搴忔嫋鎷藉噯澶?          down = true
          moved = false
          sx = ev.clientX
          sy = ev.clientY
          document.addEventListener('mousemove', onMouseMove)
          document.addEventListener('mouseup', onMouseUp, true)
        }, true)
      })()

      row.addEventListener('dragover', (ev) => {
        ev.preventDefault()
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
        row.classList.add('selected')
        console.log('[鎷栧姩] 鎷栧姩鍒版枃浠跺す:', e.path)
      })
      // 涓€浜涘钩鍙伴渶瑕佸湪 dragenter 鍚屾牱 preventDefault锛屾墠鑳戒粠鈥滅姝⑩€濆厜鏍囧垏鍒板彲鏀剧疆
      row.addEventListener('dragenter', (ev) => { try { ev.preventDefault(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'; row.classList.add('selected') } catch {} })
      row.addEventListener('dragleave', () => { row.classList.remove('selected') })
      row.addEventListener('drop', async (ev) => {
        try {
          ev.preventDefault(); row.classList.remove('selected')
          console.log('[鎷栧姩] Drop浜嬩欢瑙﹀彂锛岀洰鏍囨枃浠跺す:', e.path)
          const src = ev.dataTransfer?.getData('text/plain') || ''
          if (!src) return
          const dst = join(e.path, nameOf(src))
          if (src === dst) return
          if (!isInside(root, src) || !isInside(root, dst)) return alert(t('ft.move.within'))
          let finalDst = dst
          if (await exists(dst)) {
            const choice = await conflictModal(t('ft.exists'), [t('action.overwrite'), t('action.renameAuto'), t('action.cancel')], 1)
            if (choice === 2) return
            if (choice === 1) {
              const nm = nameOf(src)
              const stem = nm.replace(/(\.[^.]+)$/,''); const ext = nm.match(/(\.[^.]+)$/)?.[1] || ''
              let i=1, cand=''
              do { cand = `${stem} ${++i}${ext}` } while (await exists(join(e.path, cand)))
              finalDst = join(e.path, cand)
              await moveFileSafe(src, finalDst)
            } else {
              await moveFileSafe(src, dst)
            }
          } else {
            await moveFileSafe(src, dst)
          }
          try { await state.opts?.onMoved?.(src, finalDst) } catch {}
          await refresh()
          console.log('[drag] move done:', src, '->', finalDst)
        } catch (err) { console.error('[鎷栧姩] 绉诲姩澶辫触:', err) }
      })
    } else {
      // 涓烘枃浠舵樉绀虹被鍨嬪寲鍥炬爣锛?      // - markdown/txt 浣跨敤绠€娲佺殑鈥滄枃妗ｅ舰鐘垛€濆浘鏍囷紝骞舵樉绀?MD/TXT 鏍囪瘑
      // - pdf 浣跨敤绋嬪簭鍥炬爣鐨勭孩鑹插彉浣擄紙閫氳繃 CSS 婊ら暅瀹炵幇鍖哄垎锛?      // - 鍏朵粬绫诲瀷浣跨敤绋嬪簭鍥炬爣
      const ext = (() => { try { return (e.name.split('.').pop() || '').toLowerCase() } catch { return '' } })()
      let iconEl: HTMLElement
      if (ext === 'md' || ext === 'markdown') {
        // 鎸夌収鐢ㄦ埛瑕佹眰锛歁D 鍥炬爣淇濇寔鍘熸牱锛堢▼搴忓浘鏍囷級锛屼笉瑕佹敼鍔?        const img = document.createElement('img')
        img.className = 'lib-ico lib-ico-app'
        try { img.setAttribute('src', appIconUrl) } catch {}
        iconEl = img
      } else if (ext === 'txt') {
        const span = document.createElement('span')
        span.className = 'lib-ico lib-ico-file lib-ico-txt'
        iconEl = span
      } else if (ext === 'pdf') {
        const img = document.createElement('img')
        img.className = 'lib-ico lib-ico-app lib-ico-pdf'
        try { img.setAttribute('src', appIconUrl) } catch {}
        iconEl = img
      } else {
        const img = document.createElement('img')
        img.className = 'lib-ico lib-ico-app'
        try { img.setAttribute('src', appIconUrl) } catch {}
        iconEl = img
      }
      // 璁╁浘鏍囦笌鏂囧瓧閮芥垚涓哄彲鎷栨嫿璧风偣锛堟煇浜涘唴鏍镐粎瑙﹀彂鈥滆鎸変綇鍏冪礌鈥濈殑鎷栨嫿锛屼笉浼氶€忎紶鍒扮埗鍏冪礌锛?      try { iconEl.setAttribute('draggable', 'true') } catch {}
      try { label.setAttribute('draggable', 'true') } catch {}
      // 缁熶竴鐨勬嫋鎷藉惎鍔ㄥ鐞嗭紙Edge/WebView2 鍏煎锛氳缃?dataTransfer 涓庢嫋鎷藉奖鍍忥級
      let nativeDragStarted = false
      const startDrag = (ev: DragEvent) => {
        try {
          ev.stopPropagation()
          const dt = ev.dataTransfer
          if (!dt) return
          nativeDragStarted = true
          // 蹇呴』鑷冲皯鍐欏叆涓€绉嶇被鍨嬬殑鏁版嵁锛屽惁鍒欐煇浜涘唴鏍镐細鍒ゅ畾涓衡€滄棤鏁堟嫋鎷解€?          dt.setData('text/plain', e.path)
          // 鍏煎鏌愪簺瑙ｆ瀽鍣細闄勫甫 URI 鍒楄〃
          try {
            const fileUrl = (() => {
              try {
                const p = e.path.replace(/\\/g, '/').replace(/^([A-Za-z]):\//, 'file:///$1:/')
                return p.startsWith('file:///') ? p : ('file:///' + p.replace(/^\//, ''))
              } catch { return '' }
            })()
            if (fileUrl) dt.setData('text/uri-list', fileUrl)
          } catch {}
          // 鍏佽绉诲姩/澶嶅埗锛堢敱鐩爣鍐冲畾 dropEffect锛?          dt.effectAllowed = 'copyMove'
          // 鎻愪緵鎷栨嫿褰卞儚锛岄伩鍏嶅嚭鐜版棤棰勮鏃剁殑鈥滅姝⑩€濇彁绀?          try { dt.setDragImage(row, 4, 4) } catch {}
        } catch {}
      }
      row.addEventListener('dragstart', startDrag)
      iconEl.addEventListener('dragstart', startDrag as any)
      label.addEventListener('dragstart', startDrag as any)
      // 鑷粯鎷栨嫿鍏滃簳锛氬湪鏌愪簺 WebView2 鍦烘櫙涓嬶紝鍘熺敓 DnD 浼氫竴鐩存樉绀虹姝㈠浘鏍囷紝
      // 鎴戜滑鍦ㄧЩ鍔ㄩ槇鍊艰Е鍙戝悗鍚敤鑷粯鎷栨嫿锛屾ā鎷熲€滄嫋鍒版枃浠跺す閲婃斁鍗冲彲绉诲姩鈥濄€?      const setupFallbackDrag = (host: HTMLElement) => {
        let down = false, sx = 0, sy = 0, moved = false
        let ghost: HTMLDivElement | null = null
        let hoverEl: HTMLElement | null = null
        let prevRowDraggable: string | null = null
        let prevIconDraggable: string | null = null
        let prevLabelDraggable: string | null = null
        const suppressClick = (ev: MouseEvent) => { if (moved) { ev.stopImmediatePropagation(); ev.preventDefault() } }
        const restoreDraggable = () => {
          try { if (prevRowDraggable !== null) row.setAttribute('draggable', prevRowDraggable); else row.removeAttribute('draggable') } catch {}
          try { if (prevIconDraggable !== null) (iconEl as any).setAttribute('draggable', prevIconDraggable); else (iconEl as any).removeAttribute('draggable') } catch {}
          try { if (prevLabelDraggable !== null) label.setAttribute('draggable', prevLabelDraggable); else label.removeAttribute('draggable') } catch {}
        }
        const onMove = (ev: MouseEvent) => {
          if (!down) return
          // 鑻ュ師鐢熸嫋鎷藉凡缁忓惎鍔紝鏀惧純鍏滃簳
          if (nativeDragStarted) { cleanup(); return }
          const dx = ev.clientX - sx, dy = ev.clientY - sy
          if (!moved && Math.hypot(dx, dy) > 6) {
            moved = true
            ghost = document.createElement('div')
            ghost.className = 'ft-ghost'
            // 鍥炬爣
            const gico = document.createElement('img')
            try { gico.setAttribute('src', appIconUrl) } catch {}
            gico.style.width = '16px'
            gico.style.height = '16px'
            gico.style.borderRadius = '3px'
            gico.style.objectFit = 'cover'
            gico.style.marginRight = '6px'
            // 鏂囨湰
            const glab = document.createElement('span')
            glab.textContent = friendlyDisplayName(e.name)
            glab.style.fontSize = '12px'
            // 缁勫悎
            ghost.appendChild(gico)
            ghost.appendChild(glab)
            // 浣嶇疆涓庨€氱敤鏍峰紡锛堝厹搴曪級
            ghost.style.position = 'fixed'
            ghost.style.left = ev.clientX + 8 + 'px'
            ghost.style.top = ev.clientY + 8 + 'px'
            ghost.style.padding = '6px 10px'
            ghost.style.background = 'rgba(17,17,17,0.85)'
            ghost.style.color = '#fff'
            ghost.style.borderRadius = '8px'
            ghost.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)'
            ghost.style.pointerEvents = 'none'
            ghost.style.zIndex = '99999'
            document.body.appendChild(ghost)
            try { document.body.style.cursor = 'grabbing' } catch {}
            try { document.body.style.userSelect = 'none' } catch {}
          }
          if (moved && ghost) {
            ghost.style.left = ev.clientX + 8 + 'px'
            ghost.style.top = ev.clientY + 8 + 'px'
            // 鍛戒腑娴嬭瘯锛氭煡鎵鹃紶鏍囦笅鐨勭洰褰曡妭鐐?            let el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
            let tgt = el?.closest?.('.lib-node.lib-dir') as HTMLElement | null
            if (hoverEl && hoverEl !== tgt) hoverEl.classList.remove('selected')
            if (tgt) tgt.classList.add('selected')
            hoverEl = tgt
          }
          try { ev.preventDefault() } catch {}
        }
        const finish = async () => {
          try {
            const base = (hoverEl as any)?.dataset?.path as string | undefined
            if (!moved || !base) return
            const root = await state.opts!.getRoot()
            if (!root) return
            const dst = join(base, nameOf(e.path))
            if (e.path === dst) return
            if (!isInside(root, e.path) || !isInside(root, dst)) { alert(t('ft.move.within')); return }
            let finalDst = dst
            if (await exists(dst)) {
              try { if (ghost) ghost.style.display = 'none' } catch {}
              const choice = await conflictModal(t('ft.exists'), [t('action.overwrite'), t('action.renameAuto'), t('action.cancel')], 1)
              if (choice === 2) return
              if (choice === 1) {
                const nm = nameOf(e.path)
                const stem = nm.replace(/(\.[^.]+)$/,''); const ext = nm.match(/(\.[^.]+)$/)?.[1] || ''
                let i=1, cand=''
                do { cand = `${stem} ${++i}${ext}` } while (await exists(join(base, cand)))
                finalDst = join(base, cand)
                await moveFileSafe(e.path, finalDst)
              } else {
                await moveFileSafe(e.path, dst)
              }
            } else {
              await moveFileSafe(e.path, dst)
            }
            try { await state.opts?.onMoved?.(e.path, finalDst) } catch {}
            await refresh()
          } catch (err) { console.error('[鎷栧姩] 鍏滃簳绉诲姩澶辫触:', err) }
        }
        const cleanup = () => {
          document.removeEventListener('mousemove', onMove)
          down = false
          moved = false
          try { if (ghost && ghost.parentElement) ghost.parentElement.removeChild(ghost) } catch {}
          try { document.querySelectorAll('.ft-ghost').forEach((el) => { try { (el as any).parentElement?.removeChild(el) } catch {} }) } catch {}
          try { document.body.style.cursor = '' } catch {}
          try { document.body.style.userSelect = '' } catch {}
          ghost = null
          if (hoverEl) hoverEl.classList.remove('selected')
          hoverEl = null
          try { host.removeEventListener('click', suppressClick, true) } catch {}
          restoreDraggable()
        }
        const onDown = (ev: MouseEvent) => {
          if (ev.button !== 0) return
          // 鍏佽鏂囨湰閫夋嫨/鐐瑰嚮锛屼笉闃绘榛樿锛涘厹搴曡Е鍙戜緷闈犵Щ鍔ㄩ槇鍊?          down = true; sx = ev.clientX; sy = ev.clientY; moved = false; nativeDragStarted = false
          try { ev.stopPropagation() } catch {}
          // 鏆傛椂绂佺敤鍘熺敓 DnD锛岄伩鍏嶉樆鏂?mousemove
          try {
            prevRowDraggable = row.getAttribute('draggable')
            prevIconDraggable = (iconEl as any).getAttribute?.('draggable') ?? null
            prevLabelDraggable = label.getAttribute('draggable')
            row.removeAttribute('draggable')
            ;(iconEl as any).removeAttribute?.('draggable')
            label.removeAttribute('draggable')
          } catch {}
          try { host.addEventListener('click', suppressClick, true) } catch {}
          document.addEventListener('mousemove', onMove)
          const onUp = async () => { document.removeEventListener('mouseup', onUp); if (!nativeDragStarted) { await finish() } cleanup() }
          document.addEventListener('mouseup', onUp, { once: true })
        }
        host.addEventListener('mousedown', onDown, true)
      }
      // 灏嗗厹搴曟嫋鎷戒粎缁戝畾鍒版暣琛岋紝閬垮厤澶氭缁戝畾閫犳垚澶氫釜鈥滃菇鐏碘€濋仐鐣?      setupFallbackDrag(row)
      row.appendChild(iconEl); row.appendChild(label)
      try { if (ext) row.classList.add('file-ext-' + ext) } catch {}

      row.addEventListener('click', async (ev) => {
        try {
          // 蹇界暐闈炲乏閿偣鍑伙紝浠ュ強鍙屽嚮搴忓垪涓殑绗簩娆＄偣鍑伙紙浜ょ粰 dblclick 澶勭悊锛?          if (ev.button !== 0 || ev.detail > 1) return
        } catch {}

        saveSelection(e.path, false, row)

        const isCtrlLike = !!(ev.ctrlKey || ev.metaKey)
        const win = (window as any)
        const hasFlyOpen = !!(win && typeof win.flymdOpenFile === 'function')

        // Ctrl+宸﹂敭锛氶€氳繃鍏ㄥ眬 flymdOpenFile锛堝甫鏍囩绯荤粺锛夋墦寮€锛屽苟鍦ㄩ渶瑕佹椂妯℃嫙 Ctrl+E 杩涘叆婧愮爜妯″紡
        if (isCtrlLike && hasFlyOpen) {
          ev.preventDefault()
          try { ev.stopPropagation() } catch {}
          const getPath = () => {
            try { return typeof win.flymdGetCurrentFilePath === 'function' ? win.flymdGetCurrentFilePath() : null } catch { return null }
          }
          const beforePath = getPath()
          try {
            await win.flymdOpenFile(e.path)
          } catch {
            // 鍥為€€鍒板師鏈夊洖璋冿紝閬垮厤鍔熻兘瀹屽叏澶辨晥
            try { await state.opts?.onOpenFile(e.path) } catch {}
          }

          const afterPath = getPath()
          const getMode = () => {
            try { return typeof win.flymdGetMode === 'function' ? win.flymdGetMode() : null } catch { return null }
          }
          const getWysiwyg = () => {
            try { return typeof win.flymdGetWysiwygEnabled === 'function' ? !!win.flymdGetWysiwygEnabled() : false } catch { return false }
          }

          // 浠呭湪鈥滅湡姝ｅ垏鎹㈠埌浜嗙洰鏍囨枃妗ｂ€濅笖褰撳墠涓嶅湪绾枃鏈紪杈戞€佹椂锛屾墠妯℃嫙 Ctrl+E 閫昏緫
          const shouldToggle =
            afterPath && afterPath === e.path && afterPath !== beforePath &&
            (getMode() !== 'edit' || getWysiwyg())

          if (shouldToggle && typeof win.flymdToggleModeShortcut === 'function') {
            try { await win.flymdToggleModeShortcut() } catch {}
          }
          return
        }

        // 鏅€氬崟鍑伙細鑻ュ鏍囩绯荤粺宸叉寕閽╋紝鍒欓€氳繃 flymdOpenFile 鎵撳紑锛涘惁鍒欐部鐢ㄦ棫琛屼负
        if (hasFlyOpen) {
          try {
            await win.flymdOpenFile(e.path)
          } catch {
            try { await state.opts?.onOpenFile(e.path) } catch {}
          }
        } else {
          try { await state.opts?.onOpenFile(e.path) } catch {}
        }
      })
      // 双击打开：优先尝试 flymdOpenFile，其次调用 onOpenFile
      row.addEventListener('dblclick', async (ev) => {
        try {
          if ((ev as MouseEvent).button !== 0) return
        } catch {}
        const win = (window as any)
        const hasFlyOpen = !!(win && typeof win.flymdOpenFile === 'function')
        if (hasFlyOpen) {
          try {
            await win.flymdOpenFile(e.path)
          } catch {
            try { await state.opts?.onOpenFile(e.path) } catch {}
          }
        } else {
          try { await state.opts?.onOpenFile(e.path) } catch {}
        }
      })

      row.setAttribute('draggable','true')

      parent.appendChild(row)
    }
  }
async function renderRoot(root: string) {
  if (!state.container) return
  state.container.innerHTML = ''
  const topRow = document.createElement('div')
  topRow.className = 'lib-node lib-dir'
  ;(topRow as any).dataset.path = root
  const tg = makeTg(); const ico = makeFolderIcon(root); const label = document.createElement('span'); label.className='lib-name'; label.textContent = displayNameForRoot(root) || root
  topRow.appendChild(tg); topRow.appendChild(ico); topRow.appendChild(label)
  const kids = document.createElement('div')
  kids.className = 'lib-children'
  state.container.appendChild(topRow)
  state.container.appendChild(kids)
  const rootExpanded = state.expanded.has(root)
  topRow.classList.toggle('expanded', rootExpanded)
  kids.style.display = rootExpanded ? '' : 'none'
  if (rootExpanded) await buildDir(root, root, kids)

  try {
    if (state.selected) {
      const all = Array.from(state.container.querySelectorAll('.lib-node')) as HTMLElement[]
      const hit = all.find((el) => (el as any).dataset?.path === state.selected)
      if (hit) { hit.classList.add('selected') }
    }
  } catch {}

  // 鏍硅妭鐐圭殑鎷栨斁澶勭悊
  topRow.addEventListener('dragover', (ev) => {
    ev.preventDefault()
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
    topRow.classList.add('selected')
    console.log('[鎷栧姩] 鎷栧姩鍒版牴鏂囦欢澶?', root)
  })
  topRow.addEventListener('dragenter', (ev) => { try { ev.preventDefault(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'; topRow.classList.add('selected') } catch {} })
  topRow.addEventListener('dragleave', () => { topRow.classList.remove('selected') })
  topRow.addEventListener('drop', async (ev) => {
    try {
      ev.preventDefault(); topRow.classList.remove('selected')
      const src = ev.dataTransfer?.getData('text/plain') || ''
      if (!src) return
      const dst = join(root, nameOf(src))
      if (src === dst) return
      if (!isInside(root, src) || !isInside(root, dst)) return alert(t('ft.move.within'))
      let finalDst = dst
      if (await exists(dst)) {
        const choice = await conflictModal(t('ft.exists'), [t('action.overwrite'), t('action.renameAuto'), t('action.cancel')], 1)
        if (choice === 2) return
        if (choice === 1) {
          const nm = nameOf(src)
          const stem = nm.replace(/(\.[^.]+)$/,''); const ext = nm.match(/(\.[^.]+)$/)?.[1] || ''
          let i=1, cand=''
          do { cand = `${stem} ${++i}${ext}` } while (await exists(join(root, cand)))
          finalDst = join(root, cand)
          await moveFileSafe(src, finalDst)
        } else {
          await moveFileSafe(src, dst)
        }
      } else {
        await moveFileSafe(src, dst)
      }
      try { await state.opts?.onMoved?.(src, finalDst) } catch {}
      await refresh()
      console.log('[drag] move done:', src, '->', finalDst)
    } catch (err) { console.error('[drag] move failed:', err) }
  })

  topRow.addEventListener('click', async () => {
    const was = state.expanded.has(root)
    const now = !was
    setExpandedState(root, now)
    kids.style.display = now ? '' : 'none'
    topRow.classList.toggle('expanded', now)
    if (now && kids.childElementCount === 0) await buildDir(root, root, kids)
  })
}

// 鍐呴儴鍒锋柊鍑芥暟锛屼笉閲嶆柊璁剧疆鐩戝惉

async function refreshTree() {
  const root = await state.opts!.getRoot()
  if (!root) {
    if (state.container) state.container.innerHTML = ''
    if (state.unwatch) { try { state.unwatch() } catch {} }
    state.unwatch = null
    state.watching = false
    state.currentRoot = null
    return
  }

  if (state.currentRoot && state.currentRoot !== root && state.unwatch) {
    try { state.unwatch() } catch {}
    state.unwatch = null
    state.watching = false
  }

  state.currentRoot = root
  restoreExpandedState(root)
  try { hasDocCache.clear(); hasDocPending.clear() } catch {}
  await renderRoot(root)

  if (!state.watching) {
    try {
      const stop = await watchImmediate(root, async () => {
        try { await refreshTree() } catch (err) { console.error('[watch] refresh failed:', err) }
      }, { recursive: true })
      state.unwatch = () => { try { stop() } catch {} }
      state.watching = true
      console.log('[watch] started:', root)
    } catch (err) {
      console.error('[watch] start failed:', err)
    }
  }
}

async function init(container: HTMLElement, opts: FileTreeOptions) {
  state.container = container
  state.opts = opts
  loadFolderOrder()
  try { container.addEventListener('dragover', (ev) => { ev.preventDefault() }) } catch {}
  await refreshTree()
}

async function newFileInSelected() {
  const root = await state.opts!.getRoot()
  if (!root) return
  const dir = state.selectedIsDir ? (state.selected || root) : base(state.selected || root)
  const p = await newFileSafe(dir)
  if (state.opts?.onOpenNewFile) await state.opts.onOpenNewFile(p); else await state.opts!.onOpenFile(p)
  await refresh()
}

async function newFolderInSelected() {
  const root = await state.opts!.getRoot(); if (!root) return
  const dir = state.selectedIsDir ? (state.selected || root) : base(state.selected || root)
  await newFolderSafe(dir)
  await refresh()
}

async function conflictModal(title: string, actions: string[], defaultIndex = 1): Promise<number> {
  return await new Promise<number>((resolve) => {
    try {
      let dom = document.getElementById('ft-modal') as HTMLDivElement | null
      if (!dom) {
        dom = document.createElement('div'); dom.id='ft-modal'; dom.style.position='fixed'; dom.style.inset='0'; dom.style.background='rgba(0,0,0,0.35)'; dom.style.display='flex'; dom.style.alignItems='center'; dom.style.justifyContent='center'; dom.style.zIndex='9999'
        const box = document.createElement('div'); box.className='ft-box'; box.style.background='var(--bg)'; box.style.color='var(--fg)'; box.style.border='1px solid var(--border)'; box.style.borderRadius='12px'; box.style.boxShadow='0 12px 36px rgba(0,0,0,0.2)'; box.style.minWidth='320px'; box.style.maxWidth='80vw'
        const hd = document.createElement('div'); hd.style.padding='12px 16px'; hd.style.fontWeight='600'; hd.style.borderBottom='1px solid var(--border)'; box.appendChild(hd)
        const bd = document.createElement('div'); bd.style.padding='14px 16px'; box.appendChild(bd)
        const ft = document.createElement('div'); ft.style.display='flex'; ft.style.gap='8px'; ft.style.justifyContent='flex-end'; ft.style.padding='8px 12px'; ft.style.borderTop='1px solid var(--border)'; box.appendChild(ft)
        dom.appendChild(box)
        document.body.appendChild(dom)
      }
      const box = dom.firstElementChild as HTMLDivElement
      const hd = box.children[0] as HTMLDivElement
      const bd = box.children[1] as HTMLDivElement
      const ft = box.children[2] as HTMLDivElement
      hd.textContent = title
      bd.textContent = t('ft.conflict.prompt')
      ft.innerHTML = ''
      actions.forEach((txt, idx) => {
        const b = document.createElement('button') as HTMLButtonElement
        b.textContent = txt
        b.style.border='1px solid var(--border)'; b.style.borderRadius='8px'; b.style.padding='6px 12px'; b.style.background= idx===defaultIndex ? '#2563eb' : 'rgba(127,127,127,0.08)'; b.style.color = idx===defaultIndex ? '#fff' : 'var(--fg)'
        b.addEventListener('click', () => { dom!.style.display='none'; resolve(idx) })
        ft.appendChild(b)
      })
      dom.style.display='flex'
    } catch { resolve(defaultIndex) }
  })
}

// 24 ?????
export const FOLDER_ICONS = ['\u{1F4C1}', '\u{1F4C2}', '\u{1F5C2}\uFE0F', '\u{1F4E6}', '\u{1F5C3}\uFE0F', '\u{1F5C4}\uFE0F', '\u{1F4C4}', '\u{1F4C3}', '\u{1F4D2}', '\u{1F4D3}', '\u{1F4D4}', '\u{1F4D5}', '\u{1F4D7}', '\u{1F4D8}', '\u{1F4D9}', '\u{1F4DA}', '\u{2B50}', '\u{1F31F}', '\u{1F516}', '\u{1F3F7}\uFE0F', '\u{2705}', '\u{2611}\uFE0F', '\u{1F512}', '\u{1F513}'];

export async function folderIconModal(folderName: string, icons: string[]): Promise<number | null> {
  return await new Promise<number | null>((resolve) => {
    try {
      let dom = document.getElementById('folder-icon-modal') as HTMLDivElement | null
      if (!dom) {
        dom = document.createElement('div'); dom.id='folder-icon-modal'; dom.style.position='fixed'; dom.style.inset='0'; dom.style.background='rgba(0,0,0,0.35)'; dom.style.display='flex'; dom.style.alignItems='center'; dom.style.justifyContent='center'; dom.style.zIndex='9999'
        const box = document.createElement('div'); box.className='ft-box'; box.style.background='var(--bg)'; box.style.color='var(--fg)'; box.style.border='1px solid var(--border)'; box.style.borderRadius='12px'; box.style.boxShadow='0 12px 36px rgba(0,0,0,0.2)'; box.style.minWidth='320px'; box.style.maxWidth='80vw'
        const hd = document.createElement('div'); hd.style.padding='12px 16px'; hd.style.fontWeight='600'; hd.style.borderBottom='1px solid var(--border)'; box.appendChild(hd)
        const bd = document.createElement('div'); bd.style.padding='14px 16px'; bd.style.display='grid'; bd.style.gridTemplateColumns='repeat(8, 1fr)'; bd.style.gap='8px'; box.appendChild(bd)
        const ft = document.createElement('div'); ft.style.display='flex'; ft.style.gap='8px'; ft.style.justifyContent='flex-end'; ft.style.padding='8px 12px'; ft.style.borderTop='1px solid var(--border)'; box.appendChild(ft)
        dom.appendChild(box)
        document.body.appendChild(dom)
      }
      const box = dom.firstElementChild as HTMLDivElement
      const hd = box.children[0] as HTMLDivElement
      const bd = box.children[1] as HTMLDivElement
      const ft = box.children[2] as HTMLDivElement
      hd.textContent = `${folderName} - 閫夋嫨鍥炬爣`
      bd.innerHTML = ''
      icons.forEach((icon, idx) => {
        const btn = document.createElement('button')
        btn.textContent = icon
        btn.style.fontSize = '24px'
        btn.style.width = '48px'
        btn.style.height = '48px'
        btn.style.border = '1px solid var(--border)'
        btn.style.borderRadius = '8px'
        btn.style.background = 'rgba(127,127,127,0.04)'
        btn.style.cursor = 'pointer'
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(127,127,127,0.12)' })
        btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(127,127,127,0.04)' })
        btn.addEventListener('click', () => { dom!.style.display='none'; resolve(idx) })
        bd.appendChild(btn)
      })
      ft.innerHTML = ''
      const cancelBtn = document.createElement('button')
      cancelBtn.textContent = '鍙栨秷'
      cancelBtn.style.border='1px solid var(--border)'; cancelBtn.style.borderRadius='8px'; cancelBtn.style.padding='6px 12px'; cancelBtn.style.background='rgba(127,127,127,0.08)'; cancelBtn.style.color='var(--fg)'
      cancelBtn.addEventListener('click', () => { dom!.style.display='none'; resolve(null) })
      ft.appendChild(cancelBtn)
      dom.style.display='flex'
    } catch { resolve(null) }
  })
}

export const fileTree: FileTreeAPI = {
  init, refresh,
  getSelectedDir: () => (state.selectedIsDir ? (state.selected || null) : (state.selected ? base(state.selected) : null)),
  newFileInSelected, newFolderInSelected,
  setSort: (mode) => { state.sortMode = mode },
}

export default fileTree




