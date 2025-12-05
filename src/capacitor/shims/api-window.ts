function noop() {}

export function getCurrentWindow() {
  return {
    hide: noop,
    show: noop,
    close: noop,
    setDecorations: noop,
    setFullscreen: noop,
    center: noop,
    maximize: noop,
    unmaximize: noop,
    setSize: noop,
    setAlwaysOnTop: noop,
    requestUserAttention: noop,
    onResized: () => ({ unsubscribe: noop }),
    onCloseRequested: (_cb: any) => ({ unsubscribe: noop })
  }
}

export async function currentMonitor(): Promise<null> {
  return null
}
