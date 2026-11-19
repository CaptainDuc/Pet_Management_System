import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

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
    console.log(`\n================ Testing StaffPortal with initialScreen="dashboard" ================`);
    const { default: StaffPortal } = await vite.ssrLoadModule('/src/StaffPortal.jsx');
    const html = renderToString(React.createElement(StaffPortal, { initialScreen: 'dashboard' }));
    console.log(`  -> SUCCESS! HTML length: ${html.length}`);
  } catch (err) {
    console.error(`  -> ERROR:`, err.message);
    console.error(err.stack);
  }

  await vite.close();
}

test();
