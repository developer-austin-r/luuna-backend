import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogService } from './activity-log.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let prisma: PrismaService;

  const mockPrismaService = {
    module: {
      upsert: jest.fn().mockResolvedValue({ id: 1n, name: 'authentication' }),
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 1n, name: 'authentication' }]),
    },
    action: {
      upsert: jest.fn().mockResolvedValue({ id: 10n, name: 'login' }),
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 10n, name: 'login', moduleId: 1n }]),
    },
    activityLog: {
      create: jest.fn().mockResolvedValue({ id: 100n }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ActivityLogService>(ActivityLogService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should successfully log a visitor action with parsed UA', async () => {
      // Setup maps manually as onModuleInit might run asynchronously with mock data
      await service.onModuleInit();

      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

      await service.log({
        userId: 'test-user-id',
        sessionId: 'sess_1234',
        moduleName: 'authentication',
        actionName: 'login',
        ipAddress: '127.0.0.1',
        userAgent,
        description: 'Test login',
        metadata: { info: 'test' },
      });

      expect(mockPrismaService.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'test-user-id',
            sessionId: 'sess_1234',
            description: 'Test login',
            ipAddress: '127.0.0.1',
            browser: 'Chrome',
            os: 'Windows',
            deviceType: 'desktop',
          }),
        }),
      );
    });

    it('should sanitize sensitive keys in metadata', async () => {
      await service.log({
        moduleName: 'authentication',
        actionName: 'login',
        description: 'Sanitize test',
        metadata: {
          username: 'austin',
          password: 'supersecretpassword123',
          credit_card: '1234-5678-9012-3456',
        },
      });

      expect(mockPrismaService.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: {
              username: 'austin',
              password: '[REDACTED]',
              credit_card: '[REDACTED]',
            },
          }),
        }),
      );
    });
  });
});
