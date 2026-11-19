import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock window and localStorage
global.window = {
  location: { pathname: '/' },
  history: { replaceState: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.localStorage = {
  getItem: (key) => null,
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

  const routes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/admin',
    '/staff',
    '/vet',
    '/dashboard',
  ];

  for (const route of routes) {
    global.window.location.pathname = route;
    try {
      console.log(`\n================ Testing Route: ${route} ================`);
      const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
      const html = renderToString(React.createElement(App));
      console.log(`  -> SUCCESS rendering route ${route}! HTML length: ${html.length}`);
    } catch (err) {
      console.error(`  -> ERROR rendering route ${route}:`, err.message);
      console.error(err.stack);
    }
  }

  // Also test with a mock logged in user for dashboard
  console.log(`\n================ Testing /dashboard with Logged-in Customer ================`);
  global.localStorage.getItem = (key) => {
    if (key === 'accessToken') return 'mock-jwt-token';
    if (key === 'user') return JSON.stringify({ id: '123', fullName: 'Test Customer', email: 'cust@test.com', role: 'CUSTOMER' });
    return null;
  };
  global.window.location.pathname = '/dashboard';
  try {
    const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
    const html = renderToString(React.createElement(App));
    console.log(`  -> SUCCESS rendering logged-in /dashboard! HTML length: ${html.length}`);
  } catch (err) {
    console.error(`  -> ERROR rendering logged-in /dashboard:`, err.message);
    console.error(err.stack);
  }

  // Also test each role on dashboard
  const roles = ['CUSTOMER', 'STAFF', 'VETERINARIAN', 'OWNER', 'ADMIN'];
  for (const role of roles) {
    console.log(`\n================ Testing /dashboard with role ${role} ================`);
    global.localStorage.getItem = (key) => {
      if (key === 'accessToken') return 'mock-jwt-token';
      if (key === 'user') return JSON.stringify({ id: '123', fullName: 'Test User', email: 'user@test.com', role: role });
      return null;
    };
    try {
      const { default: StaffPortal } = await vite.ssrLoadModule('/src/StaffPortal.jsx');
      const html = renderToString(React.createElement(StaffPortal));
      console.log(`  -> SUCCESS rendering StaffPortal for ${role}! HTML length: ${html.length}`);
    } catch (err) {
      console.error(`  -> ERROR rendering StaffPortal for ${role}:`, err.message);
      console.error(err.stack);
    }
  }

  // Also test AdminConsole
  console.log(`\n================ Testing AdminConsole ================`);
  try {
    const { default: AdminConsole } = await vite.ssrLoadModule('/src/AdminConsole.jsx');
    const html = renderToString(React.createElement(AdminConsole));
    console.log(`  -> SUCCESS rendering AdminConsole! HTML length: ${html.length}`);
  } catch (err) {
    console.error(`  -> ERROR rendering AdminConsole:`, err.message);
    console.error(err.stack);
  }

  await vite.close();
}

test();
