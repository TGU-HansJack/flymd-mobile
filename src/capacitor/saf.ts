import { Capacitor, registerPlugin } from '@capacitor/core'

export type SafDocument = { uri: string; name?: string }

export interface SafPlugin {
  pickDocument(): Promise<SafDocument>
  createDocument(options: { filename: string; mimeType?: string }): Promise<SafDocument>
  readUri(options: { uri: string }): Promise<{ content: string }>
  writeUri(options: { uri: string; content: string }): Promise<void>
  persistPermission(options: { uri: string }): Promise<void>
}

// Web fallback: throw explicit error to keep failures obvious during development
const Saf = registerPlugin<SafPlugin>('Saf', {
  web: () =>
    ({
      pickDocument: async () => {
        throw new Error('SAF is only available on native Android runtime')
      },
      createDocument: async () => {
        throw new Error('SAF is only available on native Android runtime')
      },
      readUri: async () => {
        throw new Error('SAF is only available on native Android runtime')
      },
      writeUri: async () => {
        throw new Error('SAF is only available on native Android runtime')
      },
      persistPermission: async () => {}
    } satisfies Partial<SafPlugin> as SafPlugin)
})

export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform()
}

export default Saf
