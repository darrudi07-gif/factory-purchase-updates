const {contextBridge, ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktopUpdater',{
 check:()=>ipcRenderer.invoke('check-update'),
 onStatus:(fn)=>ipcRenderer.on('update-status',(_event,message)=>fn(message))
});
