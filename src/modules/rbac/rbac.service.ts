import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface MenuNode {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  permission: string | null;
  sortOrder: number;
  children: MenuNode[];
}

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the flat list of permission slugs for the given role.
   */
  async getPermissionsForRole(roleId: string): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      select: {
        permission: {
          select: { slug: true },
        },
      },
    });

    return rolePermissions.map((rp) => rp.permission.slug);
  }

  /**
   * Returns the nested menu tree filtered by the given permission slugs.
   *
   * Only menus whose linked permission is in the allowed set are included.
   * Menus with no permissionId are always included (public menus).
   * Children are nested under their parent.
   */
  async getMenusForPermissions(allowedSlugs: string[]): Promise<MenuNode[]> {
    const allowedSet = new Set(allowedSlugs);

    const allMenus = await this.prisma.menu.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        parentId: true,
        sortOrder: true,
        permission: { select: { slug: true } },
      },
    });

    // Filter menus the user has access to
    const visible = allMenus.filter(
      (m) => !m.permission || allowedSet.has(m.permission.slug),
    );

    // Build id → node map
    const nodeMap = new Map<string, MenuNode & { parentId: string | null }>();
    for (const m of visible) {
      nodeMap.set(m.id, {
        id: m.id,
        name: m.name,
        slug: m.slug,
        icon: m.icon,
        permission: m.permission?.slug ?? null,
        sortOrder: m.sortOrder,
        parentId: m.parentId,
        children: [],
      });
    }

    // Nest children under parents
    const roots: MenuNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Sort children by sortOrder
    const sortChildren = (nodes: MenuNode[]): MenuNode[] =>
      nodes
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((n) => ({ ...n, children: sortChildren(n.children) }));

    return sortChildren(roots);
  }
}
