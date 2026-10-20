import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SendWhatsAppDto, WhatsAppChannel } from './dto';
import { WhatsAppService } from './whatsapp.service';

describe('WhatsAppService', () => {
  const createLog = jest.fn();
  const updateLog = jest.fn();
  const configValues: Record<string, string> = {
    WHATSAPP_ACCESS_TOKEN: 'test-access-token',
    WHATSAPP_PHONE_NUMBER_ID: '123456789',
    WHATSAPP_API_VERSION: 'v25.0',
    WHATSAPP_TEMPLATE_NAME: 'approved_template',
    WHATSAPP_TEMPLATE_LANGUAGE: 'en_US',
  };
  const prisma = {
    whatsAppMessageLog: {
      create: createLog,
      update: updateLog,
    },
  } as unknown as PrismaService;
  const config = {
    get: jest.fn(
      (key: string, fallback?: string) => configValues[key] ?? fallback,
    ),
  } as unknown as ConfigService;
  const service = new WhatsAppService(prisma, config);
  const dto: SendWhatsAppDto = {
    phone: '919629765171',
    templateParameters: ['John Doe', 'BILL-123', 'Oct 20, 2026'],
    channel: WhatsAppChannel.BILLING,
  };

  beforeEach(() => {
    createLog.mockResolvedValue({ id: 'log-1' });
    updateLog.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the configured template and marks the log as sent', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.123' }] }), {
        status: 200,
      }),
    );

    const result = await service.send(dto);

    expect(result).toEqual({
      success: true,
      phone: '919629765171',
      logId: 'log-1',
      messageId: 'wamid.123',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/123456789/messages',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-access-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '919629765171',
          type: 'template',
          template: {
            name: 'approved_template',
            language: { code: 'en_US' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: 'John Doe' },
                  { type: 'text', text: 'BILL-123' },
                  { type: 'text', text: 'Oct 20, 2026' },
                ],
              },
            ],
          },
        }),
      }),
    );
    expect(updateLog).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: { status: 'SENT', errorMessage: null },
    });
  });

  it('marks the log as failed when Meta rejects the request', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: 'Template is not available' } }),
          { status: 400 },
        ),
      );

    const result = await service.send(dto);

    expect(result).toMatchObject({
      success: false,
      logId: 'log-1',
      error: 'Template is not available',
    });
    expect(updateLog).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: {
        status: 'FAILED',
        errorMessage: 'Template is not available',
      },
    });
  });
});
