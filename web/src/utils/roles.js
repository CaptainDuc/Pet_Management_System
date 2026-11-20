const ROLE_PRIORITY = ['ADMIN', 'OWNER', 'VETERINARIAN', 'STAFF', 'CUSTOMER'];

export function getAssignedRoles(user) {
  const values = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])];
  const names = values.map(value => (typeof value === 'string' ? value : value?.name || '').replace(/^ROLE_/i, '').toUpperCase());
  const roles = ROLE_PRIORITY.filter(role => names.includes(role));
  return roles.length ? roles : ['CUSTOMER'];
}

export const getLoginPath = user => getAssignedRoles(user)[0] === 'CUSTOMER' ? '/' : '/dashboard';
