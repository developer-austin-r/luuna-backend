import type { PrismaClient } from '@prisma/client';

// Permission IDs (from permissions.seed.ts)
const PERM = {
  DASHBOARD_VIEW: '10000000-0000-0000-0000-000000000001',
  USERS_VIEW: '10000000-0000-0000-0000-000000000002',
  PRODUCTS_VIEW: '10000000-0000-0000-0000-000000000006',
  ORDERS_VIEW: '10000000-0000-0000-0000-000000000010',
  BILLING_VIEW: '10000000-0000-0000-0000-000000000012',
  BARCODE_VIEW: '10000000-0000-0000-0000-000000000017',
  REPORTS_VIEW: '10000000-0000-0000-0000-000000000019',
  SETTINGS_VIEW: '10000000-0000-0000-0000-000000000021',
  CUSTOMERS_VIEW: '10000000-0000-0000-0000-000000000023',
  CATEGORIES_VIEW: '10000000-0000-0000-0000-000000000027',
  INVENTORY_VIEW: '10000000-0000-0000-0000-000000000031',
  COUPONS_VIEW: '10000000-0000-0000-0000-000000000033',
  ACTIVITY_LOGS_VIEW: '10000000-0000-0000-0000-000000000037',
};

// Menu UUIDs
const MENU_IDS = {
  DASHBOARD: '20000000-0000-0000-0000-000000000001',
  USERS: '20000000-0000-0000-0000-000000000002',
  PRODUCTS: '20000000-0000-0000-0000-000000000003',
  ORDERS: '20000000-0000-0000-0000-000000000004',
  BILLING: '20000000-0000-0000-0000-000000000005',
  REPORTS: '20000000-0000-0000-0000-000000000008',
  SETTINGS: '20000000-0000-0000-0000-000000000009',
  CUSTOMERS: '20000000-0000-0000-0000-000000000010',
  CATEGORIES: '20000000-0000-0000-0000-000000000011',
  INVENTORY: '20000000-0000-0000-0000-000000000012',
  COUPONS: '20000000-0000-0000-0000-000000000013',
  ACTIVITY_LOGS: '20000000-0000-0000-0000-000000000014',
};

/**
 * Menu structure:
 *
 * 1  Dashboard         (admin + billing)   → dashboard.view
 * 2  Users             (admin only)        → users.view
 * 3  Products          (admin only)        → products.view
 * 4  Orders            (admin only)        → orders.view
 * 5  Billing           (admin + billing)   → billing.view
 * 7  Barcode           (admin + billing)   → barcode.view
 * 8  Reports           (admin only)        → reports.view
 * 9  Settings          (admin + billing)   → settings.view
 */
const TOP_LEVEL_MENUS = [
  {
    id: MENU_IDS.DASHBOARD,
    name: 'Dashboard',
    slug: 'dashboard',
    icon: 'LayoutDashboard',
    permissionId: PERM.DASHBOARD_VIEW,
    parentId: null,
    sortOrder: 1,
  },
  {
    id: MENU_IDS.CUSTOMERS,
    name: 'Customers',
    slug: 'customers',
    icon: 'Users',
    permissionId: PERM.CUSTOMERS_VIEW,
    parentId: null,
    sortOrder: 2,
  },
  {
    id: MENU_IDS.PRODUCTS,
    name: 'Products',
    slug: 'products',
    icon: 'Package',
    permissionId: PERM.PRODUCTS_VIEW,
    parentId: null,
    sortOrder: 3,
  },
  {
    id: MENU_IDS.CATEGORIES,
    name: 'Categories',
    slug: 'categories',
    icon: 'FolderTree',
    permissionId: PERM.CATEGORIES_VIEW,
    parentId: null,
    sortOrder: 4,
  },
  {
    id: MENU_IDS.INVENTORY,
    name: 'Inventory',
    slug: 'inventory',
    icon: 'Layers',
    permissionId: PERM.INVENTORY_VIEW,
    parentId: null,
    sortOrder: 5,
  },
  {
    id: MENU_IDS.COUPONS,
    name: 'Coupons',
    slug: 'coupons',
    icon: 'Ticket',
    permissionId: PERM.COUPONS_VIEW,
    parentId: null,
    sortOrder: 6,
  },
  {
    id: MENU_IDS.ORDERS,
    name: 'Orders',
    slug: 'orders',
    icon: 'ShoppingCart',
    permissionId: PERM.ORDERS_VIEW,
    parentId: null,
    sortOrder: 7,
  },
  {
    id: MENU_IDS.BILLING,
    name: 'Billing',
    slug: 'billing',
    icon: 'CreditCard',
    permissionId: PERM.BILLING_VIEW,
    parentId: null,
    sortOrder: 8,
  },
  {
    id: MENU_IDS.REPORTS,
    name: 'Reports',
    slug: 'reports',
    icon: 'BarChart2',
    permissionId: PERM.REPORTS_VIEW,
    parentId: null,
    sortOrder: 10,
  },
  {
    id: MENU_IDS.ACTIVITY_LOGS,
    name: 'Activity Logs',
    slug: 'activity-logs',
    icon: 'History',
    permissionId: PERM.ACTIVITY_LOGS_VIEW,
    parentId: null,
    sortOrder: 11,
  },
  {
    id: MENU_IDS.SETTINGS,
    name: 'Settings',
    slug: 'settings',
    icon: 'Settings',
    permissionId: PERM.SETTINGS_VIEW,
    parentId: null,
    sortOrder: 12,
  },
  {
    id: MENU_IDS.USERS,
    name: 'Users',
    slug: 'users',
    icon: 'Users',
    permissionId: PERM.USERS_VIEW,
    parentId: null,
    sortOrder: 13,
  },
];

const CHILD_MENUS = [];

export async function seedMenus(prisma: PrismaClient): Promise<void> {
  // Insert top-level menus first (no parent dependency)
  for (const menu of TOP_LEVEL_MENUS) {
    const result = await prisma.menu.upsert({
      where: { id: menu.id },
      update: {
        name: menu.name,
        slug: menu.slug,
        icon: menu.icon,
        permissionId: menu.permissionId,
        parentId: menu.parentId,
        sortOrder: menu.sortOrder,
      },
      create: menu,
    });
    console.log(`  Upserted Menu: ${result.name} (sortOrder: ${result.sortOrder})`);
  }

  // Insert child menus after parents exist
  for (const menu of CHILD_MENUS) {
    const result = await prisma.menu.upsert({
      where: { id: menu.id },
      update: {
        name: menu.name,
        slug: menu.slug,
        icon: menu.icon,
        permissionId: menu.permissionId,
        parentId: menu.parentId,
        sortOrder: menu.sortOrder,
      },
      create: menu,
    });
    console.log(
      `    └── Upserted Child Menu: ${result.name} (sortOrder: ${result.sortOrder})`,
    );
  }
}
