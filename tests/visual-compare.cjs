const {_electron:electron,chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');const {PNG}=require('pngjs');
(async()=>{
 const pixelmatch=(await import('pixelmatch')).default;
 const root=path.resolve(__dirname,'../..');const out=path.join(root,'reports','visual');fs.mkdirSync(out,{recursive:true});
 const module={exports:{}};vm.runInNewContext(ts.transpile(fs.readFileSync(path.join(root,'build/baseline-react/src/data/initialData.ts'),'utf8'),{module:ts.ModuleKind.CommonJS}),{exports:module.exports,module});
 const data=module.exports.initialGymData;data.settings.autoBackupEnabled=false;data.settings.lastBackupTime='';
 const dir=fs.mkdtempSync(path.join(root,'build/visual-data-'));fs.writeFileSync(path.join(dir,'workout_data.json'),JSON.stringify(data));
 const env={...process.env,GYMTRACKER_DATA_DIR:dir};delete env.ELECTRON_RUN_AS_NODE;
 let desktop,browser;
 try{
  browser=await chromium.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
  const context=await browser.newContext({viewport:{width:1440,height:960},locale:'pl-PL',deviceScaleFactor:1});
  await context.addInitScript(data=>{localStorage.setItem('gymtracker_windows_data_v1',JSON.stringify(data));localStorage.setItem('gymtracker_autobackups_v1','[]');},data);
  const web=await context.newPage();await web.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));await web.goto('http://127.0.0.1:3000/');
  desktop=await electron.launch({args:[path.join(__dirname,'..'),'--force-device-scale-factor=1'],env});const page=await desktop.firstWindow();await page.setViewportSize({width:1440,height:960});await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));await page.reload();
  const results=[];
  for(const view of ['plan','stats','muscle','weight','cycles','exercises','settings','python']){
   for(const p of [web,page]){await p.locator('#sidebar-nav-'+view).click();await p.evaluate(()=>document.fonts.ready);await p.mouse.move(1439,959);}
   // Dynamic save-status timestamps are masked in both otherwise unchanged applications.
   const a=await web.screenshot({path:path.join(out,'web-'+view+'.png'),animations:'disabled',mask:[web.getByText(/^Zapisano w JSON/)]});
   const b=await page.screenshot({path:path.join(out,'desktop-'+view+'.png'),scale:'css',animations:'disabled',mask:[page.getByText(/^Zapisano w JSON/)]});
   const pa=PNG.sync.read(a),pb=PNG.sync.read(b);const diff=new PNG({width:pa.width,height:pa.height});const count=pixelmatch(pa.data,pb.data,diff.data,pa.width,pa.height,{threshold:0.15});
   fs.writeFileSync(path.join(out,'diff-'+view+'.png'),PNG.sync.write(diff));
   const percent=count/(pa.width*pa.height)*100;results.push({view,pixels:count,percent,status:count===0?'PASS':'DIFFERENCES'});console.log(view+': '+percent.toFixed(4)+'% differing pixels');
  }
  fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify({viewport:{width:1440,height:960},threshold:0.15,masked:'save timestamp only',results},null,2));
 }finally{if(desktop)await desktop.close();if(browser)await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
