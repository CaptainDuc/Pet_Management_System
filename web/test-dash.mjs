import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import assert from 'node:assert/strict';

global.window = {
  location: { pathname: '/dashboard' },
  history: { replaceState: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.localStorage = {
  getItem: (key) => {
    if (key === 'accessToken') return 'mock-jwt-token';
    if (key === 'user') return JSON.stringify({ id: '123', fullName: 'Test User', email: 'user@test.com', role: 'CUSTOMER' });
    return null;
  },
  setItem: () => {},
  removeItem: () => {},
};
global.document = {
  body: { style: {}, setAttribute: () => {}, removeAttribute: () => {} },
  createElement: () => ({ setAttribute: () => {} }),
  head: { appendChild: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
};

async function test() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { default: Sidebar } = await vite.ssrLoadModule('/src/design-system/components/Sidebar/Sidebar.jsx');
    for (const collapsed of [false, true]) {
      for (const children of [undefined, React.createElement('span', null, 'Nested item')]) {
        const html = renderToString(React.createElement(Sidebar, { collapsible: true, collapsed },
          React.createElement(Sidebar.NavItem, { label: 'Test navigation' }, children)));
        assert.ok(html.includes('Test navigation'));
        assert.equal(html.includes('sidebar__nav-chevron'), Boolean(children));
        assert.equal(html.includes('sidebar--collapsed'), collapsed);
      }
    }
    console.log('PASS: sidebar renders expanded/collapsed with and without children');
    console.log(`\n================ Testing StaffPortal with initialScreen="dashboard" ================`);
    const { default: StaffPortal } = await vite.ssrLoadModule('/src/StaffPortal.jsx');
    const html = renderToString(React.createElement(StaffPortal, { initialScreen: 'dashboard' }));
    assert.ok(html.includes('Đang khôi phục phiên đăng nhập'));
    const { default: CustomerPortal } = await vite.ssrLoadModule('/src/components/CustomerPortal.jsx');
    const { default: CustomerDashboard } = await vite.ssrLoadModule('/src/pages/dashboard/CustomerDashboard.jsx');
    const user = { fullName: 'Test User', role: 'CUSTOMER' };
    const dashboard = renderToString(React.createElement(CustomerPortal, { user, activeTab: 'overview', setActiveTab: () => {} },
      React.createElement(CustomerDashboard, { user, activeTab: 'overview', setActiveTab: () => {} })));
    assert.ok(dashboard.includes('pc-nav'));
    assert.ok(dashboard.includes('<main'));
    assert.ok(dashboard.includes('Chào User'));
    console.log(`  -> SUCCESS! HTML length: ${html.length}`);
  } catch (err) {
    console.error(`  -> ERROR:`, err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await vite.close();
  }
}

test();
