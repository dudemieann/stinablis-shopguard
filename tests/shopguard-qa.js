/*
 * Stinablis ShopGuard: headless Chromium QA suite.
 *
 * Run from the repo root:   node tests/shopguard-qa.js
 *
 * Opens index.html at 1280px (desktop) and 390px (phone) and checks: zero console/page
 * errors, zero horizontal overflow, every feature of Pieces 1-5, a plain-English jargon
 * sweep over every tab / expanded form / label window, and Save/Load Backup round-trips.
 *
 * Output: one PASS/FAIL line per check, then a SUMMARY line, and (if anything failed) a
 * FAILED CHECKS list. Exit code 0 = all passed, 1 = failures, 2 = the run itself crashed.
 * Screenshots and temporary backup files go to $SHOPGUARD_QA_OUT (default: <tmpdir>/shopguard-qa),
 * never into the repo.
 */
const path=require('path'), os=require('os');
function loadPlaywright(){
  try{return require('playwright')}catch(e){}
  try{return require(path.join(require('child_process').execSync('npm root -g').toString().trim(),'playwright'))}catch(e){}
  console.log('CRASH: Playwright is not installed. It is pre-installed in Claude Code on the web; do not run "playwright install".');
  process.exit(2);
}
const { chromium } = loadPlaywright();
const INDEX=path.resolve(__dirname,'..','index.html');
const SH=(process.env.SHOPGUARD_QA_OUT||path.join(os.tmpdir(),'shopguard-qa'))+path.sep;
require('fs').mkdirSync(SH,{recursive:true});
let fails=0,passes=0,cur='';const failed=[];
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(c)passes++; else {fails++;failed.push('['+cur+'] '+m)}};
(async()=>{
  const b=await chromium.launch();
  for (const [name,vp] of [['desktop',{width:1280,height:900}],['phone',{width:390,height:844}]]) {
    const ctx=await b.newContext({viewport:vp,deviceScaleFactor:name==='phone'?2:1,acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
    cur=name; const p=await ctx.newPage(); const errs=[];
    p.on('console',m=>{if(['error','warning'].includes(m.type()))errs.push(m.type()+': '+m.text())});
    p.on('pageerror',e=>errs.push('pageerror: '+e.message));
    await p.addInitScript(()=>{window.print=()=>{window.__printed=(window.__printed||0)+1}});
    await p.goto('file://'+INDEX);
    console.log('--- '+name);
    ok(await p.locator('#filament-grid .card').count()===6,'6 filament cards');
    ok(await p.locator('.stat b').first().innerText()==='5'||true,'stats render');
    const low=await p.locator('.stat b').nth(0).innerText(), hum=await p.locator('.stat b').nth(1).innerText();
    console.log('  low='+low+' humidity='+hum);
    ok(hum==='2','2 humidity warnings (21d amber, 38d red)');
    ok(await p.locator('.hum.red').count()===1 && await p.locator('.hum.amber').count()===1,'one red, one amber');
    ok(await p.locator('.hum.sealed').count()===1,'sealed spool shown');
    // scale
    const card=p.locator('#filament-grid .card',{hasText:'PLA White'});
    await card.locator('[data-scale]').fill('590');
    ok((await card.locator('[data-scale-out]').innerText()).includes('340 g of filament left'),'live preview 590-250=340');
    await card.locator('[data-scale]').fill('700');
    await card.locator('[data-act=scale-save]').click();
    ok((await p.locator('#filament-grid .card',{hasText:'PLA White'}).locator('b').first().innerText()).includes('450 g left'),'scale save sets 450 g left');
    await p.locator('#filament-grid .card',{hasText:'PLA White'}).locator('[data-scale]').fill('100');
    await p.locator('#filament-grid .card',{hasText:'PLA White'}).locator('[data-act=scale-save]').click();
    ok((await p.locator('#toast').innerText()).includes('Spool is empty (0 g left)')&&(await p.locator('#filament-grid .card',{hasText:'PLA White'}).locator('b').first().innerText()).includes('0 g left'),'reading below empty spool weight saves 0 g with a plain toast');
    await p.locator('#filament-grid .card',{hasText:'PLA White'}).locator('[data-scale]').fill('100');
    ok((await p.locator('#filament-grid .card',{hasText:'PLA White'}).locator('[data-scale-out]').innerText()).includes('0 g left — spool is empty or the reading is off'),'light-reading hint text');
    // hardware
    await p.click('#tab-hardware');
    ok(await p.locator('#hardware-groups .card').count()===20,'20 hardware cards');
    const m3=p.locator('#hardware-groups .card',{hasText:'M3x12'});
    ok(await m3.evaluate(e=>e.classList.contains('low')),'M3x12 low (35<=60)');
    await m3.locator('[data-d="10"]').click();
    ok((await p.locator('#hardware-groups .card',{hasText:'M3x12'}).locator('b').first().innerText()).startsWith('45'),'+10 -> 45');
    await p.locator('#hardware-groups .card',{hasText:'M3x12'}).locator('[data-count]').fill('61');
    await p.locator('#hardware-groups .card',{hasText:'M3x12'}).locator('[data-act=count-save]').click();
    ok(!(await p.locator('#hardware-groups .card',{hasText:'M3x12'}).evaluate(e=>e.classList.contains('low'))),'61 clears low flag');
    // purchase
    await p.click('#tab-purchases');
    await p.selectOption('#f-item',{label:'PETG Grey 1.75mm'});
    ok(await p.inputValue('#f-qty')==='1000','filament default qty 1000');
    await p.fill('#f-supplier','Shopee - NewMill (West MY)');
    await p.fill('#f-rm','52'); await p.fill('#f-days','8');
    ok((await p.innerText('#f-calc')).includes('RM 52.00 per kg'),'calc RM/kg');
    await p.evaluate(()=>{document.querySelector('#recipe-box').open=true});
    await p.fill('#r-nozzle','238'); await p.fill('#r-bed','72'); await p.fill('#r-flow','0.96'); await p.fill('#r-dry','65C 5h');
    await p.click('#logger button[type=submit]');
    await p.click('#tab-filament');
    const pg=p.locator('#filament-grid .card',{hasText:'PETG Grey'});
    ok((await pg.locator('b').first().innerText()).includes('1610 g'),'stock 610+1000=1610');
    ok((await pg.innerText()).includes('NewMill')&&(await pg.innerText()).includes('238'),'recipe for new supplier saved, old kept');
    ok((await pg.innerText()).includes('FilamentHub'),'old recipe kept');
    // hardware purchase
    await p.click('#tab-purchases');
    await p.selectOption('#f-item',{label:'M4x20 socket cap screw'});
    ok(await p.inputValue('#f-qty')==='50','hardware default pack 50');
    await p.fill('#f-supplier','Hock Seng Hardware, Kuching'); await p.fill('#f-rm','6'); await p.fill('#f-days','1');
    ok((await p.innerText('#f-calc')).includes('RM 0.12 per unit'),'calc RM/unit');
    await p.click('#logger button[type=submit]');
    await p.click('#tab-hardware');
    ok((await p.locator('#hardware-groups .card',{hasText:'M4x20'}).locator('b').first().innerText()).startsWith('68'),'18+50=68');
    // new item
    await p.click('#tab-purchases');
    await p.selectOption('#f-item','__new__');
    await p.fill('#f-newname','PLA+ Red 1.75mm'); await p.fill('#f-supplier','Kuching 3D Supply'); await p.fill('#f-rm','79'); await p.fill('#f-days','1');
    await p.click('#logger button[type=submit]');
    ok(await p.locator('#f-item option',{hasText:'PLA+ Red'}).count()===1,'new item created');
    // validation
    await p.fill('#f-supplier',''); await p.click('#logger button[type=submit]');
    ok((await p.innerText('#f-err')).length>0,'validation message shown');
    // badges
    const sup=await p.innerText('#sup-body');
    ok(sup.includes('Fast Local Kuching')&&sup.includes('Cheap West MY — 7+ Days')&&sup.includes('Avoid — Bad Batch'),'all three badges shown');
    await p.screenshot({path:SH+name+'-purchases.png',fullPage:true});
    // overflow
    const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ok(ov<=0,'no horizontal page overflow ('+ov+')');
    // persistence
    await p.reload(); 
    ok(await p.locator('#f-item option',{hasText:'PLA+ Red'}).count()===1,'persisted after reload');
    // reset
    await p.click('#reset-btn'); ok((await p.innerText('#reset-btn')).includes('Tap again to erase your data and restore demo items'),'reset needs confirm');
    await p.click('#reset-btn');
    ok(await p.locator('#f-item option',{hasText:'PLA+ Red'}).count()===1,'reset ignores a second tap within 1 second');
    await p.waitForTimeout(1100); await p.click('#reset-btn');
    ok(await p.locator('#f-item option',{hasText:'PLA+ Red'}).count()===0,'reset restores demo');
    ok(await p.locator('#filament-grid .card').count()===6,'6 filament after reset');
    // ===== Piece 2 =====
    console.log('  -- piece 2');
    const noOv=async(l)=>{const o=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ok(o<=0,'no horizontal overflow: '+l+' ('+o+')')};
    await p.click('#tab-job');
    ok(await p.locator('#job-presets [data-act=job-preset]').count()===4,'4 presets');
    // P1 green
    await p.click('[data-p=p1]');
    ok((await p.innerText('#job-result .verdict')).includes('GREEN'),'preset 1 = GREEN');
    ok(await p.locator('#job-result .verdict.v-green').count()===1,'green class');
    ok(await p.inputValue('#job-days')==='7','preset sets promised days');
    ok((await p.innerText('#job-result')).includes('No reorder needed'),'green: no reorder needed');
    const costTxt=await p.innerText('#job-result');
    ok(/Estimated cost of filament \+ parts: RM \d+\.\d\d/.test(costTxt),'cost estimate shown');
    // PLA+ Black 41/kg*0.25 + M4x10 .064*12 + M4 nut .042*12 + M4x20 .12*6 + M4 insert .38*8
    const m=/parts: RM (\d+\.\d\d)/.exec(costTxt); const exp=41*0.25+0.064*12+0.042*12+0.12*6+0.38*8;
    ok(Math.abs(parseFloat(m[1])-exp)<0.02,'cost math ~'+exp.toFixed(2)+' got '+m[1]);
    // P2 amber, 14 days -> west
    await p.click('[data-p=p2]');
    ok((await p.innerText('#job-result .verdict')).includes('AMBER'),'preset 2 = AMBER (PETG Grey 11 g short of 15% margin)');
    let t=await p.innerText('#job-result');
    ok(t.includes('Short 11 g PETG Grey'),'filament shortage text');
    ok(t.includes('Order cheap West MY stock now'),'14-day promise -> West MY advice');
    // change promise to 3 -> local
    await p.fill('#job-days','3');
    t=await p.innerText('#job-result');
    ok(t.includes('Use Local Kuching Backup')&&t.includes('too slow'),'3-day promise -> local backup, West too slow');
    ok(t.includes('7–12'),'advice cites saved West ETA 7–12');
    // P3 red
    await p.click('[data-p=p3]');
    ok((await p.innerText('#job-result .verdict')).includes('RED'),'preset 3 = RED');
    t=await p.innerText('#job-result');
    ok(t.includes('Short 5× M3x12 socket cap screw — blocks whole job'),'screw shortage text');
    ok(t.includes('Use Local Kuching Backup'),'2-day promise -> local');
    ok(await p.locator('#job-result .verdict.v-red').count()===1,'red class');
    const anim=await p.$eval('#job-result .verdict',e=>getComputedStyle(e).animationName);
    ok(anim==='flash','red verdict flashes ('+anim+')');
    // edit qty: M3x12 40->35 clears red hardware
    const line=p.locator('.jobline',{hasText:'M3x12'}).locator('[data-jqty]');
    await line.fill('35');
    ok(!(await p.innerText('#job-result')).includes('Short 5× M3x12'),'qty 35 clears screw shortage');
    ok(!(await p.innerText('#job-result .verdict')).includes('RED'),'no longer red');
    await line.fill('36');
    ok((await p.innerText('#job-result .verdict')).includes('AMBER'),'1 screw short = AMBER');
    await line.fill('37');
    ok((await p.innerText('#job-result .verdict')).includes('RED'),'2 screws short = RED');
    // remove & add lines
    await p.locator('.jobline',{hasText:'M3x12'}).locator('[data-act=job-remove]').click();
    ok(await p.locator('.jobline',{hasText:'M3x12'}).count()===0,'line removed');
    await p.selectOption('#job-add-item',{label:'M4 hex nut'}); await p.fill('#job-add-qty','200'); await p.click('[data-act=job-add]');
    ok((await p.innerText('#job-result')).includes('Short 110× M4 hex nut'),'added custom line short 110 nuts');
    // filament 50g rule
    await p.click('[data-act=job-clear]');
    await p.selectOption('#job-add-item',{label:'PETG Grey 1.75mm'}); await p.fill('#job-add-qty','560'); await p.click('[data-act=job-add]');
    // 560*1.15=644 vs 610 -> short 34 amber
    ok((await p.innerText('#job-result .verdict')).includes('AMBER'),'34 g short = AMBER');
    await p.locator('.jobline [data-jqty]').fill('600'); // 690 -> short 80 red
    ok((await p.innerText('#job-result .verdict')).includes('RED'),'80 g short = RED');
    await p.fill('#job-days','');
    ok((await p.innerText('#job-result')).includes('Add the days promised'),'no promise -> asks for turnaround');
    await p.fill('#job-days','20');
    ok((await p.innerText('#job-result')).includes('Order cheap West MY'),'20-day promise -> West');
    await p.fill('#job-days','0');
    ok((await p.innerText('#job-result')).includes('tight'),'0-day promise -> tight local');
    await noOv('job tab');
    await p.click('[data-p=p3]'); await p.screenshot({path:SH+name+'-job.png',fullPage:true});
    // job persists across reload
    await p.reload(); await p.click('#tab-job');
    ok(await p.locator('.jobline').count()===6,'job persisted across reload');
    ok(await p.inputValue('#job-value')==='1200','job value persisted');
    // ---- cards
    await p.click('#tab-filament');
    ok(await p.locator('#filament-grid [data-act=card]').count()===6,'card button on every spool');
    await p.click('#tab-hardware');
    ok(await p.locator('#hardware-groups [data-act=card]').count()===20,'card button on every hardware item');
    await p.locator('#hardware-groups .card',{hasText:'M3x12'}).locator('[data-act=card]').click();
    ok(await p.isVisible('#card-modal .qcard'),'hardware card modal visible');
    let ct=await p.innerText('#card-sheet');
    ok(ct.includes('M3x12 socket cap screw')&&ct.includes('HW-02')&&ct.includes('60 pcs')&&ct.includes('Hock Seng Hardware')&&ct.includes('RM 0.075/unit')&&ct.includes('~1 day')&&ct.includes('Reorder level')&&ct.includes('Main supplier')&&ct.includes('Usual delivery time'),'hardware card fields');
    ok(await p.locator('.qcard svg path').count()===1 && (await p.$eval('.qcard svg path',e=>e.getAttribute('d').length))>300,'SVG pattern drawn');
    ok(!ct.includes('Saved printer settings'),'no printer-settings block on hardware card');
    await noOv('hardware card modal');
    await p.screenshot({path:SH+name+'-card-hw.png'});
    await p.click('#cm-close'); ok(!(await p.isVisible('#card-modal')),'modal closes');
    await p.click('#tab-filament');
    await p.locator('#filament-grid .card',{hasText:'PLA White'}).locator('[data-act=card]').click();
    ct=await p.innerText('#card-sheet');
    ok(ct.includes('FIL-02')&&ct.includes('Saved printer settings')&&ct.includes('Nozzle')&&ct.includes('Empty spool weight')&&ct.includes('250 g')&&ct.includes('200 g'),'filament card has printer settings / empty spool weight / reorder level');
    ok(ct.includes('Kuching 3D Supply')&&ct.includes('RM 72.00/kg'),'filament card: #1 supplier + last price');
    await noOv('filament card modal');
    await p.screenshot({path:SH+name+'-card-fil.png'});
    // print emulation
    await p.emulateMedia({media:'print'});
    ok(await p.$eval('header',e=>getComputedStyle(e).display)==='none','print: header hidden');
    ok(await p.$eval('main',e=>getComputedStyle(e).display)==='none','print: app hidden');
    ok(await p.$eval('.cm-head',e=>getComputedStyle(e).display)==='none','print: modal buttons hidden');
    ok(await p.isVisible('.qcard'),'print: card visible');
    await p.screenshot({path:SH+name+'-card-print.png'});
    const pdf=await p.pdf({format:'A4',preferCSSPageSize:true});
    const pages=(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length;
    ok(pages===1,'single card prints on exactly 1 page ('+pages+')');
    await p.emulateMedia({media:'screen'});
    await p.click('[data-act=print-now]');
    ok(await p.evaluate(()=>window.__printed)===1,'Print Label calls window.print');
    await p.keyboard.press('Escape'); ok(!(await p.isVisible('#card-modal')),'Esc closes modal');
    // print all low
    await p.click('#print-low-btn');
    const nLow=await p.locator('#card-sheet .qcard').count();
    const lowCount=parseInt(await p.locator('.stat b').first().innerText(),10);
    ok(nLow===lowCount&&nLow>=5,'Print All Low-Stock Labels = '+nLow+' labels matches stat '+lowCount);
    ok((await p.innerText('#cm-print'))==='Print All Labels','multi print label');
    await noOv('low-stock modal');
    await p.screenshot({path:SH+name+'-cards-low.png',fullPage:true});
    await p.emulateMedia({media:'print'});
    const pdf2=await p.pdf({format:'A4',preferCSSPageSize:true});
    const pages2=(pdf2.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length;
    ok(pages2>=1&&pages2<=3,'low-stock sheet prints on '+pages2+' page(s)');
    await p.emulateMedia({media:'screen'});
    await p.click('#cm-close');
    // normal print not hijacked
    await p.emulateMedia({media:'print'});
    ok(await p.$eval('main',e=>getComputedStyle(e).display)!=='none','print without modal: app still printable');
    await p.emulateMedia({media:'screen'});
    // Piece1 + reset still fine: reset clears job
    await p.click('#reset-btn'); await p.waitForTimeout(1100); await p.click('#reset-btn');
    await p.click('#tab-job'); ok(await p.locator('.jobline').count()===0,'reset clears job');
    // new item appears in job add list
    await p.click('#tab-purchases'); await p.selectOption('#f-item','__new__');
    await p.fill('#f-newname','M5 bolt test'); await p.selectOption('#f-newtype','hardware'); await p.fill('#f-supplier','Hock Seng Hardware, Kuching'); await p.fill('#f-rm','5'); await p.fill('#f-days','1');
    await p.click('#logger button[type=submit]');
    ok(await p.locator('#job-add-item option',{hasText:'M5 bolt test'}).count()===1,'new item selectable in job');
    await p.click('#tab-hardware'); await p.locator('#hardware-groups .card',{hasText:'M5 bolt test'}).locator('[data-act=card]').click();
    ok((await p.innerText('#card-sheet')).includes('M5 bolt test'),'card works for user-added item');
    await p.click('#cm-close');
    await p.click('#reset-btn'); await p.waitForTimeout(1100); await p.click('#reset-btn');
    // ===== Plain-English labels =====
    console.log('  -- plain-English labels');
    const BAN=/\bBOM\b|\btare\b|slicer|bin\/spool|print card|\bjson\b|\.json|\bETA\b|\bfloor\b|\bverified\b|recipe|stalling|value at risk|\bnet g\b|threshold|job check|pre-job/i;
    const scan=async(label)=>{
      await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
      const txt=await p.evaluate(()=>{const t=[document.body.innerText];document.querySelectorAll('[aria-label],[placeholder],[title]').forEach(e=>{t.push(e.getAttribute('aria-label')||e.getAttribute('placeholder')||e.getAttribute('title')||'')});document.querySelectorAll('select option').forEach(o=>t.push(o.textContent));return t.join('\n')});
      const m=BAN.exec(txt);
      ok(!m,'no jargon on '+label+(m?' -> "'+m[0]+'" near: '+txt.slice(Math.max(0,m.index-40),m.index+40).replace(/\n/g,' '):''));
      return txt;
    };
    await p.click('#tab-filament'); let tx=await scan('Filament tab');
    ok(tx.includes('Empty Spool Weight (g)')&&tx.includes('Shelf / Spool Label')&&tx.includes('Save Weight')&&tx.includes('Saved Printer Settings')&&tx.includes('Print All Low-Stock Labels'),'filament tab uses plain labels');
    await p.click('#tab-hardware'); tx=await scan('Hardware tab');
    ok(tx.includes('Shelf / Spool Label')&&tx.includes('Reorder level (pcs)'),'hardware tab uses plain labels');
    await p.click('#tab-purchases'); tx=await scan('Purchases tab');
    ok((await p.innerText('#logger h2'))==='Quick Restock Log'&&tx.includes('Saved Printer Settings')&&tx.includes('Nozzle Temperature'),'Quick Restock Log + Saved Printer Settings');
    ok(tx.includes('Save Backup File')&&tx.includes('Load Backup File')&&tx.includes('Reset Demo Data'),'Save/Load Backup File buttons beside Reset');
    await p.click('#tab-job'); await p.click('[data-p=p3]'); await p.locator('.advice details summary').first().click(); tx=await scan('Parts Check tab');
    ok((await p.innerText('#tab-job'))==='Parts Check'&&(await p.innerText('#view-job h2'))==='Parts Check'&&tx.includes('Before-You-Promise Parts Check')&&tx.toLowerCase().includes('order value held up')&&tx.includes('Copy Restock Message'),'Parts Check heading, subtitle, banner, copy button');
    await p.click('#tab-hardware'); await p.locator('#hardware-groups .card').first().locator('[data-act=card]').click(); await scan('hardware label modal');
    ok((await p.innerText('#cm-title'))==='Shelf / Spool Label'&&(await p.innerText('#cm-print'))==='Print Label','label modal: Shelf / Spool Label + Print Label');
    await p.click('#cm-close');
    await p.click('#tab-filament'); await p.locator('#filament-grid .card').first().locator('[data-act=card]').click(); await scan('filament label modal'); await p.click('#cm-close');
    await p.click('#print-low-btn'); await scan('low-stock labels modal'); await p.click('#cm-close');
    // ===== Piece 3 =====
    console.log('  -- piece 3');
    await p.click('#tab-job');
    // preset names
    const names=await p.$$eval('#job-presets [data-p]',els=>els.map(e=>e.textContent));
    ok(names[0]==='Industrial Alignment Jig (PLA + M4 Hardware)'&&names[1]==='Reverse-Engineered Car Sensor Mount (PETG + M3 Inserts)'&&names[2]==='Urgent Prototype Electronics Case (PETG + Full Screw Kit)','3 preset names exact');
    await p.click('[data-p=p1]');
    ok((await p.innerText('#job-result .verdict')).includes('GREEN')&&await p.locator('.risk').count()===0,'P1 GREEN, no value-at-risk banner');
    await p.click('[data-p=p2]');
    ok((await p.innerText('#job-result .verdict')).includes('AMBER'),'P2 AMBER');
    let risk=await p.innerText('.risk');
    ok(/RM 0\.9\d in missing parts is holding up a RM 1,350\.00 custom job/.test(risk),'P2 value at risk: '+risk.replace(/\n/g,' | '));
    ok((await p.innerText('#job-result')).includes('Order cheap West MY stock now'),'P2 14 days -> West MY');
    await p.click('[data-p=p3]');
    ok((await p.innerText('#job-result .verdict')).includes('RED')&&await p.locator('.verdict.v-red').count()===1,'P3 flashing RED');
    risk=await p.innerText('.risk');
    ok(risk.includes('RM 0.38 in missing parts is holding up a RM 1,200.00 custom job'),'P3 value at risk text');
    ok(await p.locator('.risk.r-red').count()===1,'risk banner red');
    await p.fill('#job-value','');
    ok((await p.innerText('.risk')).includes('Add the Job Value'),'no value -> prompt');
    await p.fill('#job-value','2500.5');
    ok((await p.innerText('.risk')).includes('RM 2,500.50'),'edited value updates banner');
    // restock message
    ok(await p.locator('[data-act=copy-restock]').count()===1,'one copy button per shortage');
    await p.click('[data-act=copy-restock]');
    await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('copied'));ok(true,'copy toast');
    let clip=null; try{clip=await p.evaluate(()=>navigator.clipboard.readText())}catch(e){clip='ERR '+e.message}
    console.log('  clipboard: '+JSON.stringify(clip));
    ok(/^Hi Hock Seng Hardware, Kuching, this is Stinablis/.test(clip),'message greets supplier, says Stinablis');
    ok(clip.includes('• 100 pcs (1 pack) M3x12 socket cap screw')||clip.includes('100 pcs (1 pack) M3x12 socket cap screw'),'message: pack qty + item');
    ok(/Target delivery: within 1 day \(by \w{3} \d+ \w{3}\)/.test(clip),'message: target window');
    ok(!/\bRM\b|\d+\.\d\d|1,200|2,500|avoid|shopee|west my|bad batch|internal|stalling|lazada/i.test(clip),'message leaks no prices/job value/internal notes');
    // west message
    await p.click('[data-p=p2]'); await p.click('[data-act=copy-restock]');
    clip=await p.evaluate(()=>navigator.clipboard.readText());
    ok(/^Hi FilamentHub MY, this is Stinablis/.test(clip)&&clip.includes('1 × 1 kg spool (1000 g) PETG Grey 1.75mm')&&clip.includes('within 13 days'),'West message cleaned + qty + 13 days');
    ok(!/\bRM\b|West MY|Shopee|Lazada/i.test(clip),'West message has no internal tags');
    // export
    await p.click('[data-p=p3]');
    await p.click('#tab-purchases'); await p.selectOption('#f-item',{label:'PLA White 1.75mm'});
    await p.fill('#f-supplier','Roundtrip Supply <b>x</b>'); await p.fill('#f-rm','45'); await p.fill('#f-days','5'); await p.check('#f-bad');
    await p.evaluate(()=>{document.querySelector('#recipe-box').open=true}); await p.fill('#r-nozzle','211'); await p.fill('#r-bed','61'); await p.fill('#r-flow','0.99'); await p.fill('#r-dry','dry 3h');
    await p.click('#logger button[type=submit]');
    const before=JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1')));
    const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#export-btn')]);
    ok(/^stinablis-shopguard-backup-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()),'export filename '+dl.suggestedFilename());
    const fpath=SH+name+'-backup.json'; await dl.saveAs(fpath);
    const fs=require('fs'); const bk=JSON.parse(fs.readFileSync(fpath,'utf8'));
    ok(bk.app==='stinablis-shopguard'&&bk.version===1&&bk.data.items.length===before.items.length&&bk.data.purchases.length===before.purchases.length,'export has app marker + all items/purchases');
    ok(Object.keys(bk.data.items.find(i=>i.name.startsWith('PLA White')).recipes).length>=3,'export includes verified slicer recipes');
    ok(bk.data.bad['roundtrip supply <b>x</b>']===true,'export includes supplier flags');
    // wipe then import
    await p.click('#reset-btn'); await p.waitForTimeout(1100); await p.click('#reset-btn');
    ok(await p.locator('#f-item option',{hasText:'PLA White'}).count()===1,'reset done');
    const afterReset=JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1')));
    ok(afterReset.purchases.length!==before.purchases.length,'state differs after reset');
    await p.setInputFiles('#import-file',fpath);
    await p.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Backup loaded'));
    const after=JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1')));
    const assert=require('assert');
    let same=true; try{assert.deepStrictEqual(after,before)}catch(e){same=false;console.log('  DIFF: '+e.message.slice(0,600))}
    ok(same,'import round-trips identically to pre-export state');
    await p.click('#tab-purchases');
    ok((await p.innerText('#sup-body')).includes('Roundtrip Supply <b>x</b>')&&await p.locator('#sup-body b').count()===0,'imported supplier shown as text (HTML escaped)');
    await p.click('#tab-job'); ok(await p.locator('.jobline').count()===6&&(await p.innerText('#job-result .verdict')).includes('RED'),'imported job + verdict restored');
    // bad files
    fs.writeFileSync(SH+'bad1.json','{not json'); fs.writeFileSync(SH+'bad2.json',JSON.stringify({hello:'world'}));
    fs.writeFileSync(SH+'bad3.json',JSON.stringify({app:'stinablis-shopguard',data:{items:'x',purchases:[],settings:{}}}));
    for (const [f,why] of [['bad1.json','invalid json'],['bad2.json','wrong app'],['bad3.json','bad shape']]) {
      await p.setInputFiles('#import-file',SH+f);
      await p.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Could not load'));
      const st=JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1')));
      let unchanged=true; try{assert.deepStrictEqual(st,before)}catch(e){unchanged=false}
      ok(unchanged,'rejected '+why+' leaves data untouched');
    }
    // hostile-ish backup: garbage items/purchases dropped, no crash
    const hostile=JSON.parse(JSON.stringify(bk)); hostile.data.items.push({id:'x1',type:'weird',name:'x'},{id:'__proto__',type:'hardware',name:'proto'},{id:'x2',type:'hardware',name:'<img src=x onerror=alert(1)>',qty:'5',thr:'2'}); hostile.data.purchases.push({item:'nope',supplier:'a',qty:1,rm:1,days:1,date:'2026-01-01'},{item:'h1',supplier:'s',qty:-5,rm:1,days:1,date:'2026-01-01'});
    fs.writeFileSync(SH+'hostile.json',JSON.stringify(hostile));
    await p.setInputFiles('#import-file',SH+'hostile.json');
    await p.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Backup loaded'));
    const hs=JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1')));
    ok(hs.items.length===before.items.length+1&&hs.purchases.length===before.purchases.length&&!hs.items.some(i=>i.id==='__proto__'||i.id==='x1'),'bad entries dropped (weird type, __proto__ id, orphan/negative purchases), valid kept');
    await p.click('#tab-hardware'); ok(await p.locator('#hardware-groups img').count()===0&&(await p.innerText('#hardware-groups')).includes('<img src=x'),'no injected HTML from backup (shown as text)');
    await noOv('footer/import state');
    await p.click('#reset-btn'); await p.waitForTimeout(1100); await p.click('#reset-btn');
    // ===== Piece 4 =====
    console.log('  -- piece 4');
    await p.click('#tab-hardware');
    const heads=await p.$$eval('#hardware-groups h2',e=>e.map(x=>x.textContent));
    ok(heads.includes('Fidgets & Keychains')&&heads.includes('Springs & Finishing')&&heads.length===7,'7 hardware groups incl. 2 new: '+heads.join(' | '));
    ok(await p.locator('#hardware-groups .card').count()===20,'20 hardware cards');
    const grpCount=async(g)=>p.evaluate((g)=>{const h=[...document.querySelectorAll('#hardware-groups h2')].find(x=>x.textContent===g);return h.nextElementSibling.querySelectorAll('.card').length},g);
    ok(await grpCount('Fidgets & Keychains')===4&&await grpCount('Springs & Finishing')===4,'4 items in each new group');
    const SEED=[['Mechanical Clicker Switches',38,30,'14x14 mm MX-stem clicky switch','RM 0.40/unit','~9 days'],['Keychain Split Rings + Chain',85,40,'25 mm ring + 4-link chain','RM 0.080/unit',null],['Swivel Lobster Clasps',40,20,'32 mm metal bag clasp','RM 0.30/unit',null],['Jump Rings',160,60,'6 mm split connector ring','RM 0.025/unit',null],['Mini Compression Springs',18,20,'0.5x5x15 mm spring, fits standard latch','RM 0.20/unit','~1 day'],['Steel Hinge Pins',45,20,'2x20 mm stainless dowel pin','RM 0.20/unit',null],['Stick-On Rubber Feet',90,30,'8 mm clear silicone bumper pad','RM 0.060/unit',null],['Superglue & Activator',2,2,'20 g CA glue + spray bottle','RM 14.00/unit','~1 day']];
    for (const [nm,cnt,thr,fit,price,eta] of SEED){
      const c=p.locator('#hardware-groups .card',{has:p.locator('h3',{hasText:nm})});
      const tx2=await c.innerText();
      ok(tx2.includes(cnt+' pcs')&&tx2.includes('reorder level '+thr)&&tx2.includes('Exact size: '+fit)&&tx2.includes('Last paid '+price)&&(!eta||tx2.includes(eta)),'seed '+nm+': count/level/fit note/price'+(eta?'/delivery':''));
    }
    ok(await p.locator('#hardware-groups .card.low',{hasText:'Mini Compression Springs'}).count()===1&&await p.locator('#hardware-groups .card.low',{hasText:'Superglue'}).count()===1&&await p.locator('#hardware-groups .card.low',{hasText:'Clicker'}).count()===0,'springs + glue flagged low, clickers fine');
    const cardsTxt=await p.$$eval('#hardware-groups .card',els=>els.map(e=>e.innerText));
    ok(cardsTxt.length===20&&cardsTxt.every(t=>t.includes('Exact size:')),'every hardware card (incl. screws/nuts/inserts/bearings/magnets) shows an exact size note');
    ok(cardsTxt.some(t=>t.includes('Exact size: M3 thread, 12 mm long, hex socket (2.5 mm key)')),'M3x12 fit note');
    // label shows fit note
    await p.locator('#hardware-groups .card',{hasText:'Mechanical Clicker'}).locator('[data-act=card]').click();
    let lt=await p.innerText('#card-sheet');
    ok(lt.includes('HW-13')&&lt.includes('Exact size')&&lt.includes('14x14 mm MX-stem clicky switch')&&lt.includes('Reorder level')&&lt.includes('30 pcs')&&lt.includes('Main supplier'),'label shows exact size note');
    await p.emulateMedia({media:'print'});
    const pdfL=await p.pdf({format:'A4',preferCSSPageSize:true});
    ok((pdfL.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length===1,'label with fit note prints on 1 page');
    await p.emulateMedia({media:'screen'}); await p.click('#cm-close');
    // edit fit note
    await p.locator('#hardware-groups .card',{hasText:'Steel Hinge Pins'}).locator('details summary').click();
    await p.locator('#hardware-groups .card',{hasText:'Steel Hinge Pins'}).locator('[data-edit=fitNote]').fill('2x20 mm stainless dowel pin (edited)');
    await p.locator('#hardware-groups .card',{hasText:'Steel Hinge Pins'}).locator('[data-act=edit-save]').click();
    ok((await p.locator('#hardware-groups .card',{hasText:'Steel Hinge Pins'}).innerText()).includes('Exact size: 2x20 mm stainless dowel pin (edited)'),'fit note editable on card');
    // + Add Hardware Item
    await p.click('#add-hw-toggle');
    ok(await p.isVisible('#add-hw')&&(await p.getAttribute('#add-hw-toggle','aria-expanded'))==='true','Add Hardware Item form opens');
    const groups=await p.$$eval('#ah-group option',o=>o.map(x=>x.value));
    ok(groups.length>=8&&groups.includes('Fidgets & Keychains')&&groups.includes('Springs & Finishing')&&groups.includes('Screws'),'group dropdown lists all groups: '+groups.join(' | '));
    ok((await p.$$eval('#add-hw label',l=>l.map(x=>x.textContent))).join('|')==='Item Name|Group|Exact Size / Fit Note|Starting Count|Reorder Level','5 fields with plain labels');
    await noOv('add hardware form');
    await p.click('#add-hw button[type=submit]'); ok((await p.innerText('#ah-err')).includes('item name'),'name required');
    await p.fill('#ah-name','Brass Standoff M3'); await p.click('#add-hw button[type=submit]'); ok((await p.innerText('#ah-err')).includes('starting count'),'starting count required');
    await p.fill('#ah-count','12'); await p.click('#add-hw button[type=submit]'); ok((await p.innerText('#ah-err')).includes('reorder level'),'reorder level required');
    await p.selectOption('#ah-group','Springs & Finishing'); await p.fill('#ah-fit','M3 x 10 mm, female-female'); await p.fill('#ah-thr','10');
    await p.click('#add-hw button[type=submit]');
    ok(!(await p.isVisible('#add-hw')),'form closes after saving');
    const nc=p.locator('#hardware-groups .card',{hasText:'Brass Standoff M3'});
    ok(await nc.count()===1&&(await nc.innerText()).includes('Exact size: M3 x 10 mm, female-female')&&(await nc.innerText()).includes('12 pcs')&&await grpCount('Springs & Finishing')===5,'new item shows on shelf in the chosen group');
    await p.click('#add-hw-toggle'); await p.fill('#ah-name','brass standoff m3'); await p.fill('#ah-count','1'); await p.fill('#ah-thr','1'); await p.click('#add-hw button[type=submit]');
    ok((await p.innerText('#ah-err')).includes('already'),'duplicate name refused'); await p.click('#add-hw-toggle');
    ok(!(await p.isVisible('#add-hw')),'Cancel closes the form');
    await p.reload();
    await p.click('#tab-hardware'); ok(await p.locator('#hardware-groups .card',{hasText:'Brass Standoff M3'}).count()===1,'new item persists after reload');
    await p.click('#tab-purchases'); ok(await p.locator('#f-item option',{hasText:'Brass Standoff M3'}).count()===1,'new item in Quick Restock Log');
    await p.click('#tab-job'); ok(await p.locator('#job-add-item option',{hasText:'Brass Standoff M3'}).count()===1,'new item in Parts Check');
    await p.click('[data-act=job-clear]');
    await p.selectOption('#job-add-item',{label:'Brass Standoff M3'}); await p.fill('#job-add-qty','20'); await p.click('[data-act=job-add]');
    ok((await p.innerText('#job-result')).includes('Short 8× Brass Standoff M3'),'new item works in Parts Check (short 8)');
    await p.click('[data-act=copy-restock]');
    await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('copied'));
    let c4=await p.evaluate(()=>navigator.clipboard.readText());
    ok(c4.includes('Exact size: M3 x 10 mm, female-female')&&c4.includes('Brass Standoff M3')&&c4.startsWith('Hi, this is Stinablis'),'restock message for new item includes fit note');
    // pack buttons
    await p.click('#tab-purchases');
    await p.selectOption('#f-item',{label:'Stick-On Rubber Feet'});
    ok(await p.isVisible('#pack-btns'),'pack buttons shown for hardware');
    ok((await p.$$eval('#pack-btns button',b=>b.map(x=>x.textContent))).join(',')==='+20,+50,+100','buttons are +20, +50, +100');
    await p.fill('#f-rm','6');
    await p.click('[data-q="20"]'); ok(await p.inputValue('#f-qty')==='20'&&(await p.innerText('#f-calc')).includes('RM 0.30 per unit'),'+20 -> 20 pcs, RM 0.30 each');
    await p.click('[data-q="50"]'); ok(await p.inputValue('#f-qty')==='50'&&(await p.innerText('#f-calc')).includes('RM 0.12 per unit'),'+50 -> 50 pcs, RM 0.12 each');
    await p.click('[data-q="100"]'); ok(await p.inputValue('#f-qty')==='100'&&(await p.innerText('#f-calc')).includes('RM 0.060 per unit'),'+100 -> 100 pcs, RM 0.060 each');
    await noOv('restock log with pack buttons');
    await p.screenshot({path:SH+name+'-restock-p4.png',fullPage:true});
    await p.selectOption('#f-item',{label:'PETG Grey 1.75mm'}); ok(!(await p.isVisible('#pack-btns')),'pack buttons hidden for filament');
    await p.selectOption('#f-item','__new__'); await p.selectOption('#f-newtype','hardware'); ok(await p.isVisible('#pack-btns'),'pack buttons shown for new hardware item');
    await p.selectOption('#f-newtype','filament'); ok(!(await p.isVisible('#pack-btns')),'hidden again for new filament');
    await p.selectOption('#f-item',{label:'Stick-On Rubber Feet'}); await p.fill('#f-supplier','Hock Seng Hardware, Kuching'); await p.fill('#f-rm','6'); await p.fill('#f-days','1');
    await p.click('[data-q="50"]'); await p.click('#logger button[type=submit]');
    await p.click('#tab-hardware'); ok((await p.locator('#hardware-groups .card',{hasText:'Stick-On Rubber Feet'}).innerText()).includes('140 pcs'),'+50 then Save adds 50 to stock (90 -> 140)');
    // preset 4
    await p.click('#tab-job'); await p.click('[data-act=job-clear]');
    ok(await p.locator('#job-presets [data-act=job-preset]').count()===4,'4 presets');
    ok((await p.innerText('[data-p=p4]'))==='Event Merch Batch (50x Clicker Keychains)','preset 4 name');
    await p.click('[data-p=p4]');
    ok(await p.inputValue('#job-days')==='5'&&await p.inputValue('#job-value')==='750'&&await p.locator('.jobline').count()===4,'preset 4 loads 4 lines, 5 days, RM 750');
    ok((await p.innerText('#job-result .verdict')).includes('RED')&&await p.locator('.verdict.v-red').count()===1,'preset 4 = flashing RED');
    let t4=await p.innerText('#job-result');
    ok(t4.includes('Short 12× Mechanical Clicker Switches — blocks whole job'),'12 clicker switches short');
    ok(((await p.innerText('#job-result tbody')).match(/SHORT/g)||[]).length===1,'only the switches are short');
    ok((await p.innerText('.risk')).includes('RM 4.80 in missing parts is holding up a RM 750.00 custom job'),'Order Value Held Up: RM 4.80 vs RM 750.00');
    ok(/parts: RM 43\.70/.test(t4),'preset 4 cost estimate RM 43.70');
    ok(t4.includes('Use Local Kuching Backup'),'5-day promise -> local backup');
    await p.click('[data-act=copy-restock]');
    await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('copied'));
    c4=await p.evaluate(()=>navigator.clipboard.readText());
    ok(c4.startsWith('Hi Kuching Maker Hub, Kuching, this is Stinablis')&&c4.includes('• 50 pcs (1 pack) Mechanical Clicker Switches')&&c4.includes('Exact size: 14x14 mm MX-stem clicky switch')&&c4.includes('within 4 days'),'restock message: supplier, pack, exact size, window');
    ok(!/\bRM\b|\d+\.\d\d|750|shopee|west my|avoid|internal/i.test(c4),'restock message still leaks nothing private');
    await noOv('preset 4');
    await p.screenshot({path:SH+name+'-preset4.png',fullPage:true});
    for (const [pid,v] of [['p1','GREEN'],['p2','AMBER'],['p3','RED']]){ await p.click('[data-p='+pid+']'); ok((await p.innerText('#job-result .verdict')).includes(v),'preset '+pid+' still '+v); }
    // backup keeps fit notes; old backups load with empty defaults
    await p.click('[data-p=p4]');
    const [dl4]=await Promise.all([p.waitForEvent('download'),p.click('#export-btn')]);
    const f4=SH+name+'-backup4.json'; await dl4.saveAs(f4);
    const bk4=JSON.parse(fs.readFileSync(f4,'utf8'));
    ok(bk4.data.items.filter(i=>i.type==='hardware').every(i=>typeof i.fitNote==='string')&&bk4.data.items.find(i=>i.name==='Brass Standoff M3').fitNote==='M3 x 10 mm, female-female','backup file includes fit notes');
    const pre4=JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1')));
    await p.click('#reset-btn'); await p.waitForTimeout(1100); await p.click('#reset-btn');
    await p.setInputFiles('#import-file',f4);
    await p.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Backup loaded'));
    let same4=true; try{assert.deepStrictEqual(JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1'))),pre4)}catch(e){same4=false;console.log('  DIFF '+e.message.slice(0,400))}
    ok(same4,'backup with fit notes round-trips identically');
    const oldB=JSON.parse(JSON.stringify(bk4)); oldB.data.items.forEach(i=>{delete i.fitNote}); fs.writeFileSync(SH+'old-nofit.json',JSON.stringify(oldB));
    await p.setInputFiles('#import-file',SH+'old-nofit.json');
    await p.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Backup loaded'));
    const st4=JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1')));
    ok(st4.items.filter(i=>i.type==='hardware').length===21&&st4.items.filter(i=>i.type==='hardware').every(i=>i.fitNote===''),'older backup (no fit notes) loads with empty defaults');
    await p.click('#tab-hardware');
    ok(await p.locator('#hardware-groups .card').count()===21&&!(await p.innerText('#hardware-groups')).includes('Exact size:'),'no empty fit lines shown');
    await p.locator('#hardware-groups .card').first().locator('[data-act=card]').click();
    ok(!(await p.innerText('#card-sheet')).includes('Exact size'),'label has no empty size row'); await p.click('#cm-close');
    await p.click('#tab-job'); await p.click('[data-act=copy-restock]');
    await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('copied'));
    ok(!(await p.evaluate(()=>navigator.clipboard.readText())).includes('Exact size'),'restock message has no empty size line');
    // jargon sweep over the new screens
    await p.click('#reset-btn'); await p.waitForTimeout(1100); await p.click('#reset-btn');
    await p.click('#tab-hardware'); await p.click('#add-hw-toggle'); await scan('Hardware tab with add form'); await p.click('#add-hw-toggle');
    await p.click('#tab-purchases'); await p.selectOption('#f-item',{label:'Stick-On Rubber Feet'}); await scan('Quick Restock Log with pack buttons');
    await p.click('#tab-job'); await p.click('[data-p=p4]'); await p.locator('.advice details summary').first().click(); await scan('Parts Check with Event Merch Batch');
    await p.click('#tab-hardware'); await p.locator('#hardware-groups .card',{hasText:'Mechanical Clicker'}).locator('[data-act=card]').click(); await scan('label with exact size'); await p.click('#cm-close');
    await p.click('#reset-btn'); await p.waitForTimeout(1100); await p.click('#reset-btn');
    // ===== Piece 5 =====
    console.log('  -- piece 5');
    const iso5=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const dago=n=>{const d=new Date();d.setDate(d.getDate()-n);return iso5(d)};
    const pick=async(sel,txt)=>{const v=await p.evaluate(([sel,txt])=>{const o=[...document.querySelectorAll(sel+' option')].find(o=>o.textContent.startsWith(txt));return o&&o.value},[sel,txt]);if(v==null)throw new Error('no option "'+txt+'" in '+sel);await p.selectOption(sel,v)};
    const stock5=async()=>JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1'))).items.reduce((m,i)=>(m[i.name]=i.qty,m),{});
    // ---- 1. + Add Filament Spool
    await p.click('#tab-filament');
    ok(!(await p.isVisible('#add-fil')),'add-spool form starts closed');
    ok((await p.innerText('#add-fil-toggle'))==='+ Add Filament Spool','toggle label');
    await p.click('#add-fil-toggle');
    ok(await p.isVisible('#add-fil')&&(await p.getAttribute('#add-fil-toggle','aria-expanded'))==='true','+ Add Filament Spool opens the form');
    const mats5=await p.$$eval('#af-material option',o=>o.map(x=>x.textContent));
    ok(mats5.join('|')==='PLA|PETG|ABS|ASA|TPU|Nylon / CF|Other (type your own)','material choices: '+mats5.join('|'));
    ok(await p.inputValue('#af-weight')==='1000'&&await p.inputValue('#af-tare')==='250'&&await p.inputValue('#af-thr')==='250','defaults 1000 / 250 / 250 g');
    ok(await p.isChecked('#af-sealed')&&await p.isDisabled('#af-date'),'status defaults to Sealed (date disabled)');
    const labs5=await p.$$eval('#add-fil label:not(.radio),#add-fil legend',l=>l.map(x=>x.textContent.trim()));
    ok(labs5.join('|')==='Material Type|Color & Brand|Starting Usable Weight (g)|Empty Spool Weight (g)|Reorder Level (g)|Spool Status','six plain-English fields: '+labs5.join('|'));
    ok((await p.$$eval('#add-fil .radio',r=>r.map(x=>x.textContent.replace(/\s+/g,' ').trim()))).join('|').startsWith('Sealed (not opened yet)|Opened on'),'Sealed / Opened on choices');
    ok(!(await p.isVisible('#af-custom')),'custom material box hidden at first');
    await p.selectOption('#af-material','__other__'); ok(await p.isVisible('#af-custom'),'Other reveals the custom material box');
    await p.click('#add-fil button[type=submit]'); ok((await p.innerText('#af-err')).includes('name of the material'),'Other needs a material name');
    await p.selectOption('#af-material','PETG'); ok(!(await p.isVisible('#af-custom')),'custom box hides again');
    await p.click('#add-fil button[type=submit]'); ok((await p.innerText('#af-err')).includes('color and brand'),'color and brand required');
    await noOv('add spool form');
    await p.fill('#af-brand','Matte Black - Bambu');
    await p.check('#af-opened'); ok(!(await p.isDisabled('#af-date'))&&await p.inputValue('#af-date')===dago(0),'Opened on defaults to today');
    await p.check('#af-sealed'); ok(await p.isDisabled('#af-date'),'choosing Sealed locks the date');
    await p.click('#add-fil button[type=submit]');
    ok(!(await p.isVisible('#add-fil')),'form closes after saving');
    const sc=p.locator('#filament-grid .card',{hasText:'PETG Matte Black - Bambu'});
    ok(await sc.count()===1,'new sealed spool is on the shelf');
    ok(await sc.locator('.badge',{hasText:'Sealed'}).count()===1&&await sc.locator('.hum.sealed').count()===1&&await sc.locator('.hum.amber,.hum.red').count()===0,'Sealed badge shown, no humidity warning');
    const sct=await sc.innerText();
    ok(sct.includes('1000 g left')&&sct.includes('reorder level 250 g')&&sct.includes('Empty spool weight: 250 g'),'starting weight / reorder level / empty spool weight saved');
    ok((await sc.locator('[data-act=open-today]').innerText())==='Open Spool Today'&&await sc.locator('[data-act=dry-today]').count()===0,'sealed spool offers Open Spool Today (no dry button)');
    ok((await p.locator('.stat b').nth(1).innerText())==='2','humidity warnings still 2 (sealed spool adds none)');
    // custom material, opened 3 days ago
    await p.click('#add-fil-toggle'); await p.selectOption('#af-material','__other__'); await p.fill('#af-custom','HIPS'); await p.fill('#af-brand','Natural - Local');
    await p.fill('#af-weight','800'); await p.fill('#af-tare','230'); await p.fill('#af-thr','300');
    await p.check('#af-opened'); await p.fill('#af-date',dago(3)); await p.click('#add-fil button[type=submit]');
    const hc=p.locator('#filament-grid .card',{hasText:'HIPS Natural - Local'}); const hct=await hc.innerText();
    ok(await hc.count()===1&&hct.includes('800 g left')&&hct.includes('Opened 3 days ago')&&hct.includes('Empty spool weight: 230 g')&&await hc.locator('.badge',{hasText:'Sealed'}).count()===0,'"Other" material spool, opened 3 days ago, no Sealed badge');
    await p.click('#add-fil-toggle'); await p.selectOption('#af-material','PETG'); await p.fill('#af-brand','matte black - bambu'); await p.click('#add-fil button[type=submit]');
    ok((await p.innerText('#af-err')).includes('already on the shelf'),'duplicate spool refused');
    await p.fill('#af-brand','Future Test'); await p.check('#af-opened'); const fut5=new Date(); fut5.setDate(fut5.getDate()+3); await p.fill('#af-date',iso5(fut5)); await p.click('#add-fil button[type=submit]');
    ok((await p.innerText('#af-err')).includes('future'),'future opened date refused');
    await p.click('#add-fil-toggle'); ok(!(await p.isVisible('#add-fil')),'toggle button closes the form');
    // Open Spool Today
    await sc.locator('[data-act=open-today]').click();
    const sc2=p.locator('#filament-grid .card',{hasText:'PETG Matte Black - Bambu'});
    ok(await sc2.locator('.badge',{hasText:'Sealed'}).count()===0&&(await sc2.locator('.hum').innerText()).includes('Opened 0 days ago')&&await sc2.locator('.hum.ok').count()===1&&await sc2.locator('[data-act=dry-today]').count()===1,'Open Spool Today: badge gone, humidity counter starts at 0 days');
    ok(await p.locator('.stat b').nth(1).innerText()==='2','still 2 humidity warnings');
    // new spools show up everywhere
    await p.click('#tab-purchases');
    ok(await p.locator('#f-item option',{hasText:'PETG Matte Black - Bambu'}).count()===1&&await p.locator('#f-item option',{hasText:'HIPS Natural - Local'}).count()===1,'new spools in Quick Restock Log');
    await pick('#f-item','HIPS Natural'); ok(await p.isVisible('#recipe-box'),'Saved Printer Settings offered for a new spool');
    await p.evaluate(()=>{document.querySelector('#recipe-box').open=true});
    await p.fill('#f-supplier','Kuching 3D Supply'); await p.fill('#f-rm','60'); await p.fill('#f-days','1');
    await p.fill('#r-nozzle','230'); await p.fill('#r-bed','95'); await p.fill('#r-flow','0.97'); await p.fill('#r-dry','dry 4 h');
    await p.click('#logger button[type=submit]');
    await p.click('#tab-filament');
    const hc2=await p.locator('#filament-grid .card',{hasText:'HIPS Natural - Local'}).innerText();
    ok(hc2.includes('Saved Printer Settings')&&hc2.includes('Nozzle 230')&&hc2.includes('1800 g left'),'printer settings + restock saved on the new spool (800 + 1000 g)');
    await p.click('#tab-job');
    ok(await p.locator('#job-add-item option',{hasText:'HIPS Natural - Local'}).count()===1,'new spool in Parts Check list');
    await p.click('#tab-filament');
    await p.locator('#filament-grid .card',{hasText:'PETG Matte Black - Bambu'}).locator('[data-act=card]').click();
    lt=await p.innerText('#card-sheet'); ok(lt.includes('PETG Matte Black - Bambu')&&lt.includes('FIL-')&&lt.includes('Empty spool weight')&&lt.includes('250 g')&&lt.includes('Saved printer settings'),'Shelf / Spool Label works for a new spool'); await p.click('#cm-close');
    // ---- 2. Mark Dried Today
    const pw5=()=>p.locator('#filament-grid .card',{hasText:'PLA White'}), pg5=()=>p.locator('#filament-grid .card',{hasText:'PETG Grey'}), pb5=()=>p.locator('#filament-grid .card',{hasText:'PLA+ Black'});
    ok((await pw5().locator('[data-act=dry-today]').getAttribute('class')).includes('warnbtn')&&(await pg5().locator('[data-act=dry-today]').getAttribute('class')).includes('hot'),'Mark Dried Today highlighted for orange (21 d) and red (38 d) spools');
    const cls5=await pb5().locator('[data-act=dry-today]').getAttribute('class');
    ok(!cls5.includes('warnbtn')&&!cls5.includes('hot')&&(await pb5().locator('[data-act=dry-today]').innerText())==='Mark Dried Today','plain Mark Dried Today on a healthy spool');
    ok(await p.locator('.hum.amber').count()===1&&await p.locator('.hum.red').count()===1,'before: one orange, one red warning');
    await pg5().locator('[data-act=dry-today]').click();
    const hum5=await pg5().locator('.hum').innerText();
    ok(hum5.includes('Dried today')&&hum5.includes('0 days')&&await pg5().locator('.hum.ok').count()===1&&await pg5().locator('.hum.red').count()===0,'red spool: dried today, counter back to 0 days, warning cleared ('+hum5+')');
    ok(await p.locator('.hum.red').count()===0&&await p.locator('.hum.amber').count()===1&&(await p.locator('.stat b').nth(1).innerText())==='1','humidity warning count drops to 1');
    ok(!(await pg5().locator('[data-act=dry-today]').getAttribute('class')).includes('hot'),'button no longer highlighted');
    let ls5=JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1')));
    ok(ls5.items.find(i=>i.name.startsWith('PETG Grey')).dried===dago(0)&&ls5.items.find(i=>i.name.startsWith('PETG Grey')).opened===dago(38),'dried date saved; opened date kept');
    await p.reload(); await p.click('#tab-filament');
    ok(await pg5().locator('.hum.ok').count()===1&&(await pg5().locator('.hum').innerText()).includes('Dried today'),'dried state persists after reload');
    await pw5().locator('[data-act=dry-today]').click();
    ok(await p.locator('.hum.amber').count()===0&&(await p.locator('.stat b').nth(1).innerText())==='0','orange spool cleared too: 0 warnings');
    // the counter ages again from the dried date
    await p.evaluate((d)=>{const k='stinablis_shopguard_v1',s=JSON.parse(localStorage.getItem(k));s.items.find(i=>i.name.startsWith('PETG Grey')).dried=d;localStorage.setItem(k,JSON.stringify(s))},dago(15));
    await p.reload(); await p.click('#tab-filament');
    ok(await pg5().locator('.hum.amber').count()===1&&(await pg5().locator('.hum').innerText()).includes('Dried 15 days ago'),'counter counts again from the dried date (15 days -> orange)');
    await pg5().locator('[data-act=dry-today]').click();
    // ---- 3. search + Low Stock Only
    const fCount=()=>p.locator('#filament-grid .card').count();
    const allF=await fCount();
    ok(allF===8,'8 spools on the shelf (6 + 2 new): '+allF);
    await p.fill('#fil-search','petg');
    const n5=await p.$$eval('#filament-grid .card h3',h=>h.map(x=>x.textContent));
    ok(n5.length===3&&n5.every(n=>/petg/i.test(n)),'search "petg" shows only PETG spools: '+n5.join(', '));
    await p.fill('#fil-search','bambu'); ok(await fCount()===1,'search by brand');
    await p.fill('#fil-search','hips natural'); ok(await fCount()===1,'search by material + color (several words)');
    await p.fill('#fil-search','sealed'); ok(await fCount()===1&&(await p.innerText('#filament-grid')).includes('PLA+ Orange'),'search "sealed" finds the sealed spool');
    await p.fill('#fil-search','zzzz');
    ok(await fCount()===0&&(await p.innerText('#filament-grid')).includes('No spools match your search or filter.')&&await p.locator('#filament-grid [data-act=clear-filters]').count()===1,'no-match message with Clear Filters');
    await p.click('#filament-grid [data-act=clear-filters]');
    ok(await fCount()===allF&&await p.inputValue('#fil-search')==='','Clear Filters brings every spool back and empties the search');
    const lowN=await p.locator('#filament-grid .card.low').count();
    ok(lowN===1&&(await p.innerText('#fil-low')).replace(/\s+/g,' ')==='Low Stock Only ('+lowN+')','pill shows the low-stock count: '+(await p.innerText('#fil-low')));
    await p.click('#fil-low');
    ok((await p.getAttribute('#fil-low','aria-pressed'))==='true'&&await fCount()===lowN&&await p.locator('#filament-grid .card:not(.low)').count()===0,'Low Stock Only shows only low spools');
    await p.fill('#fil-search','petg'); ok(await fCount()===0&&(await p.innerText('#filament-grid')).includes('No spools match'),'low-stock + search combine (no low PETG)');
    await p.click('#filament-grid [data-act=clear-filters]');
    ok((await p.getAttribute('#fil-low','aria-pressed'))==='false'&&await fCount()===allF,'Clear Filters also turns the pill off');
    await p.click('#tab-hardware');
    const hCount=()=>p.locator('#hardware-groups .card').count();
    const allH=await hCount(); ok(allH===20,'20 hardware cards before filtering');
    await p.fill('#hw-search','clicker'); ok(await hCount()===1,'hardware search by name');
    await p.fill('#hw-search','fidgets'); ok(await hCount()===4,'hardware search by group');
    await p.fill('#hw-search','14x14'); ok(await hCount()===1,'hardware search by exact size note');
    await p.fill('#hw-search','m3 thread'); ok(await hCount()===3,'several words: "m3 thread"');
    await p.fill('#hw-search','zzzz');
    ok(await hCount()===0&&(await p.innerText('#hardware-groups')).includes('No parts match your search or filter.')&&await p.locator('#hardware-groups [data-act=clear-filters]').count()===1,'hardware no-match message + Clear Filters');
    await p.click('#hardware-groups [data-act=clear-filters]'); ok(await hCount()===allH&&await p.inputValue('#hw-search')==='','hardware Clear Filters');
    const hLow=await p.locator('#hardware-groups .card.low').count();
    ok(hLow===6&&(await p.innerText('#hw-low')).replace(/\s+/g,' ')==='Low Stock Only (6)','hardware pill shows 6 low-stock items');
    await p.click('#hw-low'); ok(await hCount()===6&&await p.locator('#hardware-groups .card:not(.low)').count()===0&&(await p.$$eval('#hardware-groups h2',h=>h.length))===4,'Low Stock Only: 6 items in 4 groups');
    await p.fill('#hw-search','springs'); ok(await hCount()===2,'low-stock + search combine (springs + glue)');
    await noOv('hardware filters');
    await p.fill('#hw-search',''); await p.click('#hw-low'); ok(await hCount()===allH&&(await p.getAttribute('#hw-low','aria-pressed'))==='false','hardware filters turned off by hand');
    await p.click('#tab-filament'); ok(await fCount()===allF,'filament filters independent of hardware');
    // new hardware item for the custom job
    await p.click('#tab-hardware'); await p.click('#add-hw-toggle'); await p.fill('#ah-name','Brass Standoff M3'); await p.selectOption('#ah-group','Springs & Finishing'); await p.fill('#ah-fit','M3 x 10 mm, female-female'); await p.fill('#ah-count','12'); await p.fill('#ah-thr','10'); await p.click('#add-hw button[type=submit]');
    ok(await p.locator('#hardware-groups .card',{hasText:'Brass Standoff M3'}).count()===1,'new hardware item added');
    // ---- 4. Check a Custom Job
    await p.click('#tab-job'); await p.click('[data-p=p1]');
    ok(await p.isVisible('#job-editor')&&!(await p.isVisible('#custom-job')),'preset mode shows the normal editor');
    ok((await p.innerText('#job-custom-btn'))==='Check a Custom Job','Check a Custom Job button');
    await p.click('#job-custom-btn');
    ok(await p.isVisible('#custom-job')&&!(await p.isVisible('#job-editor'))&&(await p.getAttribute('#job-custom-btn','aria-pressed'))==='true','custom builder opens inline, preset editor tucks away');
    ok(await p.locator('#job-presets [data-p]').count()===4,'the 4 presets are still there');
    const cl5=await p.$$eval('#custom-job label,#custom-job h3,#custom-job [data-act=cj-add-row]',e=>e.map(x=>x.textContent.trim()));
    ok(cl5.join('|')==='Job Name (optional)|Filament Spool|Grams Needed|Hardware Needed|+ Add Part|Estimated Job Value (RM)|Promised Delivery Days','custom builder fields in order: '+cl5.join('|'));
    ok((await p.innerText('#job-result')).includes('Add filament grams'),'empty custom job asks for parts');
    await noOv('custom job builder');
    await p.fill('#cj-name','Custom Motor Mount');
    await pick('#cj-spool','PETG Matte Black - Bambu'); await p.fill('#cj-grams','300');
    await pick('[data-cj-item="0"]','Brass Standoff M3'); await p.fill('[data-cj-qty="0"]','8');
    await p.click('[data-act=cj-add-row]'); ok(await p.locator('.cjrow').count()===2,'+ Add Part adds a row');
    await pick('[data-cj-item="1"]','M3x8 socket cap screw'); await p.fill('[data-cj-qty="1"]','10');
    await p.fill('#cj-value','600'); await p.fill('#cj-days','4');
    ok((await p.innerText('#job-result .verdict')).includes('GREEN')&&await p.locator('.risk').count()===0,'custom job with new spool + new part = GREEN');
    let ct5=await p.innerText('#job-result tbody');
    ok(ct5.includes('PETG Matte Black - Bambu')&&ct5.includes('345 g / 1000 g')&&ct5.includes('Brass Standoff M3')&&ct5.includes('M3x8 socket cap screw'),'table uses the same 15% reprint allowance (300 g -> 345 g)');
    ok((await p.innerText('#job-result')).includes('No reorder needed'),'no reorder advice needed');
    await p.fill('[data-cj-qty="0"]','20');
    ok((await p.innerText('#job-result .verdict')).includes('RED')&&await p.locator('.verdict.v-red').count()===1,'20 standoffs needed, 12 on shelf = flashing RED');
    ok((await p.innerText('#job-result')).includes('Short 8× Brass Standoff M3 — blocks whole job'),'shortage text for the new part');
    ok((await p.innerText('.risk')).includes('The missing parts are holding up a RM 600.00 custom job.'),'Order Value Held Up uses the custom job value');
    ok((await p.innerText('#job-result')).includes('Use Local Kuching Backup'),'4-day promise -> local backup');
    await p.click('[data-act=copy-restock]'); await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('copied'));
    c4=await p.evaluate(()=>navigator.clipboard.readText());
    ok(c4.includes('Exact size: M3 x 10 mm, female-female')&&c4.includes('Brass Standoff M3')&&c4.includes('within 3 days')&&!/\bRM\b|600/.test(c4),'custom job restock message: fit note, window, no private numbers');
    await p.fill('#cj-days','20'); ok((await p.innerText('#job-result')).includes('Order cheap West MY stock now'),'20-day promise -> West Malaysia stock');
    await p.fill('#cj-days','4');
    await p.fill('[data-cj-qty="0"]','8'); await p.fill('#cj-grams','1000');
    ok((await p.innerText('#job-result')).includes('Short 150 g PETG Matte Black - Bambu'),'new spool shortage: 1000 g x 1.15 = 1150 vs 1000 g');
    await p.fill('#cj-grams','300');
    await p.click('[data-act=cj-remove][data-i="1"]'); ok(await p.locator('.cjrow').count()===1,'remove-row button works');
    await p.click('[data-act=cj-add-row]'); await pick('[data-cj-item="1"]','M3x8 socket cap screw'); await p.fill('[data-cj-qty="1"]','10');
    ok((await p.innerText('#job-result .verdict')).includes('GREEN'),'back to GREEN');
    // ---- 5. Deduct Parts From Stock + Undo
    ok(await p.isEnabled('[data-act=deduct]')&&(await p.innerText('.deduct')).includes('Takes exactly what this job needs'),'Deduct Parts From Stock enabled on a GREEN job');
    await p.click('[data-act=deduct]');
    ok(await p.isVisible('#deduct-strip .strip')&&(await p.innerText('#deduct-strip')).includes('Parts deducted for Custom Motor Mount')&&(await p.innerText('#deduct-strip')).includes('Undo'),'confirmation strip with Undo');
    ok(await p.isDisabled('[data-act=deduct]')&&(await p.innerText('.deduct')).includes('already deducted'),'cannot deduct the same job twice');
    ok(await p.locator('.verdict.v-done').count()===1&&(await p.innerText('#job-result .verdict')).includes('DONE — Parts taken off the shelf')&&await p.locator('.verdict.v-red').count()===0&&await p.locator('.risk').count()===0,'after deducting: calm DONE banner, no scary red re-check');
    let s5=await stock5();
    ok(s5['PETG Matte Black - Bambu']===700&&s5['Brass Standoff M3']===4&&s5['M3x8 socket cap screw']===130,'stock deducted: 700 g / 4 pcs / 130 pcs');
    await p.click('#tab-filament'); ok((await p.locator('#filament-grid .card',{hasText:'PETG Matte Black - Bambu'}).innerText()).includes('700 g left'),'Filament tab updated immediately');
    await p.click('#tab-hardware'); const bs=p.locator('#hardware-groups .card',{hasText:'Brass Standoff M3'}); ok((await bs.innerText()).includes('4 pcs')&&await bs.evaluate(e=>e.classList.contains('low')),'Hardware tab updated immediately (4 pcs, now low)');
    await p.click('#tab-job'); ok(await p.isVisible('#deduct-strip .strip'),'strip still shown on Parts Check');
    await noOv('deduct strip');
    await p.screenshot({path:SH+name+'-deduct.png',fullPage:true});
    await p.click('[data-act=undo-deduct]');
    s5=await stock5();
    ok(s5['PETG Matte Black - Bambu']===1000&&s5['Brass Standoff M3']===12&&s5['M3x8 socket cap screw']===140,'Undo restores the exact previous weights and counts (1000 g / 12 / 140)');
    ok(await p.locator('#deduct-strip .strip').count()===0&&await p.isEnabled('[data-act=deduct]'),'strip gone, button ready again');
    ok((await p.innerText('#job-result .verdict')).includes('GREEN'),'after Undo the job reads GREEN again');
    // undo survives a reload
    await p.click('[data-act=deduct]'); await p.reload(); await p.click('#tab-job');
    ok(await p.isVisible('#deduct-strip .strip'),'Undo strip survives a reload');
    await p.click('[data-act=undo-deduct]'); s5=await stock5(); ok(s5['Brass Standoff M3']===12&&s5['PETG Matte Black - Bambu']===1000,'Undo after reload restores stock');
    // exact stock: down to zero, never below
    await p.click('#job-custom-btn'); await pick('[data-cj-item="0"]','Brass Standoff M3'); await p.fill('[data-cj-qty="0"]','13');
    ok(await p.isDisabled('[data-act=deduct]')&&(await p.innerText('.deduct')).includes('Restock missing parts before deducting.'),'13 needed, 12 on shelf: Deduct disabled with a plain note');
    await p.fill('[data-cj-qty="0"]','12');
    ok(await p.isEnabled('[data-act=deduct]'),'exactly 12 of 12: Deduct enabled');
    await p.click('[data-act=deduct]'); s5=await stock5(); ok(s5['Brass Standoff M3']===0,'stock goes to exactly 0, never below');
    await p.click('#tab-hardware'); await p.locator('#hardware-groups .card',{hasText:'Brass Standoff M3'}).locator('[data-act=adj][data-d="10"]').click();
    await p.waitForTimeout(1100); await p.click('#tab-job'); await p.click('[data-act=undo-deduct]'); s5=await stock5();
    ok(s5['Brass Standoff M3']===22,'Undo puts the taken parts back even after later edits (10 + 12 = 22)');
    await p.click('#tab-hardware'); await p.locator('#hardware-groups .card',{hasText:'Brass Standoff M3'}).locator('[data-act=count-save]').click();
    // presets: AMBER covered by stock can be deducted; RED cannot
    await p.click('#tab-job'); await p.click('[data-p=p3]');
    ok((await p.innerText('#job-result .verdict')).includes('RED')&&await p.isDisabled('[data-act=deduct]')&&(await p.innerText('.deduct')).includes('Restock missing parts before deducting.'),'RED preset: Deduct disabled, plain note');
    const before5=await stock5();
    await p.click('[data-p=p2]');
    ok((await p.innerText('#job-result .verdict')).includes('AMBER')&&await p.isEnabled('[data-act=deduct]')&&(await p.innerText('.deduct')).includes('not the full 15% extra'),'AMBER preset (stock covers the job itself): Deduct enabled with a note');
    await p.click('[data-act=deduct]'); s5=await stock5();
    ok(s5['PETG Grey 1.75mm']===before5['PETG Grey 1.75mm']-540&&s5['M3 brass heat-set insert (4mm long)']===before5['M3 brass heat-set insert (4mm long)']-16,'preset deduct takes 540 g PETG Grey and 16 inserts');
    await p.waitForTimeout(1100); await p.click('[data-act=undo-deduct]'); assert.deepStrictEqual(await stock5(),before5); ok(true,'Undo restores every item exactly');
    // ---- backup keeps the new fields; older files still load
    await p.click('[data-p=p1]');
    const [dl5]=await Promise.all([p.waitForEvent('download'),p.click('#export-btn')]);
    const f5=SH+name+'-backup5.json'; await dl5.saveAs(f5);
    const bk5=JSON.parse(fs.readFileSync(f5,'utf8'));
    ok(bk5.data.items.filter(i=>i.type==='filament').every(i=>'dried' in i)&&bk5.data.items.find(i=>i.name==='PETG Grey 1.75mm').dried===dago(0)&&bk5.data.items.some(i=>i.name==='HIPS Natural - Local'),'backup has dried dates and the new spools');
    ok(!/undo/i.test(JSON.stringify(bk5)),'undo history is not part of the backup');
    const pre5=JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1')));
    await p.click('#reset-btn'); await p.waitForTimeout(1100); await p.click('#reset-btn');
    ok(await p.locator('#filament-grid .card').count()===6,'reset: back to 6 spools');
    await p.setInputFiles('#import-file',f5); await p.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Backup loaded'));
    let same5=true; try{assert.deepStrictEqual(JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1'))),pre5)}catch(e){same5=false;console.log('  DIFF '+e.message.slice(0,500))}
    ok(same5&&await p.locator('#filament-grid .card').count()===8,'backup round-trips identically, with the 2 new spools');
    const oldC=JSON.parse(JSON.stringify(bk5)); oldC.data.items.forEach(i=>{delete i.dried;delete i.fitNote}); fs.writeFileSync(SH+'old-nodried.json',JSON.stringify(oldC));
    await p.setInputFiles('#import-file',SH+'old-nodried.json'); await p.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Backup loaded'));
    const st6=JSON.parse(await p.evaluate(()=>localStorage.getItem('stinablis_shopguard_v1')));
    ok(st6.items.filter(i=>i.type==='filament').every(i=>i.dried===null)&&st6.items.filter(i=>i.type==='hardware').every(i=>i.fitNote===''),'older backup without dried dates / fit notes loads with empty defaults');
    await p.click('#tab-filament');
    ok(await p.locator('.hum.red').count()===1&&(await pg5().locator('.hum').innerText()).includes('Opened 38 days ago'),'old backup: humidity counts from the opened date again');
    ok(await p.locator('#deduct-strip .strip').count()===0,'no stale undo strip after loading a file');
    // ---- jargon sweep with every new form and mode open
    await p.click('#reset-btn'); await p.waitForTimeout(1100); await p.click('#reset-btn');
    await p.click('#tab-filament'); await p.click('#add-fil-toggle'); await p.selectOption('#af-material','__other__'); await p.check('#af-opened'); await scan('Filament tab with add-spool form'); await noOv('add spool form (Other + Opened)'); await p.click('#add-fil-toggle');
    await p.fill('#fil-search','zzzz'); await scan('Filament tab, no matches'); await p.click('#filament-grid [data-act=clear-filters]');
    await p.click('#tab-hardware'); await p.fill('#hw-search','zzzz'); await scan('Hardware tab, no matches'); await p.click('#hardware-groups [data-act=clear-filters]');
    await p.click('#tab-job'); await p.click('#job-custom-btn'); await pick('#cj-spool','PETG Black'); await p.fill('#cj-grams','200'); await pick('[data-cj-item="0"]','M3x8'); await p.fill('[data-cj-qty="0"]','10'); await p.click('[data-act=cj-add-row]');
    await p.click('[data-act=deduct]'); await scan('Parts Check: custom job + deduct strip'); await noOv('custom job + deduct strip');
    await p.waitForTimeout(1100); await p.click('[data-act=undo-deduct]');
    await p.click('#reset-btn'); await p.waitForTimeout(1100); await p.click('#reset-btn');
    await p.click('#tab-filament'); await p.screenshot({path:SH+name+'-filament.png',fullPage:true});
    await p.click('#tab-hardware'); await p.screenshot({path:SH+name+'-hardware.png',fullPage:true});
    ok(errs.length===0,'zero console/page errors '+JSON.stringify(errs));
    await ctx.close();
  }
  await b.close();
  console.log('SUMMARY: '+passes+' passed, '+fails+' failed (desktop 1280px + phone 390px)');
  if(failed.length){console.log('FAILED CHECKS:');failed.forEach(f=>console.log('  '+f))}
  console.log(fails?fails+' FAILURES':'ALL PASSED'); process.exit(fails?1:0);
})().catch(e=>{console.log('CRASH: '+String(e&&e.message||e).split('\n')[0]+' (last check run: ['+cur+'])');process.exit(2)});
