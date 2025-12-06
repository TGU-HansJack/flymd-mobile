/**
 * 自定义三按钮确认对话框
 */

// 对话框返回值类型
export type DialogResult = 'save' | 'discard' | 'cancel'

// WebDAV 同步冲突对话框返回值
export type ConflictResult = 'local' | 'remote' | 'cancel'
export type TwoChoiceResult = 'confirm' | 'cancel'

// 对话框样式
const dialogStyles = `
.custom-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  backdrop-filter: blur(4px);
  animation: dialogFadeIn 0.15s ease;
}

@keyframes dialogFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.custom-dialog-box {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
  animation: dialogSlideIn 0.2s ease;
}

@keyframes dialogSlideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.custom-dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--fg);
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-dialog-icon {
  font-size: 24px;
}

.custom-dialog-message {
  font-size: 14px;
  color: var(--fg);
  opacity: 0.85;
  line-height: 1.6;
  margin: 0 0 24px 0;
  white-space: pre-line;
}

.custom-dialog-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.custom-dialog-button {
  -webkit-app-region: no-drag;
  cursor: pointer;
  border: 1px solid var(--border);
  background: rgba(127, 127, 127, 0.08);
  color: var(--fg);
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s ease;
  min-width: 100px;
}

.custom-dialog-button:hover {
  background: rgba(127, 127, 127, 0.15);
  border-color: rgba(127, 127, 127, 0.35);
}

.custom-dialog-button:active {
  transform: scale(0.97);
}

.custom-dialog-button.primary {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.custom-dialog-button.primary:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.custom-dialog-button.danger {
  background: #dc2626;
  color: white;
  border-color: #dc2626;
}

.custom-dialog-button.danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}

.custom-dialog-button:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
`

// 注入样式到页面
function injectStyles() {
  const styleId = 'custom-dialog-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = dialogStyles
    document.head.appendChild(style)
  }
}

/**
 * 显示三按钮确认对话框
 * @param message 对话框消息
 * @param title 对话框标题
 * @returns Promise<DialogResult> - 'save': 保存并退出, 'discard': 直接退出, 'cancel': 取消
 */
export function showThreeButtonDialog(
  message: string,
  title: string = '退出确认'
): Promise<DialogResult> {
  return new Promise((resolve) => {
    // 注入样式
    injectStyles()

    // 创建对话框 DOM
    const overlay = document.createElement('div')
    overlay.className = 'custom-dialog-overlay'

    const box = document.createElement('div')
    box.className = 'custom-dialog-box'

    const titleEl = document.createElement('div')
    titleEl.className = 'custom-dialog-title'
    titleEl.innerHTML = `<span class="custom-dialog-icon"><i class="fa-solid fa-circle-info" aria-hidden="true"></i></span>${title}`

    const messageEl = document.createElement('div')
    messageEl.className = 'custom-dialog-message'
    messageEl.textContent = message

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'custom-dialog-buttons'

    // 创建三个按钮
    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'custom-dialog-button'
    cancelBtn.textContent = '取消'
    cancelBtn.onclick = () => {
      closeDialog('cancel')
    }

    const discardBtn = document.createElement('button')
    discardBtn.className = 'custom-dialog-button danger'
    discardBtn.textContent = '直接退出'
    discardBtn.onclick = () => {
      closeDialog('discard')
    }

    const saveBtn = document.createElement('button')
    saveBtn.className = 'custom-dialog-button primary'
    saveBtn.textContent = '保存并退出'
    saveBtn.onclick = () => {
      closeDialog('save')
    }

    buttonsContainer.appendChild(cancelBtn)
    buttonsContainer.appendChild(discardBtn)
    buttonsContainer.appendChild(saveBtn)

    box.appendChild(titleEl)
    box.appendChild(messageEl)
    box.appendChild(buttonsContainer)
    overlay.appendChild(box)

    // 添加到页面
    document.body.appendChild(overlay)

    // 聚焦到保存按钮（默认操作）
    setTimeout(() => saveBtn.focus(), 50)

    // 关闭对话框的函数
    function closeDialog(result: DialogResult) {
      overlay.style.animation = 'dialogFadeIn 0.1s ease reverse'
      setTimeout(() => {
        overlay.remove()
        resolve(result)
      }, 100)
    }

    // 点击遮罩层关闭（视为取消）
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeDialog('cancel')
      }
    }

    // ESC 键取消
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog('cancel')
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
  })
}

