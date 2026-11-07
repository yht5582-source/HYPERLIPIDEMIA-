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
 // --- 健保 rules (rechecked 2026-11-07) ---
 NHI_AS_OF_OVERRIDE='2026-11-07';o.t2a=nhiTable2Codes().length;o.ca=comboRestricted().length;
 loadCase(0);let q=collect();q.nhiCode='AC57930100';o.infA=nhiTableOf(q).table;
 NHI_AS_OF_OVERRIDE='2026-12-01';o.t2b=nhiTable2Codes().length;o.cb=comboRestricted().length;o.infB=nhiTableOf(q).table;
 // 表二 TC alternative: 2 risk factors (HTN, smoking, man 56), LDL 120 < 130 but TC 210 ≥ 200
 q={...collect(),nhiTable:'two',ldl:120,baseline:null,tc:210,dm:false,ascvd:false};let rr=derive(q);o.tcOk=assessStatinNhi(q,rr).key;
 q.tc=190;o.tcNo=assessStatinNhi(q,rr).key;
 // mismatch: table one selected but code is 表二-only
 q={...collect(),nhiTable:'one',nhiCode:'BC24129100'};o.mis=assessStatinNhi(q,derive(q)).detail;
 // combo Livazebe HD after 12-01 needs 8 weeks, not 13
 q={...collect(),treat:'high',ezeCode:'BC28884100',ezeCategory:'standard',statinWeeks:9,lipidDiagnosis:'primary',verifiedNhiCode:true,ldl:150};
 o.comboDec=assessEzetimibeNhi(q,derive(q),true).detail;NHI_AS_OF_OVERRIDE='2026-11-07';o.comboNov=assessEzetimibeNhi(q,derive(q),true).detail;
 // PCSK9: atorvastatin 40 counts as high-intensity without the max-statin checkbox
 q={...collect(),ascvd:true,ldl:120,statinDrug:'atorvastatin',statinDose:40,maxStatin:false,statinWeeks:14,ezeWeeks:14,eventType:'mi',eventDate:'2026-06-01'};
 o.pc=assessPcsk9Nhi(q).detail;NHI_AS_OF_OVERRIDE=null;
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
ok(R.t2a===116&&R.t2b===113,'table2 list sizes '+R.t2a+'/'+R.t2b);
ok(R.ca===10&&R.cb===7,'combo restricted sizes '+R.ca+'/'+R.cb);
ok(R.infA==='two'&&R.infB==='one','Atova 10 moves to table one on 12-01');
ok(R.tcOk!=='notcovered'&&R.tcNo==='notcovered','table two TC alternative '+R.tcOk+'/'+R.tcNo);
ok(/不符/.test(R.mis),'table/code mismatch flagged');
ok(!/≥13 週/.test(R.comboDec)&&/≥13 週/.test(R.comboNov),'Livazebe HD 3-month rule ends 12-01');
ok(!/未證實為高強度/.test(R.pc),'atorva 40 counts as high intensity for PCSK9');
ok(errs.length===0,'page errors/dialogs: '+errs.join(' | '));
// mobile: no horizontal overflow
await pg.setViewportSize({width:375,height:812});const ov=await pg.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);ok(ov<=0,'mobile overflow '+ov);
console.log(`${pass} passed, ${fail} failed`);await b.close();process.exit(fail?1:0);})();
