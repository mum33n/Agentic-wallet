// popup.js — checks daemon status and shows active account

chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  const statusEl      = document.getElementById('status')
  const statusText    = document.getElementById('statusText')
  const instructions  = document.getElementById('instructions')
  const accountSection = document.getElementById('accountSection')

  if (response?.connected) {
    statusEl.className    = 'status connected'
    statusText.textContent = 'Daemon running'
    instructions.style.display = 'none'

    // Fetch active account from daemon
    chrome.runtime.sendMessage(
      { type: 'WALLET_REQUEST', id: 1, method: 'solana_connect', params: {} },
      (res) => {
        if (res?.result?.publicKey) {
          accountSection.style.display = 'block'
          const addr = res.result.publicKey
          document.getElementById('accountAddress').textContent =
            addr.slice(0, 8) + '...' + addr.slice(-8)
        }
      }
    )
  } else {
    statusEl.className    = 'status disconnected'
    statusText.textContent = 'Daemon not running'
  }
})
