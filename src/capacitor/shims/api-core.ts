export async function invoke<T = any>(_cmd: string, _args?: Record<string, any>): Promise<T> {
  throw new Error('tauri invoke is not available on Capacitor build')
}

export function convertFileSrc(src: string): string {
  return src
}
