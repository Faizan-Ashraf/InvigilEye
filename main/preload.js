const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
});

