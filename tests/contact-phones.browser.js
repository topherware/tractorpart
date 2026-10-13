import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const output=path.resolve('test-output','contact-phones-'+Date.now());
await fs.mkdir(output,{recursive:true});
process.env.DATA_DIR=path.join(output,'data');process.env.NODE_ENV='test';process.env.DATABASE_URL='';process.env.VERCEL='';
const {app}=await import('../server.js');const {db,one,run}=await import('../lib/db.js');const {createAdmin}=await import('../lib/auth.js');
const password=randomBytes(24).toString('hex');await createAdmin('phones@example.test',password);
// A pre-existing single phone requires no schema change or manual migration.
await run("UPDATE contact_content SET whatsapp=?,phone=?,address=?,opening_hours=? WHERE id=1",'6281211111111','622112345678','Alamat pengujian','Senin - Sabtu');
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port;process.env.BASE_URL=base;
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const errors=[];
async function save(page,status=200){
  const response=page.waitForResponse(r=>r.url()===base+'/api/admin/contact'&&r.request().method()==='PUT');
  await page.getByRole('button',{name:'Simpan Perubahan',exact:true}).click();assert.equal((await response).status(),status);
  if(status===200)await page.getByRole('status').filter({hasText:'Perubahan berhasil'}).waitFor();
}
try{
  const desktop=await browser.newContext({viewport:{width:1440,height:1000}});const page=await desktop.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/admin/login');await page.getByLabel('Email admin').fill('phones@example.test');await page.getByLabel('Password',{exact:true}).fill(password);
  await Promise.all([page.waitForURL(base+'/admin'),page.getByRole('button',{name:'Masuk',exact:true}).click()]);
  await page.goto(base+'/admin/contact');assert.equal(await page.getByLabel('Telepon',{exact:true}).inputValue(),'622112345678');
  assert.match(await page.locator('#whatsapp-hint').textContent(),/tujuan tombol Hubungi Kami dan Cek Ketersediaan/);
  await page.getByRole('button',{name:'Tambah Nomor Telepon',exact:true}).click();await page.getByLabel('Telepon 2',{exact:true}).fill('081355667788');
  await save(page);assert.equal((await one('SELECT phone FROM contact_content WHERE id=1')).phone,'622112345678\n6281355667788');
  await page.reload();assert.equal(await page.locator('[data-phone-number]').count(),2);assert.equal(await page.getByLabel('Telepon 2',{exact:true}).inputValue(),'6281355667788');
  const before=await page.locator('[data-phone-number]').evaluateAll(inputs=>inputs.map(i=>i.value));
  await page.getByRole('button',{name:'English',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Add Phone Number',exact:true}).count(),1);
  assert.equal(await page.getByLabel('Phone 2',{exact:true}).inputValue(),before[1]);
  await page.getByRole('button',{name:'Add Phone Number',exact:true}).click();assert.equal(await page.getByLabel('Phone 3',{exact:true}).count(),1);
  await page.locator('.contact-phone-row').last().getByRole('button',{name:'Remove Number',exact:true}).click();
  await page.getByRole('button',{name:'Bahasa Indonesia',exact:true}).click();
  await page.getByLabel('Telepon 2',{exact:true}).fill('not a phone');await save(page,422);
  assert.match(await page.locator('[data-error="phones"]').textContent(),/nomor telepon Indonesia/);
  assert.equal(await page.getByLabel('Telepon',{exact:true}).evaluate(input=>input===document.activeElement),true);
  assert.equal((await one('SELECT phone FROM contact_content WHERE id=1')).phone,'622112345678\n6281355667788');
  await page.getByLabel('Telepon 2',{exact:true}).fill('6281355667788');await save(page);
  await page.screenshot({path:path.join(output,'admin-desktop.png'),fullPage:true});
  assert.equal((await new AxeBuilder({page}).analyze()).violations.length,0);

  const mobile=await browser.newContext({viewport:{width:360,height:844},isMobile:true,hasTouch:true});await mobile.addCookies(await desktop.cookies());
  const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(base+'/admin/contact');
  await phone.getByRole('button',{name:'Tambah Nomor Telepon',exact:true}).tap();await phone.getByLabel('Telepon 3',{exact:true}).fill('081477889900');
  await save(phone);await phone.reload();assert.equal(await phone.locator('[data-phone-number]').count(),3);
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await phone.screenshot({path:path.join(output,'admin-mobile.png'),fullPage:true});
  assert.equal((await new AxeBuilder({page:phone}).analyze()).violations.length,0);
  const publicPage=await mobile.newPage();await publicPage.goto(base+'/#kontak');
  for(const number of ['622112345678','6281355667788','6281477889900'])assert.equal(await publicPage.locator('a[href="tel:+'+number+'"]').count(),2);
  const waLinks=await publicPage.locator('a[href^="https://wa.me/"]').evaluateAll(links=>links.map(link=>new URL(link.href).pathname));
  assert.ok(waLinks.length>=3);assert.ok(waLinks.every(number=>number==='/6281211111111'));
  for(const width of [320,360,768,1440]){await phone.setViewportSize({width,height:900});assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
  await phone.locator('.contact-phone-row').nth(1).getByRole('button',{name:'Hapus Nomor',exact:true}).click();await save(phone);await phone.reload();
  assert.deepEqual(await phone.locator('[data-phone-number]').evaluateAll(inputs=>inputs.map(input=>input.value)),['622112345678','6281477889900']);
  await publicPage.reload();assert.equal(await publicPage.locator('a[href="tel:+6281355667788"]').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: legacy phone, add/remove/reload, validation retains data, ID/EN, touch mobile, public Home/footer numbers, unchanged WhatsApp destination, four viewport widths, two accessibility audits.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await db.close();}
