export enum ResponseType {
  JSON = 'json',
  TEXT = 'text',
  BINARY = 'binary'
}

export class Body {
  static formData(_data: any): any {
    return _data
  }
}

export async function fetch(url: string, options?: any): Promise<any> {
  const res = await window.fetch(url, options)
  const type = options?.responseType || ResponseType.JSON
  let data: any = null
  if (type === ResponseType.TEXT) data = await res.text()
  else if (type === ResponseType.BINARY) data = new Uint8Array(await res.arrayBuffer())
  else data = await res.json()
  return {
    status: res.status,
    ok: res.ok,
    data
  }
}
