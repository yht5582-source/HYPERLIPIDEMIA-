// e2e + engine checks for index.html (file://, headless Chromium via Playwright).
// Run: NODE_PATH=<dir with playwright> node tests.cjs
const {chromium}=require('playwright');const path=require('path');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m);}};
(async()=>{const b=await chromium.launch();const pg=await b.newPage();const errs=[];
pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>{errs.push('dialog:'+d.message());d.dismiss();});
await pg.goto('file://'+path.resolve(__dirname,'index.html'));
const R=await pg.evaluate(()=>{const o={};
 const base={age:50,sex:'f',tc:200,hdl:45,sbp:160,bpmed:true,dm:true,smoke:false,statinUse:false,egfr:90,bmi:35,ldl:120};
 o.pf=computePrevent(base).pct;o.pm=computePrevent({...base,sex:'m'}).pct;
 o.ascvd=computePrevent({...base,ascvd:true}).pct;o.cac=computePrevent({...base,cac:300}).pct;o.ldl190=computePrevent({...base,ldl:190}).pct;
 o.cases=CASES.map((c,i)=>{loadCase(i);return {htn:document.getElementById('htn').checked,want:!!c.fields.htn,baseline:document.getElementById('baseline').value,wantBase:String(c.fields.baseline??''),risk:latest.r.tw.risk,cards:document.querySelectorAll('#individualRx .rx-item').length};});
 o.int=[statinIntensity('atorvastatin',20),statinIntensity('atorvastatin',40),statinIntensity('rosuvastatin',5),statinIntensity('rosuvastatin',20),statinIntensity('pravastatin',20),statinIntensity('pitavastatin',2),statinIntensity('other',10)];
 // atorvastatin 80 labelled moderate: no "80 → 80" escalation, mismatch flagged
 loadCase(1);document.getElementById('statinDrug').value='atorvastatin';document.getElementById('statinDose').value='80';evaluate();
 o.ator80=document.getElementById('individualRx').textContent;o.sum80=document.getElementById('rxSummary').textContent;
 // 'other' treatment must not get a start-statin card
 loadCase(0);document.getElementById('treat').value='other';evaluate();o.other=document.getElementById('individualRx').textContent;
 // PCSK9 message has no markdown asterisks
 loadCase(2);o.pcsk=document.getElementById('individualRx').textContent;
 // reset restores defaults (htn checked) and default HDL message
 document.getElementById('resetBtn').click();o.resetHtn=document.getElementById('htn').checked;
 // US guide with no PREVENT target falls back to Taiwan goal for drug steps
 loadCase(0);document.getElementById('preventExcluded').checked=true;document.getElementById('guide').value='us';evaluate();o.usSum=document.getElementById('rxSummary').textContent;
 return o;});
ok(Math.abs(R.pf-9.20)<0.01,'PREVENT female 9.20 got '+R.pf);ok(Math.abs(R.pm-10.19)<0.01,'PREVENT male 10.19 got '+R.pm);
ok(R.ascvd===null&&R.cac===null&&R.ldl190===null,'PREVENT exclusions');
R.cases.forEach((c,i)=>{ok(c.htn===c.want,`case ${i+1} htn leaked`);ok(c.baseline===c.wantBase,`case ${i+1} baseline`);});
ok(R.cases[2].htn===false&&R.cases[7].risk==='高風險','case risk tiers');
ok(R.cases[7].risk==='高風險','FH case high risk via LDL≥190');
ok(JSON.stringify(R.int)===JSON.stringify(['moderate','high','moderate','high','low','moderate',null]),'statin intensity '+R.int);
ok(!/Atorvastatin 80 mg PO qd/.test(R.ator80)&&/最大劑量/.test(R.ator80),'atorva 80 not re-suggested');
ok(/強度不一致/.test(R.sum80),'intensity mismatch flagged');
ok(!/建議初始藥物/.test(R.other),'other treatment no initial card');
ok(!/\*\*/.test(R.pcsk),'no markdown asterisks');
ok(R.resetHtn===true,'reset restores defaults');
ok(/暫依台灣 2025/.test(R.usSum),'US fallback note');
ok(errs.length===0,'page errors/dialogs: '+errs.join(' | '));
// mobile: no horizontal overflow
await pg.setViewportSize({width:375,height:812});const ov=await pg.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);ok(ov<=0,'mobile overflow '+ov);
console.log(`${pass} passed, ${fail} failed`);await b.close();process.exit(fail?1:0);})();
