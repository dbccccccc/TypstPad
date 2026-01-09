// Apply theme immediately to prevent flash
(function () {
  var mode = localStorage.getItem('theme-mode') || 'system'
  var isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (isDark) {
    document.documentElement.classList.add('dark')
    document.documentElement.style.colorScheme = 'dark'
  }
})()