/**
 * WebDAV 文件冲突对话框（本地和远程都已修改）
 * @param filename 文件名
 * @returns Promise<ConflictResult> - 'local': 保留本地, 'remote': 保留远程, 'cancel': 取消
 */
export function showConflictDialog(filename: string): Promise<ConflictResult> {
  return new Promise((resolve) => {
    injectStyles()

    const overlay = document.createElement('div')
    overlay.className = 'custom-dialog-overlay'

    const box = document.createElement('div')
    box.className = 'custom-dialog-box'

    const titleEl = document.createElement('div')
    titleEl.className = 'custom-dialog-title'
    titleEl.innerHTML = `<span class="custom-dialog-icon"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></span>文件冲突`

    const messageEl = document.createElement('div')
    messageEl.className = 'custom-dialog-message'
    messageEl.textContent = `文件：${filename}\n\n本地和远程都已修改此文件。请选择要保留的版本：`

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'custom-dialog-buttons'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'custom-dialog-button'
    cancelBtn.textContent = '取消'
    cancelBtn.onclick = () => closeDialog('cancel')

    const remoteBtn = document.createElement('button')
    remoteBtn.className = 'custom-dialog-button'
    remoteBtn.textContent = '保留远程版本'
    remoteBtn.onclick = () => closeDialog('remote')

    const localBtn = document.createElement('button')
    localBtn.className = 'custom-dialog-button primary'
    localBtn.textContent = '保留本地版本'
    localBtn.onclick = () => closeDialog('local')

    buttonsContainer.appendChild(cancelBtn)
    buttonsContainer.appendChild(remoteBtn)
    buttonsContainer.appendChild(localBtn)

    box.appendChild(titleEl)
    box.appendChild(messageEl)
    box.appendChild(buttonsContainer)
    overlay.appendChild(box)
    document.body.appendChild(overlay)

    setTimeout(() => localBtn.focus(), 50)

    function closeDialog(result: ConflictResult) {
      overlay.style.animation = 'dialogFadeIn 0.1s ease reverse'
      setTimeout(() => {
        overlay.remove()
        resolve(result)
      }, 100)
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) closeDialog('cancel')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog('cancel')
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
  })
}

/**
 * WebDAV 本地文件删除确认对话框
 * @param filename 文件名
 * @returns Promise<TwoChoiceResult> - 'confirm': 同步删除远程, 'cancel': 从远程恢复
 */
export function showLocalDeleteDialog(filename: string): Promise<TwoChoiceResult> {
  return new Promise((resolve) => {
    injectStyles()

    const overlay = document.createElement('div')
    overlay.className = 'custom-dialog-overlay'

    const box = document.createElement('div')
    box.className = 'custom-dialog-box'

    const titleEl = document.createElement('div')
    titleEl.className = 'custom-dialog-title'
    titleEl.innerHTML = `<span class="custom-dialog-icon"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></span>文件已删除`

    const messageEl = document.createElement('div')
    messageEl.className = 'custom-dialog-message'
    messageEl.textContent = `文件：${filename}\n\n此文件在上次同步后被本地删除。请选择操作：`

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'custom-dialog-buttons'

    const restoreBtn = document.createElement('button')
    restoreBtn.className = 'custom-dialog-button'
    restoreBtn.textContent = '从远程恢复'
    restoreBtn.onclick = () => closeDialog('cancel')

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'custom-dialog-button danger'
    deleteBtn.textContent = '同步删除远程'
    deleteBtn.onclick = () => closeDialog('confirm')

    buttonsContainer.appendChild(restoreBtn)
    buttonsContainer.appendChild(deleteBtn)

    box.appendChild(titleEl)
    box.appendChild(messageEl)
    box.appendChild(buttonsContainer)
    overlay.appendChild(box)
    document.body.appendChild(overlay)

    setTimeout(() => deleteBtn.focus(), 50)

    function closeDialog(result: TwoChoiceResult) {
      overlay.style.animation = 'dialogFadeIn 0.1s ease reverse'
      setTimeout(() => {
        overlay.remove()
        resolve(result)
      }, 100)
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) closeDialog('cancel')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog('cancel')
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
  })
}

