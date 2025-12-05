import { Directory, Filesystem } from '@capacitor/filesystem'

function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`
}

export async function appLocalDataDir(): Promise<string> {
  const uri = await Filesystem.getUri({ directory: Directory.Data, path: '' })
  return withTrailingSlash(uri.uri || uri.path || 'data')
}

export async function homeDir(): Promise<string> {
  const uri = await Filesystem.getUri({ directory: Directory.Documents, path: '' })
  return withTrailingSlash(uri.uri || uri.path || 'documents')
}

export async function desktopDir(): Promise<string> {
  // Desktop concept not available; reuse documents
  return homeDir()
}

export function join(...parts: string[]): string {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/')
}
