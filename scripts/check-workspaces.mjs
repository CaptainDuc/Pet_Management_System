// Uses the local, Git-ignored account file. Passwords and tokens are never logged.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const base = 'http://localhost:3000';
const baseline = process.argv.includes('--baseline');
const credentials = await readFile('TAI_KHOAN_KIEM_THU.local.txt', 'utf8');
const accounts = [...credentials.matchAll(/\((CUSTOMER|ADMIN|OWNER|STAFF|VETERINARIAN)\)\r?\nEmail: ([^\r\n]+)\r?\nMat khau: ([^\r\n]+)/g)].map(match => ({ role: match[1], email: match[2], password: match[3] }));
assert.equal(accounts.length, 5, 'Expected five local test accounts');
const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = pages.find(item => item.type === 'page');
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const errors = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.id && pending.has(message.id)) {
    const {resolve, reject} = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  }
};
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, {resolve, reject});
    socket.send(JSON.stringify({id, method, params}));
  });
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
  if (result.exceptionDetails) throw new Error('Browser interaction failed');
  return result.result.value;
}
async function waitFor(expression) {
  for (let i=0; i<120; i++) {
    try { if (await evaluate(expression)) return; } catch {}
    await delay(100);
  }
  throw new Error('Timed out waiting for workspace UI');
}
async function fill(selector, value) {
  await evaluate(`(() => { const input=document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
}
async function navigate(path) {
  await cdp('Page.navigate', {url:base+path});
  await delay(350);
}
async function viewport(width, height) {
  await cdp('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:width<760});
  await cdp('Emulation.setEmulatedMedia', {features:[{name:'prefers-color-scheme',value:'dark'},{name:'prefers-reduced-motion',value:'reduce'}]});
  await delay(200);
}
async function capture(name) {
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true, name+': horizontal overflow');
  await mkdir('.impeccable/review', {recursive:true});
  const shot = await cdp('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
  await writeFile('.impeccable/review/'+name+'.png',Buffer.from(shot.data,'base64'));
}

try {
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');
  await cdp('Network.setCacheDisabled', {cacheDisabled:true});
  await cdp('Page.addScriptToEvaluateOnNewDocument', {source:`window.__landingSeen=false;new MutationObserver(()=>{if(document.querySelector('header a[href="#dich-vu"]'))window.__landingSeen=true;}).observe(document,{childList:true,subtree:true});`});
  for (const account of accounts.filter(item => baseline ? item.role !== 'CUSTOMER' : true)) {
    await viewport(1440,1000);
    await navigate('/login');
    await evaluate('localStorage.clear()');
    await navigate('/login');
    await waitFor("!!document.querySelector('#login-email')");
    errors.length=0;
    await fill('#login-email',account.email);
    await fill('#login-password',account.password);
    await evaluate("document.querySelector('button[type=submit]').click()");
    if (account.role === 'CUSTOMER') {
      await waitFor("location.pathname==='/' && !!document.querySelector('a[href=\"/dashboard\"]')");
      await navigate('/dashboard');
      await waitFor("!!document.querySelector('.pc-nav') && !document.querySelector('.pc-work')");
      console.log('PASS: CUSTOMER keeps landing-first login and customer dashboard');
      continue;
    }
    await waitFor("location.pathname==='/dashboard' && !!document.querySelector('main')");
    await delay(350);
    if (baseline) { await capture('workspace-before-'+account.role.toLowerCase()); continue; }
    assert.equal(await evaluate('window.__landingSeen'),false,account.role+': landing appeared after login');
    await waitFor("!!document.querySelector('.pc-work')");
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.pc-work')).backgroundColor"),'rgb(243, 248, 254)');
    const tabs = await evaluate("[...document.querySelectorAll('.pc-nav button')].map(button=>button.textContent)");
    if (account.role === 'ADMIN') {
      await waitFor("document.querySelector('table')?.textContent.includes('owner.test@petcare.invalid')");
      await fill('input[aria-label="Tìm tài khoản"]','owner.test@petcare.invalid');
      await waitFor("document.querySelector('table')?.textContent.includes('owner.test@petcare.invalid') && !document.querySelector('table')?.textContent.includes('staff.test@petcare.invalid')");
      await fill('input[aria-label="Tìm tài khoản"]','');
    }
    await capture('workspace-'+account.role.toLowerCase()+'-desktop');
    if (['STAFF','VETERINARIAN'].includes(account.role)) {
      const label = account.role === 'STAFF' ? 'Tiếp đón khách vãng lai' : 'Lập bệnh án mới';
      await evaluate(`[...document.querySelectorAll('main button')].find(button=>button.textContent.trim()===${JSON.stringify(label)}).click()`);
      await waitFor("!!document.querySelector('[role=dialog]')");
      assert.equal(await evaluate("getComputedStyle(document.querySelector('[role=dialog]')).backgroundColor"),'rgb(255, 255, 255)');
      assert.equal(await evaluate("document.querySelector('[role=dialog]').getBoundingClientRect().width <= 680"),true,'Workspace dialog must stay bounded');
      await capture('workspace-'+account.role.toLowerCase()+'-form-desktop');
      await viewport(390,844);
      await capture('workspace-'+account.role.toLowerCase()+'-form-mobile');
      await evaluate("document.querySelector('[role=dialog] [aria-label=\"Close modal\"]').click()");
      await viewport(1440,1000);
    }
    for (let index=0; index<tabs.length; index++) {
      await evaluate(`document.querySelectorAll('.pc-nav button')[${index}].click()`);
      await waitFor(`document.querySelector('main h1')?.textContent === ${JSON.stringify(tabs[index])}`);
      await delay(150);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),true,account.role+': '+tabs[index]+' overflows');
    }
    await evaluate("document.querySelector('.pc-nav button').click()");
    await viewport(390,844);
    await capture('workspace-'+account.role.toLowerCase()+'-mobile');
    for (let index=1; index<tabs.length; index++) {
      await evaluate("document.querySelector('.pc-work-menu').click()");
      await evaluate(`document.querySelectorAll('.pc-nav button')[${index}].click()`);
      await waitFor(`document.querySelector('main h1')?.textContent === ${JSON.stringify(tabs[index])}`);
      await delay(100);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),true,account.role+': mobile '+tabs[index]+' overflows');
      if (account.role === 'ADMIN' && index === 2) await capture('workspace-admin-permissions-mobile');
    }
    await evaluate("document.querySelector('.pc-work-menu').click()");
    await waitFor("!!document.querySelector('.pc-work-sidebar--open')");
    await capture('workspace-'+account.role.toLowerCase()+'-menu');
    await evaluate("document.querySelectorAll('.pc-nav button')[document.querySelectorAll('.pc-nav button').length-1].click()");
    await waitFor("!document.querySelector('.pc-work-sidebar--open')");
    await viewport(1440,1000);
    await navigate('/');
    await waitFor("location.pathname==='/dashboard' && !!document.querySelector('.pc-work')");
    assert.equal(await evaluate('window.__landingSeen'),false,account.role+': saved session showed landing');
    await navigate('/dashboard');
    await waitFor("!!document.querySelector('.pc-work')");
    assert.deepEqual(errors,[],account.role+': runtime error');
    await evaluate("document.querySelector('.pc-sidebar-bottom button').click()");
    await waitFor("location.pathname==='/login' && !!document.querySelector('#login-email')");
    console.log('PASS: '+account.role+' direct login, all '+tabs.length+' tabs, mobile menu, saved session and logout');
  }
  if (!baseline) assert.deepEqual(errors,[],'Customer runtime errors');
} finally {
  await evaluate('localStorage.clear()').catch(()=>{});
  socket.close();
}
