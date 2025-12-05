const prefix = 'flymd_store_'

export class Store {
  name: string
  constructor(name: string) {
    this.name = name || 'default'
  }

  static async load(name: string): Promise<Store> {
    return new Store(name)
  }

  private key(): string {
    return `${prefix}${this.name}`
  }

  private loadData(): Record<string, any> {
    try {
      const raw = localStorage.getItem(this.key())
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  private saveData(data: Record<string, any>): void {
    localStorage.setItem(this.key(), JSON.stringify(data))
  }

  async set(key: string, value: any): Promise<void> {
    const data = this.loadData()
    data[key] = value
    this.saveData(data)
  }

  async get<T>(key: string): Promise<T | null> {
    const data = this.loadData()
    return (data as any)[key] ?? null
  }

  async delete(key: string): Promise<void> {
    const data = this.loadData()
    delete data[key]
    this.saveData(data)
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.key())
  }

  async save(): Promise<void> {
    return
  }
}
