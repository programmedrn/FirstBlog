// 편집기 페이지에 트레이 앱 전용 기능 두 가지만 열어 준다.
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('postEditorNative', {
  pickHtml: () => ipcRenderer.invoke('pick-html'),         // 파일 선택 창 → Windows 경로
  pathForFile: (file) => webUtils.getPathForFile(file),    // 끌어다 놓은 파일의 경로
});
