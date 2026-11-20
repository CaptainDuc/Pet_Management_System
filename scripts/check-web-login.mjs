// Requires a dedicated headless browser listening on localhost:9222.
// Creates one clearly named test account when --register is supplied.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.argv.find(arg => /^https?:/.test(arg)) || 'http://localhost:3000';
const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = pages.find(item => item.type === 'page');
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let sequence = 0;
const pending = new Map();
const requests = new Map();
const runtimeErrors = [];
let mockBookingRequest;
let mockedBookings = [];
let pendingPromotion;
const serviceId = '11000000-0000-0000-0000-000000000001';
const secondServiceId = '11000000-0000-0000-0000-000000000002';
const slotId = '22000000-0000-0000-0000-000000000001';
const testDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
socket.onmessage = async event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Fetch.requestPaused') {
    const { requestId, request } = message.params;
    const url = new URL(request.url);
    let body;
    let responseCode = 200;
    if (url.pathname.endsWith('/services')) body = { data: { content: [{ id: serviceId, name: 'Chăm sóc toàn diện', basePrice: 250000, durationMinutes: 30 }, { id: secondServiceId, name: 'Spa cho bé', basePrice: 350000, durationMinutes: 30 }] } };
    else if (url.pathname.endsWith('/promotions/validate')) { pendingPromotion = requestId; return; }
    else if (url.pathname.includes('/slots/available')) {
      const date = url.searchParams.get('date');
      body = { data: { staff: [{ staffId: '33000000-0000-0000-0000-000000000001', slots: [{ slotId, available: true, startTime: date + 'T09:00:00+07:00', endTime: date + 'T09:30:00+07:00' }] }] } };
    } else if (url.pathname.endsWith('/bookings') && request.method === 'POST') {
      mockBookingRequest = JSON.parse(request.postData);
      mockedBookings = [{ id: '44000000-0000-0000-0000-000000000001', petId: mockBookingRequest.petId, status: 'PENDING', paymentStatus: 'UNPAID', totalAmount: 250000, items: [{ serviceName: 'Chăm sóc toàn diện', startTime: testDate + 'T09:00:00+07:00' }] }];
      body = { data: mockedBookings[0] };
      responseCode = 201;
    } else body = { data: { content: mockedBookings } };
    await cdp('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') {
    const details = message.params.exceptionDetails;
    runtimeErrors.push(details.exception?.description || details.text);
  }
  if (message.id) {
    const callback = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callback.reject(new Error(message.error.message));
    else callback.resolve(message.result);
  }
  if (message.method === 'Network.requestWillBeSent') {
    requests.set(message.params.requestId, message.params.request.url);
  }
  if (message.method === 'Network.loadingFailed') {
    console.log('NETWORK FAILURE', requests.get(message.params.requestId),
      message.params.errorText, message.params.corsErrorStatus || '');
  }
  if (message.method === 'Network.responseReceived' &&
      message.params.response.url.includes('/api/v1/auth/')) {
    console.log('AUTH HTTP', message.params.response.status, message.params.response.url);
  }
};
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.deepEqual(runtimeErrors, [], 'Uncaught browser exception');
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error('Timed out: ' + expression);
}
async function fill(selector, value) {
  await evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', {bubbles: true}));
  })()`);
}

async function capture(name, width = 1440, height = 900) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 760 });
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await delay(250);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), true, name + ': horizontal overflow');
  await mkdir('.impeccable/review', { recursive: true });
  await evaluate('window.scrollTo(0, 0)');
  const layout = await cdp('Page.getLayoutMetrics');
  const size = layout.cssContentSize;
  const dialogOpen = await evaluate("!!document.querySelector('[role=dialog]')");
  const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !dialogOpen,
    clip: { x: 0, y: 0, width: size.width, height: dialogOpen ? height : Math.min(size.height, 10000), scale: 1 } });
  await writeFile('.impeccable/review/' + name + '.png', Buffer.from(shot.data, 'base64'));
}

async function enterDashboard() {
  await waitFor("location.pathname === '/' && !!document.querySelector('a[href=\"/dashboard\"]')");
  await evaluate("document.querySelector('a[href=\"/dashboard\"]').click()");
  await waitFor("!!document.querySelector('main') && document.querySelectorAll('.pc-nav button').length > 0");
}

async function checkCustomerFlow() {
  await waitFor("!!document.querySelector('.pc-empty h3') && !document.querySelector('[role=status] .pc-muted')");
  await capture('dashboard-empty');
  await evaluate("document.querySelector('.pc-empty .pc-button').click()");
  await waitFor("!!document.querySelector('input[name=petName]')");
  await fill('input[name=petName]', 'Milo');
  await fill('input[name=petWeight]', '4.5');
  await fill('textarea[name=petNotes]', 'Poodle. Bé thích đi dạo.');
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!document.querySelector('.pc-dialog') && !!document.querySelector('.pc-pet')");
  await evaluate("document.querySelector('.pc-pet-actions .pc-text-button').click()");
  await waitFor("!!document.querySelector('input[name=petWeight]')");
  await delay(50);
  await evaluate("document.querySelector('input[name=petWeight]').focus()");
  await fill('input[name=petWeight]', '5.2');
  assert.equal(await evaluate('document.activeElement.name'), 'petWeight', 'Editing must retain field focus');
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!document.querySelector('.pc-dialog') && document.querySelector('.pc-pet').innerText.includes('5.2 kg')");
  await capture('desktop');
  await capture('mobile', 390, 844);
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp('Fetch.enable', { patterns: ['*api/v1/services*', '*api/v1/schedules/slots/available*', '*api/v1/bookings*', '*api/v1/promotions/validate*'].map(urlPattern => ({ urlPattern })) });
  await cdp('Page.reload');
  await waitFor("!!document.querySelector('.pc-heading button:not([disabled])') && !!document.querySelector('.pc-pet')");
  await evaluate("document.querySelector('.pc-heading .pc-button').click()");
  await waitFor("!!document.querySelector('.pc-choice')");
  await evaluate("document.querySelector('.pc-choice').click()");
  await capture('booking-step-1');
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!!document.querySelector('input[name=bookingDate]')");
  await fill('input[name=bookingDate]', testDate);
  await waitFor("!!document.querySelector('.pc-slot-grid button')");
  await evaluate("document.querySelector('.pc-slot-grid button').click()");
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!!document.querySelector('textarea[name=bookingNotes]')");
  await fill('textarea[name=bookingNotes]', 'Bé hơi nhút nhát.');
  await capture('booking-confirm-desktop');
  await capture('booking-confirm-mobile', 390, 844);
  await evaluate("document.querySelector('.pc-form-actions button[type=button]').click()");
  await waitFor("!!document.querySelector('input[name=bookingDate]')");
  assert.equal(await evaluate("document.querySelector('input[name=bookingDate]').value"), testDate);
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!!document.querySelector('textarea[name=bookingNotes]')");
  assert.equal(await evaluate("document.querySelector('textarea[name=bookingNotes]').value"), 'Bé hơi nhút nhát.');
  await fill('input[name=promotionCode]', 'TEST10');
  await evaluate("document.querySelector('.pc-promo button').click()");
  for (let attempt = 0; !pendingPromotion && attempt < 50; attempt++) await delay(20);
  assert.ok(pendingPromotion, 'Promotion request must start');
  await evaluate("document.querySelector('.pc-form-actions button[type=button]').click()");
  await waitFor("!!document.querySelector('input[name=bookingDate]')");
  await evaluate("document.querySelector('.pc-form-actions button[type=button]').click()");
  await waitFor("!!document.querySelector('.pc-choice-grid')");
  await evaluate("document.querySelectorAll('.pc-choice-grid button')[1].click()");
  await cdp('Fetch.fulfillRequest', { requestId: pendingPromotion, responseCode: 200,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
    body: Buffer.from(JSON.stringify({ data: { valid: true, discountAmount: 25000, finalAmount: 225000 } })).toString('base64') });
  await delay(100);
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!!document.querySelector('.pc-slot-grid button')");
  await evaluate("document.querySelector('.pc-slot-grid button').click()");
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!!document.querySelector('.pc-summary-total')");
  assert.equal(await evaluate("document.querySelector('.pc-summary-total').innerText.includes('350.000')"), true, 'Old service promotion must not change the new total');
  assert.equal(await evaluate("document.querySelector('.pc-dialog button[type=submit]').disabled"), true, 'Old promotion must be revalidated');
  await fill('input[name=promotionCode]', '');
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!document.querySelector('.pc-dialog') && !!document.querySelector('.pc-booking')");
  assert.equal(mockBookingRequest.items[0].serviceId, secondServiceId);
  assert.equal(mockBookingRequest.items[0].timeSlotId, slotId);
  assert.equal(mockBookingRequest.notes, 'Bé hơi nhút nhát.');
  console.log('PASS: real pet create/edit; three-step booking with controlled service/availability responses');
  await cdp('Fetch.disable');
}

try {
  await cdp('Network.enable');
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Page.navigate', { url: base + '/' });
  await waitFor("!!document.querySelector('a[href=\"/login\"]')");
  await evaluate('localStorage.clear()');
  await cdp('Page.navigate', { url: base + '/login' });
  await waitFor("!!document.querySelector('#login-email')");
  if (process.argv.includes('--customer-flow')) {
    await capture('login-desktop');
    await capture('login-mobile', 390, 844);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  }
  await evaluate('localStorage.clear()');
  await fill('#login-email', 'missing-' + randomUUID() + '@petcare.invalid');
  await fill('#login-password', 'Incorrect123!');
  await evaluate("document.querySelector('button[type=submit]').click()");
  await waitFor("!!document.querySelector('[role=alert]')");
  const error = await evaluate("document.querySelector('[role=alert]').innerText");
  console.log('LOGIN ERROR:', error);
  assert.match(error, /Email .*không chính xác/);

  if (process.argv.includes('--register')) {
    const email = 'browser-check-' + randomUUID() + '@petcare.invalid';
    const password = randomUUID() + 'Aa1!';
    console.log('TEST ACCOUNT', email);
    await cdp('Page.navigate', { url: base + '/register' });
    await waitFor("!!document.querySelector('#register-fullname')");
    await fill('#register-fullname', process.argv.includes('--customer-flow') ? 'Minh Anh' : 'Browser service check');
    await fill('#register-email', email);
    await fill('#register-password', password);
    await fill('#register-confirmpassword', password);
    await evaluate("document.querySelector('button[type=submit]').click()");
    await waitFor("!!localStorage.getItem('accessToken') || !!document.querySelector('[role=alert]')");
    assert.equal(await evaluate("document.querySelector('[role=alert]')?.innerText || null"), null);
    console.log('REGISTER PASS', email);
    await enterDashboard();
    await evaluate('localStorage.clear()');
    await cdp('Page.navigate', { url: base + '/login' });
    await waitFor("!!document.querySelector('#login-email')");
    await fill('#login-email', email);
    await fill('#login-password', password);
    await evaluate("document.querySelector('button[type=submit]').click()");
    await waitFor("!!localStorage.getItem('accessToken') || !!document.querySelector('[role=alert]')");
    assert.equal(await evaluate("document.querySelector('[role=alert]')?.innerText || null"), null);
    assert.equal(await evaluate("JSON.parse(localStorage.getItem('user')).email"), email);
    await enterDashboard();
    console.log('LOGIN PASS', await evaluate('location.pathname'));
    for (const path of ['/api/v1/users/me', '/api/v1/notifications/unread-count']) {
      const result = await evaluate(`(async () => {
        const response = await fetch(${JSON.stringify(path)}, {
          headers: {Authorization: 'Bearer ' + localStorage.getItem('accessToken')}
        });
        const body = await response.json();
        return {status: response.status, success: body.success};
      })()`);
      assert.equal(result.status, 200, path);
      assert.equal(result.success, true, path);
      console.log('AUTHENTICATED API PASS', path);
    }
    if (process.argv.includes('--customer-flow')) await checkCustomerFlow();
    // A saved session keeps the landing page and exposes the dashboard link.
    await cdp('Page.navigate', { url: base + '/' });
    await enterDashboard();
    assert.deepEqual(runtimeErrors, [], 'Dashboard must render without uncaught exceptions');
    console.log('SAVED SESSION DASHBOARD PASS');
    await evaluate('localStorage.clear()');
  }
} finally {
  socket.close();
}
