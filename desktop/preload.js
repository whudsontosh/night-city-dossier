'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desk', {
  platform: process.platform,
  serverInfo: () => ipcRenderer.invoke('server:info'),
  hostState: () => ipcRenderer.invoke('host:state'),
  tunnelStart: () => ipcRenderer.invoke('tunnel:start'),
  tunnelStop: () => ipcRenderer.invoke('tunnel:stop'),
  onTunnel: (fn) => { ipcRenderer.on('tunnel:status', (e, s) => fn(s)); },
  directStart: (port) => ipcRenderer.invoke('direct:start', port),
  directStop: () => ipcRenderer.invoke('direct:stop'),
  lanIps: () => ipcRenderer.invoke('net:lan'),
  publicIp: () => ipcRenderer.invoke('net:publicip'),
  backup: (kind, text) => ipcRenderer.invoke('backup:write', kind, text),
  openBackups: () => ipcRenderer.invoke('backup:open'),
  openData: () => ipcRenderer.invoke('data:open'),
  copy: (text) => ipcRenderer.invoke('clip:write', text),
  setMode: (mode) => ipcRenderer.invoke('mode:set', mode),
  openPlayerWindow: () => ipcRenderer.invoke('win:player'),
  savePdf: (name) => ipcRenderer.invoke('pdf:save', name),
  appVersion: () => ipcRenderer.invoke('app:version'),
  onUpdate: (fn) => { ipcRenderer.on('update:status', (e, s) => fn(s)); },
  updateSkip: () => ipcRenderer.invoke('update:skip'),
});
