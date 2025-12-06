import Saf from '../saf'
import { Dialog } from '@capacitor/dialog'

type OpenDialogFilter = { name?: string; extensions?: string[] }

export async function open(options?: {
  multiple?: boolean
  directory?: boolean
  filters?: OpenDialogFilter[]
}): Promise<string | null> {
  if (options?.directory) {
    const { uri } = await Saf.pickDirectory()
    return uri
  } else {
    const { uri } = await Saf.pickDocument()
    return uri
  }
}

export async function save(options?: { defaultPath?: string; filters?: OpenDialogFilter[] }): Promise<string | null> {
  const filename = options?.defaultPath || 'untitled.md'
  const { uri } = await Saf.createDocument({ filename, mimeType: 'text/markdown' })
  return uri
}

export async function ask(message: string | { title?: string; message?: string }, _opts?: { okLabel?: string; cancelLabel?: string }): Promise<boolean> {
  const msg = typeof message === 'string' ? message : message.message || message.title || ''
  const res = await Dialog.confirm({ message: msg })
  return res.value ?? false
}
