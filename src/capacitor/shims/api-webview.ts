export function getCurrentWebview() {
  return {
    windowLabel: 'webview',
    onNavigation: () => ({ unsubscribe: () => {} })
  }
}
