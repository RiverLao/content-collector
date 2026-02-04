// background.js - 后台服务

// 监听插件图标点击
chrome.action.onClicked.addListener(async (tab) => {
  // 插件图标被点击时不做任何事，依赖 popup
  // 这个文件主要用于未来扩展
})

console.log('第二大脑插件已加载')
