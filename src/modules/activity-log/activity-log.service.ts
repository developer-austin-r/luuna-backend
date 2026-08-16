import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UAParser } from 'ua-parser-js';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActivityLogService implements OnModuleInit {
  private modulesCache: Map<string, bigint> = new Map();
  private actionsCache: Map<string, bigint> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.populateCache();
  }

  /**
   * Loads all active modules and actions from the DB and caches their BigInt IDs.
   */
  private async populateCache() {
    try {
      const [modules, actions] = await Promise.all([
        this.prisma.module.findMany({ where: { isActive: true } }),
        this.prisma.action.findMany({ where: { isActive: true } }),
      ]);

      this.modulesCache.clear();
      for (const mod of modules) {
        this.modulesCache.set(mod.name, mod.id);
      }

      this.actionsCache.clear();
      for (const act of actions) {
        const key = `${act.moduleId}:${act.name}`;
        this.actionsCache.set(key, act.id);
      }

      console.log(
        `[ActivityLog] Cached ${modules.length} modules and ${actions.length} actions.`,
      );
    } catch (error) {
      console.error(
        '[ActivityLog] Failed to populate modules/actions cache:',
        error,
      );
    }
  }

  /**
   * Resolves module ID by name, dynamically upserting if not present.
   */
  private async getModuleId(name: string): Promise<bigint> {
    const id = this.modulesCache.get(name);
    if (id !== undefined) {
      return id;
    }
    const record = await this.prisma.module.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `Auto-created module: ${name}`,
        isActive: true,
      },
    });
    this.modulesCache.set(name, record.id);
    return record.id;
  }

  private async getActionId(moduleId: bigint, name: string): Promise<bigint> {
    const key = `${moduleId}:${name}`;
    const id = this.actionsCache.get(key);
    if (id !== undefined) {
      return id;
    }
    const record = await this.prisma.action.upsert({
      where: {
        moduleId_name: {
          moduleId,
          name,
        },
      },
      update: {},
      create: {
        moduleId,
        name,
        description: `Auto-created action: ${name}`,
        isActive: true,
      },
    });
    this.actionsCache.set(key, record.id);
    return record.id;
  }

  /**
   * Unified interface to log a customer or visitor action.
   */
  async log(params: {
    userId?: string | null;
    sessionId?: string | null;
    moduleName: string;
    actionName: string;
    entityId?: string | null;
    description?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    try {
      const {
        userId,
        sessionId,
        moduleName,
        actionName,
        entityId,
        description,
        ipAddress,
        userAgent,
        metadata,
      } = params;

      // 1. Resolve Module and Action IDs
      const moduleId = await this.getModuleId(moduleName);
      const actionId = await this.getActionId(moduleId, actionName);

      // 2. Parse User-Agent
      let browser: string | null = null;
      let os: string | null = null;
      let deviceType: string | null = null;

      if (userAgent) {
        const parser = new UAParser(userAgent);
        const browserInfo = parser.getBrowser();
        const osInfo = parser.getOS();
        const deviceInfo = parser.getDevice();

        browser = browserInfo.name || null;
        os = osInfo.name || null;
        deviceType = deviceInfo.type || 'desktop'; // Default to desktop if undefined
      }

      // 3. Prevent logging sensitive credentials or tokens
      let sanitizedMetadata: any = metadata;
      if (metadata && typeof metadata === 'object') {
        const sensitiveKeywords = [
          'password',
          'token',
          'card',
          'cvv',
          'secret',
          'key',
          'credential',
        ];
        sanitizedMetadata = {};
        for (const [key, val] of Object.entries(metadata)) {
          const lowerKey = key.toLowerCase();
          const isSensitive = sensitiveKeywords.some((kw) =>
            lowerKey.includes(kw),
          );
          if (isSensitive) {
            sanitizedMetadata[key] = '[REDACTED]';
          } else {
            sanitizedMetadata[key] = val;
          }
        }
      }

      // 4. Save to database
      await this.prisma.activityLog.create({
        data: {
          userId: userId || null,
          sessionId: sessionId || null,
          moduleId,
          actionId,
          entityId: entityId || null,
          description,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          deviceType,
          browser,
          os,
          metadata:
            sanitizedMetadata !== undefined
              ? (sanitizedMetadata as Prisma.InputJsonValue)
              : Prisma.DbNull,
        },
      });
    } catch (error) {
      // Fail silently in production, or log to prevent breaking primary flows
      console.error('[ActivityLog] Error creating activity log record:', error);
    }
  }

  /**
   * Helper to serialize BigInts to standard JSON-compatible numbers.
   */
  serializeBigInt<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_, value: unknown) => {
        if (typeof value === 'bigint') {
          return Number.isSafeInteger(Number(value))
            ? Number(value)
            : value.toString();
        }
        return value;
      }),
    ) as T;
  }

  /**
   * Get paginated logs for the administrator panel.
   */
  async getLogs(query: {
    page?: number;
    limit?: number;
    search?: string;
    moduleId?: string;
    actionId?: string;
    deviceType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityLogWhereInput = {};

    if (query.moduleId && query.moduleId !== 'all') {
      where.moduleId = BigInt(query.moduleId);
    }
    if (query.actionId && query.actionId !== 'all') {
      where.actionId = BigInt(query.actionId);
    }
    if (query.deviceType && query.deviceType !== 'all') {
      where.deviceType = query.deviceType;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { sessionId: { contains: query.search, mode: 'insensitive' } },
        { ipAddress: { contains: query.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          module: {
            select: {
              id: true,
              name: true,
            },
          },
          action: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return this.serializeBigInt({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  }

  /**
   * Get dynamic modules and actions filters lists.
   */
  async getFilters() {
    const [modules, actions] = await Promise.all([
      this.prisma.module.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.action.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return this.serializeBigInt({
      modules,
      actions,
    });
  }
}
