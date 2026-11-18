const {app, BrowserWindow, ipcMain, protocol, net, shell, dialog} = require('electron');
const {autoUpdater} = require('electron-updater');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

// Stable, secure origin across upgrades so IndexedDB is not reset by a changed file path.
protocol.registerSchemesAsPrivileged([{scheme:'factory',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
let win;
function status(message){if(win && !win.isDestroyed()) win.webContents.send('update-status',String(message));}
app.whenReady().then(async()=>{
  protocol.handle('factory', request=>{
    const u=new URL(request.url);
    if(u.hostname!=='local') return new Response('Not found',{status:404});
    const pathname=decodeURIComponent(u.pathname);
    if(pathname!=='/index.html' && pathname!=='/') return new Response('Not found',{status:404});
    return net.fetch(pathToFileURL(path.join(__dirname,'app','index.html')).toString());
  });
  win=new BrowserWindow({width:1350,height:900,minWidth:850,minHeight:650,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,partition:'persist:factory-purchase-v7'}});
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//.test(url)) shell.openExternal(url);return {action:'deny'};});
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('factory://local/')) event.preventDefault();});
  await win.loadURL('factory://local/index.html');
  autoUpdater.autoDownload=true;
  autoUpdater.autoInstallOnAppQuit=true;
  autoUpdater.on('checking-for-update',()=>status('در حال بررسی نسخه جدید…'));
  autoUpdater.on('update-available',i=>status('نسخه '+i.version+' پیدا شد؛ در حال دریافت…'));
  autoUpdater.on('update-not-available',()=>status('آخرین نسخه نصب است.'));
  autoUpdater.on('download-progress',p=>status('دریافت بروزرسانی: '+Math.round(p.percent)+'٪'));
  autoUpdater.on('error',e=>status('خطای بروزرسانی: '+e.message));
  autoUpdater.on('update-downloaded',async i=>{
    status('نسخه '+i.version+' دریافت شد.');
    const choice=await dialog.showMessageBox(win,{type:'question',buttons:['نصب و راه‌اندازی مجدد','بعداً'],defaultId:1,cancelId:1,title:'بروزرسانی آماده است',message:'نسخه جدید دریافت شد. قبل از نصب از اطلاعات پشتیبان بگیرید. نصب انجام شود؟'});
    if(choice.response===0) autoUpdater.quitAndInstall(false,true);
  });
  ipcMain.handle('check-update',async()=>{
    if(!app.isPackaged){status('در حالت توسعه بروزرسانی فعال نیست.');return;}
    try{await autoUpdater.checkForUpdates();}catch(e){status('بررسی ناموفق: '+e.message)}
  });
  if(app.isPackaged) setTimeout(()=>autoUpdater.checkForUpdates().catch(e=>status('بررسی ناموفق: '+e.message)),5000);
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin') app.quit()});
