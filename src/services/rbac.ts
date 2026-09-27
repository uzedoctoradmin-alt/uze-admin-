import type { UserRole, Permission } from '../types';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMINISTRADOR: [
    'dashboard.read',
    'dashboard.financial.read',
    'sales.read',
    'sales.create',
    'sales.edit',
    'sales.cancel',
    'customers.read',
    'customers.create',
    'customers.edit',
    'customers.delete',
    'products.read',
    'products.create',
    'products.edit',
    'products.delete',
    'products.cost.read',
    'inventory.read',
    'inventory.adjust',
    'movements.read',
    'finance.read',
    'finance.manage',
    'reports.read',
    'reports.financial.read',
    'admin.users.manage',
    'admin.logs.read',
    'settings.manage',
  ],
  VENDEDOR: [
    'dashboard.read',
    'sales.read',
    'sales.create',
    'sales.edit',
    'customers.read',
    'customers.create',
    'customers.edit',
    'products.read',
    'inventory.read',
    'movements.read',
    'reports.read',
  ],
  VISUALIZACAO: [
    'dashboard.read',
    'dashboard.financial.read',
    'sales.read',
    'customers.read',
    'products.read',
    'products.cost.read',
    'inventory.read',
    'movements.read',
    'finance.read',
    'reports.read',
    'reports.financial.read',
  ],
};

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function checkRoleHasPermission(role: UserRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}
