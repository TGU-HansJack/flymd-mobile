import { Filesystem, Directory } from '@capacitor/filesystem'
import Saf from '../saf'

export enum BaseDirectory {
  AppData = 'appData',
  AppLocalData = 'appLocalData',
  Document = 'document',
  Desktop = 'desktop',
  Home = 'home'
}

type DirOption = { dir?: BaseDirectory }

function resolveDirectory(dir?: BaseDirectory): Directory {
  switch (dir) {
    case BaseDirectory.AppData:
    case BaseDirectory.AppLocalData:
      return Directory.Data
    case BaseDirectory.Document:
      return Directory.Documents
    default:
      return Directory.Data
  }
}

function normalizePath(path: string): string {
  if (!path) return ''
  return path.replace(/^file:\/\//, '').replace(/^\/+/, '')
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64)
  const len = bin.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function uint8ArrayToBase64(data: Uint8Array | number[]): string {
  const arr = data instanceof Uint8Array ? data : Uint8Array.from(data)
  let binary = ''
  arr.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

export async function readTextFile(path: string, options?: DirOption): Promise<string> {
  if (path.startsWith('content://')) {
    const { content } = await Saf.readUri({ uri: path })
    return content
  }
  const res = await Filesystem.readFile({
    path: normalizePath(path),
    directory: resolveDirectory(options?.dir),
    encoding: 'utf-8'
  })
  return res.data ?? ''
}

export async function writeTextFile(path: string, data: string, options?: DirOption): Promise<void> {
  if (path.startsWith('content://')) {
    await Saf.writeUri({ uri: path, content: data })
    return
  }
  await Filesystem.writeFile({
    path: normalizePath(path),
    directory: resolveDirectory(options?.dir),
    data,
    encoding: 'utf-8',
    recursive: true
  })
}

export async function readFile(path: string, options?: DirOption): Promise<Uint8Array> {
  if (path.startsWith('content://')) {
    const { content } = await Saf.readUri({ uri: path })
    return new TextEncoder().encode(content)
  }
  const res = await Filesystem.readFile({
    path: normalizePath(path),
    directory: resolveDirectory(options?.dir)
  })
  const data = typeof res.data === 'string' ? res.data : ''
  return base64ToUint8Array(data)
}

export async function writeFile(path: string, data: Uint8Array | number[], options?: DirOption): Promise<void> {
  if (path.startsWith('content://')) {
    await Saf.writeUri({ uri: path, content: new TextDecoder().decode(Uint8Array.from(data)) })
    return
  }
  await Filesystem.writeFile({
    path: normalizePath(path),
    directory: resolveDirectory(options?.dir),
    data: uint8ArrayToBase64(data),
    recursive: true
  })
}

export async function readDir(path: string, options?: DirOption): Promise<Array<{ name: string; path: string }>> {
  if (path.startsWith('content://')) {
    const { entries } = await Saf.listDir({ uri: path })
    return entries.map((e) => ({ name: e.name, path: e.uri }))
  }
  const res = await Filesystem.readdir({
    path: normalizePath(path),
    directory: resolveDirectory(options?.dir)
  })
  return (res.files || []).map((f) => ({
    name: f.name,
    path: `${path}/${f.name}`
  }))
}

export async function mkdir(path: string, options?: DirOption & { recursive?: boolean }): Promise<void> {
  await Filesystem.mkdir({
    path: normalizePath(path),
    directory: resolveDirectory(options?.dir),
    recursive: options?.recursive ?? true
  })
}

export async function rename(oldPath: string, newPath: string, options?: DirOption): Promise<void> {
  await Filesystem.rename({
    from: normalizePath(oldPath),
    to: normalizePath(newPath),
    directory: resolveDirectory(options?.dir)
  })
}

export async function remove(path: string, options?: DirOption): Promise<void> {
  await Filesystem.deleteFile({
    path: normalizePath(path),
    directory: resolveDirectory(options?.dir)
  })
}

export async function exists(path: string, options?: DirOption): Promise<boolean> {
  try {
    await Filesystem.stat({ path: normalizePath(path), directory: resolveDirectory(options?.dir) })
    return true
  } catch {
    return false
  }
}

export async function copyFile(from: string, to: string, options?: DirOption): Promise<void> {
  await Filesystem.copy({
    from: normalizePath(from),
    to: normalizePath(to),
    directory: resolveDirectory(options?.dir)
  })
}

export async function stat(path: string, options?: DirOption): Promise<{
  size: number
  mtime: number | null
  ctime: number | null
  isDir: boolean
  isDirectory: boolean
  isFile: boolean
}> {
  if (path.startsWith('content://')) {
    const res = await Saf.stat({ uri: path })
    const isDir = res.isDir
    return { size: res.size, mtime: res.mtime, ctime: null, isDir, isDirectory: isDir, isFile: !isDir }
  }
  const res = await Filesystem.stat({
    path: normalizePath(path),
    directory: resolveDirectory(options?.dir)
  })
  const isDir = res.type === 'directory'
  return {
    size: res.size ?? 0,
    mtime: res.mtime ?? null,
    ctime: res.ctime ?? null,
    isDir,
    isDirectory: isDir,
    isFile: res.type === 'file'
  }
}

// watchImmediate is not supported on Capacitor; return a no-op disposer
export function watchImmediate(
  _path: string,
  _opts: any,
  _cb: (event: any) => void
): () => void {
  return () => {}
}

// Simplified file handle for log appenders
export async function open(
  path: string,
  options?: { write?: boolean; append?: boolean; truncate?: boolean; create?: boolean; baseDir?: BaseDirectory }
): Promise<{
  write: (data: Uint8Array | number[]) => Promise<void>
  read: () => Promise<Uint8Array>
  close: () => Promise<void>
}> {
  const dir = resolveDirectory(options?.baseDir)
  const normalized = normalizePath(path)

  if (options?.truncate) {
    await Filesystem.writeFile({ path: normalized, directory: dir, data: '', recursive: true })
  }

  return {
    async write(data: Uint8Array | number[]) {
      const base64 = uint8ArrayToBase64(data)
      if (options?.append) {
        await Filesystem.appendFile({ path: normalized, directory: dir, data: base64 })
      } else {
        await Filesystem.writeFile({ path: normalized, directory: dir, data: base64, recursive: true })
      }
    },
    async read() {
      const res = await Filesystem.readFile({ path: normalized, directory: dir })
      return base64ToUint8Array(typeof res.data === 'string' ? res.data : '')
    },
    async close() {
      return
    }
  }
}
