const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getQuotes: () => ipcRenderer.invoke("get-quotes"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (partialSettings) =>
    ipcRenderer.invoke("save-settings", partialSettings),
  getHistory: () => ipcRenderer.invoke("get-history"),
  logSession: (session) => ipcRenderer.invoke("log-session", session),
});