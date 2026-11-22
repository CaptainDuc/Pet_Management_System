// Requires a dedicated headless browser listening on localhost:9222.
// Creates one clearly named test account when --register is supplied.
// Registration/reset tests require PETCARE_TEST_EMAIL and interactively entered Gmail codes.
import assert from 'node:assert/strict';
import { createInterface } from 'node:readline/promises';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.argv.find(arg => /^https?:/.test(arg)) || 'http://localhost:3000';
const testEmail = process.env.PETCARE_TEST_EMAIL?.trim().toLowerCase();
if (process.argv.includes('--register')) {
  assert.ok(testEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail) && !testEmail.endsWith('.invalid'),
    'Set PETCARE_TEST_EMAIL to a new, unused email address you control; verification codes are entered from Gmail');
}
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
let mockCancellationReason;
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
    else if (url.pathname.endsWith('/ai/tips')) body = { success: true, data: { answer: 'Đã chuẩn bị lịch cho Milo.', status: 'success', bookingForm: { petId: mockBookingRequest.petId, serviceId: secondServiceId, date: testDate, note: 'Ghi chú từ đề xuất AI.', requiresConfirmation: true } } };
    else if (url.pathname.endsWith('/cancel')) {
      mockCancellationReason = JSON.parse(request.postData).reason;
      mockedBookings = mockedBookings.map(booking => ({ ...booking, status: 'CANCELLED' }));
      body = { data: mockedBookings[0] };
    }
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
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

async function reloadPage() {
  const previous = await evaluate('performance.timeOrigin');
  await cdp('Page.reload');
  await waitFor(`performance.timeOrigin !== ${previous} && document.readyState === 'complete'`);
}

async function emailCode(email, purpose) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const code = (await prompt.question(`Enter the ${purpose} code sent to ${email}: `)).replace(/\s/g, '');
    assert.match(code, /^[0-9]{6}$/, 'Email verification code must contain six digits');
    return code;
  } finally { prompt.close(); }
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