/**
 * WebDAV 远程文件删除确认对话框
 * @param filename 文件名
 * @returns Promise<TwoChoiceResult> - 'confirm': 同步删除本地, 'cancel': 保留本地
 */
export function showRemoteDeleteDialog(filename: string): Promise<TwoChoiceResult> {
  return new Promise((resolve) => {
    injectStyles()

    const overlay = document.createElement('div')
    overlay.className = 'custom-dialog-overlay'

    const box = document.createElement('div')
    box.className = 'custom-dialog-box'

    const titleEl = document.createElement('div')
    titleEl.className = 'custom-dialog-title'
    titleEl.innerHTML = `<span class="custom-dialog-icon"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></span>远程文件已删除`

    const messageEl = document.createElement('div')
    messageEl.className = 'custom-dialog-message'
    messageEl.textContent = `文件：${filename}\n\n此文件在远程服务器上已不存在。请选择操作：`

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'custom-dialog-buttons'

    const keepBtn = document.createElement('button')
    keepBtn.className = 'custom-dialog-button'
    keepBtn.textContent = '保留本地文件'
    keepBtn.onclick = () => closeDialog('cancel')

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'custom-dialog-button danger'
    deleteBtn.textContent = '同步删除本地'
    deleteBtn.onclick = () => closeDialog('confirm')

    buttonsContainer.appendChild(keepBtn)
    buttonsContainer.appendChild(deleteBtn)

    box.appendChild(titleEl)
    box.appendChild(messageEl)
    box.appendChild(buttonsContainer)
    overlay.appendChild(box)
    document.body.appendChild(overlay)

    setTimeout(() => keepBtn.focus(), 50)

    function closeDialog(result: TwoChoiceResult) {
      overlay.style.animation = 'dialogFadeIn 0.1s ease reverse'
      setTimeout(() => {
        overlay.remove()
        resolve(result)
      }, 100)
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) closeDialog('cancel')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog('cancel')
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
  })
}

/**
 * WebDAV safe 模式：本地存在但远端不存在时的上传确认对话框
 * @param filename 文件名
 * @returns Promise<TwoChoiceResult> - 'confirm': 上传本地到远端, 'cancel': 仅保留本地
 */
export function showUploadMissingRemoteDialog(filename: string): Promise<TwoChoiceResult> {
  return new Promise((resolve) => {
    injectStyles()

    const overlay = document.createElement('div')
    overlay.className = 'custom-dialog-overlay'

    const box = document.createElement('div')
    box.className = 'custom-dialog-box'

    const titleEl = document.createElement('div')
    titleEl.className = 'custom-dialog-title'
    titleEl.innerHTML = `<span class="custom-dialog-icon"><i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i></span>上传本地文件到远端`

    const messageEl = document.createElement('div')
    messageEl.className = 'custom-dialog-message'
    messageEl.textContent = `文件：${filename}\n\n本地存在该文件，但远端当前不存在（可能是新建，也可能是被其他设备删除）。请选择操作：`

    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'custom-dialog-buttons'

    const keepLocalBtn = document.createElement('button')
    keepLocalBtn.className = 'custom-dialog-button'
    keepLocalBtn.textContent = '仅保留本地'
    keepLocalBtn.onclick = () => closeDialog('cancel')

    const uploadBtn = document.createElement('button')
    uploadBtn.className = 'custom-dialog-button primary'
    uploadBtn.textContent = '上传到远端'
    uploadBtn.onclick = () => closeDialog('confirm')

    buttonsContainer.appendChild(keepLocalBtn)
    buttonsContainer.appendChild(uploadBtn)

    box.appendChild(titleEl)
    box.appendChild(messageEl)
    box.appendChild(buttonsContainer)
    overlay.appendChild(box)
    document.body.appendChild(overlay)

    setTimeout(() => uploadBtn.focus(), 50)

    function closeDialog(result: TwoChoiceResult) {
      overlay.style.animation = 'dialogFadeIn 0.1s ease reverse'
      setTimeout(() => {
        overlay.remove()
        resolve(result)
      }, 100)
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) closeDialog('cancel')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog('cancel')
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
  })
}
