// pages/scan/index.js
Page({
  data: {

  },
  onLoad: function (options) {

  },
  onShow: function () {

  },
  onScan: function () {
    wx.scanCode({
      onlyFromCamera: true,
      success(res) {
        const result = JSON.parse(res.result)
        wx.setStorageSync('id', result.id)
        wx.setStorageSync('key', result.key)
        wx.switchTab({
          url: '/pages/index/index',
        })
      }
    })
  }
})