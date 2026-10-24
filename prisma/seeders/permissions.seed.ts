import type { PrismaClient } from '@prisma/client';

/**
 * All system permissions.
 * Naming convention: resource.action
 */
export const PERMISSIONS = [
  // ── Dashboard ─────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'View Dashboard',
    slug: 'dashboard.view',
    description: 'View the main dashboard',
  },

  // ── Users ──────────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: 'View Users',
    slug: 'users.view',
    description: 'View user list and details',
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    name: 'Create Users',
    slug: 'users.create',
    description: 'Create new users',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name: 'Update Users',
    slug: 'users.update',
    description: 'Update existing users',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    name: 'Delete Users',
    slug: 'users.delete',
    description: 'Delete users from the system',
  },

  // ── Products ───────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000006',
    name: 'View Products',
    slug: 'products.view',
    description: 'View product list and details',
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    name: 'Create Products',
    slug: 'products.create',
    description: 'Create new products',
  },
  {
    id: '10000000-0000-0000-0000-000000000008',
    name: 'Update Products',
    slug: 'products.update',
    description: 'Update existing products',
  },
  {
    id: '10000000-0000-0000-0000-000000000009',
    name: 'Delete Products',
    slug: 'products.delete',
    description: 'Delete products',
  },

  // ── Orders ─────────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000010',
    name: 'View Orders',
    slug: 'orders.view',
    description: 'View order list and details',
  },
  {
    id: '10000000-0000-0000-0000-000000000011',
    name: 'Update Orders',
    slug: 'orders.update',
    description: 'Update order status',
  },

  // ── Billing ────────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000012',
    name: 'View Billing',
    slug: 'billing.view',
    description: 'View billing section',
  },

  // ── Invoice ────────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000013',
    name: 'View Invoice History',
    slug: 'invoice.view',
    description: 'View invoice history',
  },
  {
    id: '10000000-0000-0000-0000-000000000014',
    name: 'Create Invoice',
    slug: 'invoice.create',
    description: 'Create new invoices',
  },
  {
    id: '10000000-0000-0000-0000-000000000015',
    name: 'Update Invoice',
    slug: 'invoice.update',
    description: 'Update existing invoices',
  },
  {
    id: '10000000-0000-0000-0000-000000000016',
    name: 'Delete Invoice',
    slug: 'invoice.delete',
    description: 'Delete invoices',
  },

  // ── Barcode ────────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000017',
    name: 'View Barcode',
    slug: 'barcode.view',
    description: 'View barcode section',
  },
  {
    id: '10000000-0000-0000-0000-000000000018',
    name: 'Generate Barcode',
    slug: 'barcode.generate',
    description: 'Generate barcodes',
  },

  // ── Reports ────────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000019',
    name: 'View Reports',
    slug: 'reports.view',
    description: 'View reports',
  },
  {
    id: '10000000-0000-0000-0000-000000000020',
    name: 'Export Reports',
    slug: 'reports.export',
    description: 'Export reports to file',
  },

  // ── Settings ───────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000021',
    name: 'View Settings',
    slug: 'settings.view',
    description: 'View settings page',
  },
  {
    id: '10000000-0000-0000-0000-000000000022',
    name: 'Update Settings',
    slug: 'settings.update',
    description: 'Update system settings',
  },

  // ── Customers ──────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000023',
    name: 'View Customers',
    slug: 'customers.view',
    description: 'View customer list and details',
  },
  {
    id: '10000000-0000-0000-0000-000000000024',
    name: 'Create Customers',
    slug: 'customers.create',
    description: 'Create new customers',
  },
  {
    id: '10000000-0000-0000-0000-000000000025',
    name: 'Update Customers',
    slug: 'customers.update',
    description: 'Update existing customers',
  },
  {
    id: '10000000-0000-0000-0000-000000000026',
    name: 'Delete Customers',
    slug: 'customers.delete',
    description: 'Delete customers',
  },

  // ── Categories ─────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000027',
    name: 'View Categories',
    slug: 'categories.view',
    description: 'View categories',
  },
  {
    id: '10000000-0000-0000-0000-000000000028',
    name: 'Create Categories',
    slug: 'categories.create',
    description: 'Create categories',
  },
  {
    id: '10000000-0000-0000-0000-000000000029',
    name: 'Update Categories',
    slug: 'categories.update',
    description: 'Update categories',
  },
  {
    id: '10000000-0000-0000-0000-000000000030',
    name: 'Delete Categories',
    slug: 'categories.delete',
    description: 'Delete categories',
  },

  // ── Inventory ──────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000031',
    name: 'View Inventory',
    slug: 'inventory.view',
    description: 'View inventory details',
  },
  {
    id: '10000000-0000-0000-0000-000000000032',
    name: 'Update Inventory',
    slug: 'inventory.update',
    description: 'Update inventory details',
  },

  // ── Coupons ────────────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000033',
    name: 'View Coupons',
    slug: 'coupons.view',
    description: 'View coupons list',
  },
  {
    id: '10000000-0000-0000-0000-000000000034',
    name: 'Create Coupons',
    slug: 'coupons.create',
    description: 'Create new coupons',
  },
  {
    id: '10000000-0000-0000-0000-000000000035',
    name: 'Update Coupons',
    slug: 'coupons.update',
    description: 'Update existing coupons',
  },
  {
    id: '10000000-0000-0000-0000-000000000036',
    name: 'Delete Coupons',
    slug: 'coupons.delete',
    description: 'Delete coupons',
  },

  // ── Activity Logs ──────────────────────────────────────────────
  {
    id: '10000000-0000-0000-0000-000000000037',
    name: 'View Activity Logs',
    slug: 'activity-logs.view',
    description: 'View system activity logs',
  },
];

export async function seedPermissions(prisma: PrismaClient): Promise<void> {
  for (const permission of PERMISSIONS) {
    const result = await prisma.permission.upsert({
      where: { id: permission.id },
      update: {
        name: permission.name,
        slug: permission.slug,
        description: permission.description,
      },
      create: permission,
    });
    console.log(`  Upserted Permission: ${result.name} (${result.slug})`);
  }
}
