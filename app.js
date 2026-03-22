App({
  onLaunch: function () {
    console.log('App Launch')
    // Load Montserrat font globally
    wx.loadFontFace({
      family: 'Montserrat',
      source: 'url("/assets/fonts/static/Montserrat-Regular.ttf")',
      global: true,
      scopes: ['native', 'webview'],
      success: () => console.log('[Fonts] Montserrat-Regular loaded'),
      fail: (err) => console.error('[Fonts] Montserrat-Regular load failed', err)
    });
    // Load Montserrat Bold if available
    wx.loadFontFace({
      family: 'Montserrat',
      source: 'url("/assets/fonts/static/Montserrat-Bold.ttf")',
      global: true,
      scopes: ['native', 'webview'],
      success: () => console.log('[Fonts] Montserrat-Bold loaded'),
      fail: (err) => console.warn('[Fonts] Montserrat-Bold skip (not found or failed)')
    });
  }
})
