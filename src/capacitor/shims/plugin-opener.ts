export async function openUrl(url: string): Promise<void> {
  window.open(url, '_blank')
}

export async function openPath(path: string): Promise<void> {
  // In webview we can only try to open as url
  window.open(path, '_blank')
}
