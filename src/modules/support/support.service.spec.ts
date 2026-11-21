import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { EmailService } from '../email/email.service';

describe('SupportService', () => {
  let service: SupportService;
  let emailServiceMock: { sendEmail: jest.Mock };

  beforeEach(async () => {
    emailServiceMock = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        {
          provide: EmailService,
          useValue: emailServiceMock,
        },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should submit an inquiry successfully and route notification email', async () => {
    const dto = {
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      category: 'Shipping & Delivery',
      subject: 'Delivery timeframe inquiry',
      message: 'When can I expect delivery in Bengaluru?',
    };

    const result = await service.submitInquiry(dto);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.inquiryId).toMatch(/^INQ-\d+-\d+$/);
    expect(emailServiceMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailServiceMock.sendEmail).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Shipping & Delivery'),
      expect.stringContaining('Rohan Sharma'),
    );
  });
});
