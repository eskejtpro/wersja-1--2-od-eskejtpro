const {_electron:electron}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const exe=process.env.GYM_SMOKE_EXE;const dir=process.env.GYM_SMOKE_DATA;const report=process.env.GYM_PROBE_REPORT||'release-probe';
const env={...process.env,GYMTRACKER_DATA_DIR:dir};delete env.ELECTRON_RUN_AS_NODE;
(async()=>{let app;try{
 app=await electron.launch({executablePath:exe,args:[],env,timeout:120000});const page=await app.firstWindow();await page.locator('#sidebar-nav-plan').waitFor();
 for(const v of ['stats','muscle','weight','cycles','exercises','settings','python','plan']){await page.locator('#sidebar-nav-'+v).click();assert.ok(await page.locator('h1').textContent());}
 const file=path.join(dir,'workout_data.json');const before=JSON.parse(fs.readFileSync(file));await page.locator('#btn-add-week').click();await page.waitForFunction(n=>JSON.parse(localStorage.getItem('gymtracker_windows_data_v1')).weeks.length===n,before.weeks.length+1);await app.close();app=null;
 assert.equal(JSON.parse(fs.readFileSync(file)).weeks.length,before.weeks.length+1);
 app=await electron.launch({executablePath:exe,args:[],env,timeout:120000});const again=await app.firstWindow();await again.locator('#sidebar-nav-plan').waitFor();assert.equal(await again.locator('[id^=btn-week-]').count(),before.weeks.length+1);await app.close();app=null;
 fs.writeFileSync(path.resolve(__dirname,'../../reports',report+'.json'),JSON.stringify({status:'PASS',exe,dataDir:dir,views:8,restart:true,save:true,weeks:before.weeks.length+1},null,2));console.log('PASS '+report);
 }finally{if(app)await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
