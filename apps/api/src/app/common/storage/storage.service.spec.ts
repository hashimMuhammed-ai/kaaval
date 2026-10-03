import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import * as fs from 'fs';
import * as path from 'path';

describe('StorageService', () => {
  let service: StorageService;
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'STORAGE_DRIVER') return 'local';
      if (key === 'STORAGE_LOCAL_DIR') return 'uploads/test-documents';
      if (key === 'APP_DOMAIN') return 'test.local';
      return null;
    }),
  };

  const testFile: any = {
    originalname: 'test_nursing_cert.pdf',
    mimetype: 'application/pdf',
    size: 2048,
    buffer: Buffer.alloc(2048, 1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterAll(async () => {
    // Clean up test directory if created
    const testDir = path.resolve(process.cwd(), 'uploads/test-documents');
    try {
      if (fs.existsSync(testDir)) {
        await fs.promises.rm(testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should store file on disk in isolated tenant/caregiver directory and return key and URL', async () => {
    const result = await service.uploadFile(testFile, {
      tenantId: 'tenant-abc',
      caregiverId: 'caregiver-xyz',
      documentType: 'nursing_certificate',
    });

    expect(result.fileKey).toContain('tenants/tenant-abc/caregivers/caregiver-xyz/nursing_certificate/');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileSize).toBe(2048);
    expect(result.fileUrl).toBeDefined();

    // Verify file actually exists on disk
    const fullPath = path.resolve(process.cwd(), 'uploads/test-documents', result.fileKey);
    expect(fs.existsSync(fullPath)).toBe(true);

    // Verify stream retrieval
    const download = await service.getFileStream(result.fileKey);
    expect(download.stream).toBeDefined();
    expect(download.mimeType).toBe('application/pdf');
    expect(download.fileSize).toBe(2048);

    // Drain stream to let file descriptor close cleanly
    await new Promise<void>((resolve, reject) => {
      download.stream.on('data', () => {});
      download.stream.on('end', () => resolve());
      download.stream.on('error', reject);
    });

    // Delete file
    await service.deleteFile(result.fileKey);
    expect(fs.existsSync(fullPath)).toBe(false);
  });

  it('should resolve download URL with documentId when provided', () => {
    const url = service.resolveFileUrl('some-key', 'caregiver-1', 'doc-1');
    expect(url).toBe('/api/caregivers/caregiver-1/documents/doc-1/download');
  });

  it('should resolve S3 URL when S3 driver is configured', () => {
    const s3Config: any = {
      get: jest.fn((key: string) => {
        if (key === 'STORAGE_DRIVER') return 's3';
        if (key === 'AWS_S3_BUCKET') return 'my-healthcare-bucket';
        if (key === 'AWS_S3_ENDPOINT') return 'https://s3.ap-south-1.amazonaws.com';
        return null;
      }),
    };

    const s3Service = new StorageService(s3Config);
    const url = s3Service.resolveFileUrl('tenants/1/caregivers/2/cert.pdf', '2', 'doc-2');
    expect(url).toContain('https://s3.ap-south-1.amazonaws.com/tenants/1/caregivers/2/cert.pdf');
  });

  it('should configure Cloudflare R2 storage when R2 credentials are provided', () => {
    const r2Config: any = {
      get: jest.fn((key: string) => {
        if (key === 'R2_ACCOUNT_ID') return 'mock-cf-account-id';
        if (key === 'R2_BUCKET_NAME') return 'caregiver-r2-docs';
        return null;
      }),
    };

    const r2Service = new StorageService(r2Config);
    const url = r2Service.resolveFileUrl('tenants/1/caregivers/2/cert.pdf', '2');
    expect(url).toBe('https://mock-cf-account-id.r2.cloudflarestorage.com/caregiver-r2-docs/tenants/1/caregivers/2/cert.pdf');
  });
});
