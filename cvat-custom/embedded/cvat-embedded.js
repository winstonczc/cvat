/* 被平台 iframe 嵌入时隐藏 CVAT 顶部导航；直接打开 CVAT 时保留。 */
(function () {
  try {
    if (window.self !== window.top) {
      document.documentElement.classList.add('cvat-embedded');
    }
  } catch (e) {
    // 跨域访问 window.top 可能抛异常；异常时按嵌入处理
    document.documentElement.classList.add('cvat-embedded');
  }
})();