async function checkLiveCareServices() {
  const names = ['Tắm vệ sinh', 'Cắt tỉa tạo kiểu', 'Vệ sinh tai', 'Cắt móng', 'Cạo lông vệ sinh', 'Combo cơ bản', 'Combo đầy đủ', 'Combo cao cấp'];
  await evaluate("document.querySelector('.pc-heading .pc-button').click()");
  await waitFor("document.querySelectorAll('.pc-choice-grid button').length >= 8");
  const choices = await evaluate("[...document.querySelectorAll('.pc-choice-grid strong')].map(node => node.textContent)");
  for (const name of names) assert.ok(choices.includes(name), 'Live catalogue missing '+name);
  await capture('care-services-desktop');
  await capture('care-services-mobile', 390, 844);
  await cdp('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate("[...document.querySelectorAll('.pc-choice-grid button')].find(button => button.querySelector('strong').textContent === 'Combo cao cấp').click()");
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!!document.querySelector('input[name=bookingDate]')");
  await fill('input[name=bookingDate]', testDate);
  await waitFor("!!document.querySelector('.pc-slot-grid button')");
  const windows = await evaluate("[...document.querySelectorAll('.pc-slot-grid button')].map(button=>button.textContent)");
  for (const window of windows) {
    const [start,end] = window.split('–').map(value=>value.trim().split(':').map(Number));
    assert.equal(end[0]*60+end[1] - start[0]*60-start[1],150,'Live high-tier combo needs 150 minutes');
  }
  await capture('care-slots-desktop');
  await evaluate("document.querySelector('.pc-slot-grid button').click()");
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!!document.querySelector('.pc-summary-total')");
  assert.equal(await evaluate("document.querySelector('.pc-summary').textContent.includes('150 phút')"),true);
  assert.equal(await evaluate("document.querySelector('.pc-summary-total').textContent.includes('450.000')"),true);
  await capture('care-confirm-desktop');
  await capture('care-confirm-mobile',390,844);
  await evaluate("document.querySelector('.pc-dialog [aria-label=\"Close modal\"]').click()");
  console.log('PASS: eight real care services, live 150-minute availability and 450000 VND confirmation; no booking submitted');
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
  await evaluate(`(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['not an image'], 'wrong.txt', {type: 'text/plain'}));
    document.querySelector('.pc-photo-drop').dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:transfer}));
  })()`);
  await waitFor("document.querySelector('.pc-photo-field [role=alert]')?.textContent.includes('JPG, PNG')");
  await evaluate(`(async () => {
    const blob = await (await fetch('/images/hero.webp')).blob();
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'pet.webp', {type: 'image/webp'}));
    document.querySelector('.pc-photo-drop').dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:transfer}));
  })()`);
  await waitFor("document.querySelector('.pc-photo-drop img')?.src.startsWith('data:image/jpeg;base64,') && !document.querySelector('.pc-dialog button[type=submit]').disabled");
  const dom = await cdp('DOM.getDocument');
  const fileInput = await cdp('DOM.querySelector', {nodeId: dom.root.nodeId, selector: 'input[name=petPhotoFile]'});
  await cdp('DOM.setFileInputFiles', {nodeId: fileInput.nodeId, files: [resolve('web/public/images/hero.webp')]});
  await waitFor("document.querySelector('.pc-photo-drop img')?.complete && !document.querySelector('.pc-dialog button[type=submit]').disabled");
  await evaluate("document.querySelector('.pc-photo-drop').scrollIntoView({block:'center'})");
  await capture('pet-photo-desktop');
  await capture('pet-photo-mobile', 390, 844);
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!document.querySelector('.pc-dialog') && document.querySelector('.pc-pet').innerText.includes('5.2 kg')");
  await reloadPage();
  await waitFor("document.querySelector('.pc-pet img')?.naturalWidth > 0");
  assert.equal(await evaluate("document.querySelector('.pc-pet img').src.startsWith('data:image/jpeg;base64,')"), true);
  console.log('PASS: image drag/drop, file selection, invalid type rejection and real persisted photo after reload');
  await capture('desktop');
  await capture('mobile', 390, 844);
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  if (process.argv.includes('--care-services')) {
    await checkLiveCareServices();
    return;
  }
  await cdp('Fetch.enable', { patterns: ['*api/v1/services*', '*api/v1/schedules/slots/available*', '*api/v1/bookings*', '*api/v1/promotions/validate*', '*api/v1/ai/tips*'].map(urlPattern => ({ urlPattern })) });
  await reloadPage();
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
  await evaluate("[...document.querySelectorAll('.pc-booking button')].find(button => button.textContent === 'Hủy lịch hẹn').click()");
  await waitFor("!!document.querySelector('.pc-dialog textarea')");
  await fill('.pc-dialog textarea', 'Đổi ngày hẹn cho bé.');
  await evaluate("document.querySelector('.pc-dialog form').requestSubmit()");
  await waitFor("!document.querySelector('.pc-dialog') && document.querySelector('.pc-booking').innerText.includes('Đã hủy')");
  assert.equal(mockCancellationReason, 'Đổi ngày hẹn cho bé.');
  assert.equal(await evaluate("[...document.querySelectorAll('.pc-booking button')].some(button => button.textContent === 'Thanh toán')"), false);
  await evaluate("[...document.querySelectorAll('.pc-nav button')].find(button => button.textContent === 'Trợ lý AI').click()");
  await waitFor("!!document.querySelector('input[placeholder^=\"Hỏi AI\"]')");
  await fill('input[placeholder^="Hỏi AI"]', 'Tôi muốn đặt lịch khám cho Milo');
  await evaluate("document.querySelector('main form').requestSubmit()");
  await waitFor("[...document.querySelectorAll('main button')].some(button => button.textContent === 'Kiểm tra lịch AI đề xuất')");
  await capture('ai-chat-desktop');
  await capture('ai-chat-mobile', 390, 844);
  assert.equal(await evaluate(`(() => {
    const button = [...document.querySelectorAll('main button')].find(node => node.textContent === 'Kiểm tra lịch AI đề xuất');
    const pane = button.closest('[aria-live]');
    const a = button.getBoundingClientRect(), b = pane.getBoundingClientRect();
    return a.top >= b.top && a.bottom <= b.bottom;
  })()`), true, 'Newest AI booking action must be visible inside chat');
  assert.equal(await evaluate("[...document.querySelectorAll('.pc-mobile-nav button')].some(button => button.textContent === 'Trợ lý AI')"), true);
  await evaluate("[...document.querySelectorAll('main button')].find(button => button.textContent === 'Kiểm tra lịch AI đề xuất').click()");
  await waitFor("!!document.querySelector('.pc-choice[aria-pressed=true]')");
  assert.equal(await evaluate("document.querySelector('.pc-choice[aria-pressed=true]').textContent.includes('Spa cho bé')"), true);
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!!document.querySelector('input[name=bookingDate]')");
  assert.equal(await evaluate("document.querySelector('input[name=bookingDate]').value"), testDate);
  await waitFor("!!document.querySelector('.pc-slot-grid button')");
  await evaluate("document.querySelector('.pc-slot-grid button').click()");
  await evaluate("document.querySelector('.pc-dialog button[type=submit]').click()");
  await waitFor("!!document.querySelector('textarea[name=bookingNotes]')");
  assert.equal(await evaluate("document.querySelector('textarea[name=bookingNotes]').value"), 'Ghi chú từ đề xuất AI.');
  assert.equal(await evaluate("document.querySelector('.pc-summary-total').textContent.includes('350.000')"), true);
  await capture('ai-booking-mobile', 390, 844);
  await evaluate("document.querySelector('.pc-dialog [aria-label=\"Close modal\"]').click()");
  console.log('PASS: cancellation and AI suggestion reuse the booking wizard with explicit confirmation (controlled responses)');
  await cdp('Fetch.disable');
}

try {
  await cdp('Network.enable');
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Page.navigate', { url: base + '/' });
  await waitFor("!!document.querySelector('a[href=\"/login\"]')");
  await evaluate('localStorage.clear()');
  await reloadPage();
  await waitFor("!!document.querySelector('[aria-label=\"Mở trợ lý AI thú y\"]')");
  await evaluate("document.querySelector('[aria-label=\"Mở trợ lý AI thú y\"]').click()");
  await waitFor("!!document.querySelector('[aria-label=\"Câu hỏi cho trợ lý AI\"]')");
  await fill('[aria-label="Câu hỏi cho trợ lý AI"]', 'Tôi muốn đặt lịch khám');
  await evaluate("document.querySelector('[aria-label=\"Câu hỏi cho trợ lý AI\"]').closest('form').requestSubmit()");
  await waitFor("document.body.innerText.includes('Bạn cần đăng nhập để đặt lịch')");
  await capture('public-ai-desktop');
  await capture('public-ai-mobile', 390, 844);
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  console.log('PASS: public AI booking intent uses real backend and requires login');
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
    const email = testEmail;
    const password = randomUUID() + 'Aa1!';
    console.log('TEST ACCOUNT', email);
    await cdp('Page.navigate', { url: base + '/register' });
    await waitFor("!!document.querySelector('#register-fullname')");
    await fill('#register-fullname', process.argv.includes('--customer-flow') ? 'Minh Anh' : 'Browser service check');
    await fill('#register-email', email);
    await fill('#register-password', password);
    await fill('#register-confirmpassword', password);
    await evaluate("document.querySelector('button[type=submit]').click()");
    await waitFor("!!document.querySelector('#email-verification-code') || !!document.querySelector('[role=alert]')");
    assert.equal(await evaluate("localStorage.getItem('accessToken')"), null, 'Requesting a code must not sign the user in');
    assert.equal(await evaluate("document.querySelector('[role=alert]')?.innerText || null"), null);
    const registrationCode = await emailCode(email, 'REGISTER');
    await fill('#email-verification-code', registrationCode === '000000' ? '111111' : '000000');
    await evaluate("document.querySelector('button[type=submit]').click()");
    await waitFor("!!document.querySelector('[role=alert]')");
    assert.equal(await evaluate("localStorage.getItem('accessToken')"), null);
    await capture('email-register-error-desktop');
    await capture('email-register-error-mobile', 390, 844);
    await cdp('Emulation.setDeviceMetricsOverride', { width:1440, height:900, deviceScaleFactor:1, mobile:false });
    await fill('#email-verification-code', registrationCode);
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
    if (process.argv.includes('--reset-password')) {
      const oldAccess = await evaluate("localStorage.getItem('accessToken')");
      await evaluate('localStorage.clear()');
      await cdp('Page.navigate', { url: base + '/forgot-password' });
      await waitFor("!!document.querySelector('#forgot-email')");
      await fill('#forgot-email', email);
      await evaluate("document.querySelector('button[type=submit]').click()");
      await waitFor("!!document.querySelector('#email-verification-code') || !!document.querySelector('[role=alert]')");
      assert.equal(await evaluate("document.querySelector('[role=alert]')?.innerText || null"), null);
      const resetCode = await emailCode(email, 'RESET');
      const newPassword = randomUUID() + 'Bb2!';
      await fill('#email-verification-code', resetCode);
      await fill('#reset-password', newPassword);
      await fill('#reset-confirm-password', newPassword);
      await capture('email-reset-desktop');
      await capture('email-reset-mobile', 390, 844);
      await cdp('Emulation.setDeviceMetricsOverride', { width:1440, height:900, deviceScaleFactor:1, mobile:false });
      await evaluate("document.querySelector('button[type=submit]').click()");
      await waitFor("document.body.textContent.includes('Mật khẩu đã được cập nhật') || !!document.querySelector('[role=alert]')");
      assert.equal(await evaluate("document.querySelector('[role=alert]')?.innerText || null"), null);
      await capture('email-reset-success-desktop');
      const oldLogin = await fetch(base + '/api/v1/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) });
      assert.equal(oldLogin.status, 401, 'Old password must stop working');
      const oldSession = await fetch(base + '/api/v1/users/me', {headers:{Authorization:'Bearer '+oldAccess}});
      assert.equal(oldSession.status,401,'Old core session must stop working');
      const oldNotifications = await fetch(base + '/api/v1/notifications/unread-count', {headers:{Authorization:'Bearer '+oldAccess}});
      assert.equal(oldNotifications.status,401,'Old notification session must stop working after password reset');
      await cdp('Page.navigate', { url:base+'/login' });
      await waitFor("!!document.querySelector('#login-email')");
      await fill('#login-email',email);await fill('#login-password',newPassword);
      await evaluate("document.querySelector('button[type=submit]').click()");
      await enterDashboard();
      console.log('PASS: real SMTP email code gates registration; reset invalidates old core/notification sessions; new password login works');
    }
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
