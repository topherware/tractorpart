import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const output=path.resolve('test-output','catalog-controls-'+Date.now());
await fs.mkdir(output,{recursive:true});
process.env.DATA_DIR=path.join(output,'data');
process.env.NODE_ENV='test';
const {app}=await import('../server.js');
const {db,insert,now}=await import('../lib/db.js');
const {storePhoto}=await import('../lib/media.js');
const buffer=await sharp({create:{width:80,height:80,channels:3,background:'#d90b17'}}).png().toBuffer();
const asset=await storePhoto({buffer,size:buffer.length,mimetype:'image/png'});
const category=insert('categories',{name:'Filter Parts',normalized_name:'filter parts',slug:'filter-parts',created_at:now(),updated_at:now()});
const second=insert('categories',{name:'Transmission Parts',normalized_name:'transmission parts',slug:'transmission-parts',created_at:now(),updated_at:now()});
for(let i=0;i<300;i++)insert('products',{name:`Part ${i}`,slug:`part-${i}`,price_idr:1000+i,availability:i%3?'available':'unavailable',description:'Product stock for catalog testing.',category_id:i%2?category:second,image_asset_id:asset,publication_status:'published',published_at:now(),created_at:now(),updated_at:now()});
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({reducedMotion:'reduce'});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function choose(id,option){
  const select=page.locator(`#${id}`);
  const name=await select.getAttribute('name');
  const value=await select.locator('option').filter({hasText:option}).getAttribute('value');
  await page.locator(`#${id}-trigger`).click();
  await Promise.all([
    page.waitForURL(url=>url.searchParams.get(name)===value,{waitUntil:'networkidle'}),
    page.locator(`#${id}-options [role=option]`).filter({hasText:option}).click()
  ]);
}
async function language(value){
  const button=page.locator(`[data-language=${value}]`);
  if(await button.isVisible()){await button.click();return;}
  await page.locator('#mobile-language-trigger').click();
  await page.locator(`#mobile-language-option-${value==='id'?0:1}`).click();
}
try {
  for(const width of [1440,1024,768,360]){
    await page.setViewportSize({width,height:900});
    await page.goto(base+'/products',{waitUntil:'networkidle'});
    await language('id');
    assert.equal(await page.locator('.product-card').count(),10);
    assert.equal(await page.locator('[data-i18n=findParts]').count(),0);
    assert.equal(await page.locator('.catalog-search-button').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(217, 11, 23)');
    assert.equal(await page.locator('#search').evaluate(e=>getComputedStyle(e).borderWidth),'0px');
    assert.equal(await page.locator('.page-number.current').textContent(),'1');
    assert.equal(await page.locator('.page-number').last().textContent(),'30');
    assert.ok(await page.locator('.page-ellipsis').count());
    await page.locator('#category-trigger').click();
    await page.screenshot({path:path.join(output,`dropdown-${width}.png`)});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#category-trigger').getAttribute('aria-expanded'),'false');
    await page.locator('#category-trigger').click();await page.locator('#category-trigger').click();await page.locator('#category-trigger').click();
    assert.equal(await page.locator('#category-options').isVisible(),true);
    await page.locator('h1').click();assert.equal(await page.locator('#category-trigger').getAttribute('aria-expanded'),'false');
    await choose('category','Filter Parts');assert.equal(new URL(page.url()).searchParams.get('category'),'filter-parts');
    await page.goto(base+'/products?q=Part&sort=price-high&per_page=10&page=3',{waitUntil:'networkidle'});
    await page.locator('#per-page-trigger').scrollIntoViewIfNeeded();
    await choose('per-page','20 / halaman');
    const url=new URL(page.url());assert.equal(url.searchParams.get('per_page'),'20');assert.equal(url.searchParams.has('page'),false);assert.equal(url.searchParams.get('q'),'Part');assert.equal(url.searchParams.get('sort'),'price-high');
    assert.equal(await page.locator('.product-card').count(),20);
    await choose('availability','Tersedia');assert.equal(new URL(page.url()).searchParams.get('availability'),'available');assert.equal(new URL(page.url()).searchParams.get('per_page'),'20');
    await page.locator('#sort-trigger').focus();await page.keyboard.press('Enter');await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('#sort-trigger').getAttribute('aria-activedescendant'),'sort-option-1');
    await Promise.all([page.waitForURL(url=>url.searchParams.get('sort')==='price-low',{waitUntil:'networkidle'}),page.keyboard.press('Enter')]);
    assert.equal(new URL(page.url()).searchParams.get('sort'),'price-low');
    await page.locator('#search').fill('Part 2');await Promise.all([page.waitForURL(url=>url.searchParams.get('q')==='Part 2',{waitUntil:'networkidle'}),page.locator('.catalog-search-button').click()]);assert.equal(new URL(page.url()).searchParams.get('q'),'Part 2');assert.equal(new URL(page.url()).searchParams.has('page'),false);
    await page.goto(base+'/products?per_page=10',{waitUntil:'networkidle'});await Promise.all([page.waitForURL(url=>url.searchParams.get('page')==='5',{waitUntil:'networkidle'}),page.locator('.page-number').filter({hasText:/^5$/}).click()]);assert.equal(new URL(page.url()).searchParams.get('page'),'5');
    await language('en');assert.equal(await page.locator('#per-page-trigger').textContent(),'10 / page');assert.equal(await page.locator('#availability-trigger').textContent(),'All statuses');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('.catalog-pagination').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`pagination-${width}.png`)});
    const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  }
  await page.goto(base+'/products?q=Part&category=filter-parts&sort=price-high&per_page=10',{waitUntil:'networkidle'});
  await Promise.all([page.waitForURL(url=>url.searchParams.get('page')==='15',{waitUntil:'networkidle'}),page.locator('.page-number').filter({hasText:/^15$/}).click()]);
  assert.equal(await page.locator('.page-step[aria-disabled=true]').count(),1);
  assert.equal(new URL(page.url()).searchParams.get('category'),'filter-parts');
  await Promise.all([page.waitForURL(url=>url.searchParams.get('page')==='14',{waitUntil:'networkidle'}),page.locator('a.page-step').click()]);
  await Promise.all([page.waitForURL(url=>url.searchParams.get('page')==='15',{waitUntil:'networkidle'}),page.locator('a.page-step').last().click()]);
  await choose('per-page','50 / page');assert.equal(await page.locator('.product-card').count(),50);
  await choose('per-page','100 / page');assert.equal(await page.locator('.product-card').count(),100);
  await page.goto(base+'/products?q=missing-product',{waitUntil:'networkidle'});assert.equal(await page.locator('.product-card').count(),0);assert.equal(await page.locator('.page-step[aria-disabled=true]').count(),2);
  const emptyAudit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(emptyAudit.violations.map(v=>v.id),[]);
  const animated=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  const motionPage=await animated.newPage();await motionPage.goto(base+'/products',{waitUntil:'networkidle'});
  const trigger=motionPage.locator('#category-trigger');
  await trigger.click();await trigger.click();await trigger.click();
  await motionPage.waitForTimeout(300);
  assert.equal(await motionPage.locator('#category-options').isVisible(),true);
  assert.equal(await motionPage.locator('#category-options').evaluate(e=>e.inert),false);
  await motionPage.keyboard.press('Escape');await motionPage.waitForTimeout(200);
  assert.equal(await motionPage.locator('#category-options').isVisible(),false);
  await animated.close();
  const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:360,height:900}});
  const native=await noJs.newPage();await native.goto(base+'/products');assert.equal(await native.locator('#category').isVisible(),true);assert.equal(await native.locator('#per-page').isVisible(),true);
  await native.locator('#per-page').selectOption('20');await Promise.all([native.waitForURL(url=>url.searchParams.get('per_page')==='20',{waitUntil:'networkidle'}),native.locator('.page-size-submit').click()]);assert.equal(await native.locator('.product-card').count(),20);await noJs.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: custom dropdowns, keyboard/outside/rapid close, search, numbered pagination, page sizes, filter preservation, ID/EN, no-JS, 4 widths, zero axe violations. '+output);
} finally {await browser.close();await new Promise(r=>server.close(r));db.close();}
