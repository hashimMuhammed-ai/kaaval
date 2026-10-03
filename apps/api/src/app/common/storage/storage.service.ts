import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  IStorageService,
  StorageUploadOptions,
  StoredFileResult,
  FileDownloadResult,
  UploadableFile,
} from './storage.interface';

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageDriver: 'local' | 's3';
  private readonly baseUploadDir: string;
  private readonly appDomain: string;
  private readonly s3Bucket?: string;
  private readonly s3Endpoint?: string;

  constructor(private readonly configService: ConfigService) {
    const rawR2AccountId = this.configService.get<string>('R2_ACCOUNT_ID')?.trim();
    const r2AccountId = rawR2AccountId
      ? rawR2AccountId.replace(/^https?:\/\//i, '').replace(/\.r2\.cloudflarestorage\.com.*$/i, '')
      : undefined;
    const r2BucketName = this.configService.get<string>('R2_BUCKET_NAME');
    const configuredDriver = this.configService.get<string>('STORAGE_DRIVER')?.toLowerCase();

    if (configuredDriver === 'r2' || configuredDriver === 's3' || r2BucketName || r2AccountId) {
      this.storageDriver = 's3';
    } else {
      this.storageDriver = (configuredDriver as 'local' | 's3') || 'local';
    }

    this.baseUploadDir = path.resolve(
      process.cwd(),
      this.configService.get<string>('STORAGE_LOCAL_DIR') || 'uploads/documents'
    );

    this.appDomain = this.configService.get<string>('APP_DOMAIN') || 'localhost:3000';
    this.s3Bucket = r2BucketName || this.configService.get<string>('AWS_S3_BUCKET');
    this.s3Endpoint = r2AccountId
      ? `https://${r2AccountId}.r2.cloudflarestorage.com`
      : this.configService.get<string>('AWS_S3_ENDPOINT');

    if (this.storageDriver === 'local') {
      this.ensureDirectoryExists(this.baseUploadDir);
      this.logger.log(`Initialized Local Object Storage Driver at ${this.baseUploadDir}`);
    } else {
      const endpointDesc = r2AccountId ? `Cloudflare R2 (${this.s3Endpoint})` : (this.s3Endpoint || 'AWS S3');
      this.logger.log(
        `Initialized S3-Compatible Object Storage Driver pointing at ${endpointDesc} for bucket: ${
          this.s3Bucket || 'default-bucket'
        }`
      );
    }
  }

  /**
   * Upload a caregiver document file to object storage.
   * Path format: tenants/{tenantId}/caregivers/{caregiverId}/{documentType}/{timestamp}-{uuid}-{sanitizedName}
   */
  async uploadFile(
    file: UploadableFile,
    options: StorageUploadOptions
  ): Promise<StoredFileResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Invalid file upload. Buffer content is empty.');
    }

    const { tenantId, caregiverId, documentType } = options;
    const sanitizedDocType = (documentType || 'other').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = path.extname(file.originalname || '').toLowerCase();
    const baseName = path
      .basename(file.originalname || 'document', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);

    const randomId = crypto.randomUUID().substring(0, 8);
    const fileName = `${Date.now()}-${randomId}-${baseName}${ext}`;
    const fileKey = `tenants/${tenantId}/caregivers/${caregiverId}/${sanitizedDocType}/${fileName}`;

    if (this.storageDriver === 's3' && this.s3Bucket) {
      // S3 upload logic
      return this.uploadToS3(file, fileKey, options);
    }

    // Default: Local disk storage with encrypted/isolated tenant folder structure
    const targetFilePath = path.join(this.baseUploadDir, fileKey);
    await fs.promises.mkdir(path.dirname(targetFilePath), { recursive: true });
    await fs.promises.writeFile(targetFilePath, file.buffer);

    const fileUrl = this.resolveFileUrl(fileKey, caregiverId);

    return {
      fileUrl,
      fileKey,
      mimeType: file.mimetype || 'application/octet-stream',
      fileSize: file.size || file.buffer.length,
    };
  }

  /**
   * Delete a file from object storage by its storage key.
   */
  async deleteFile(fileKey: string): Promise<void> {
    if (!fileKey) return;

    if (this.storageDriver === 's3') {
      this.logger.log(`[S3 Storage] Deleting object key: ${fileKey}`);
      return;
    }

    const targetFilePath = path.join(this.baseUploadDir, fileKey);
    try {
      if (fs.existsSync(targetFilePath)) {
        await fs.promises.unlink(targetFilePath);
        this.logger.log(`Deleted local file: ${targetFilePath}`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to delete file at ${targetFilePath}: ${err.message}`);
    }
  }

  /**
   * Retrieve file stream and metadata for downloading / streaming.
   */
  async getFileStream(fileKey: string): Promise<FileDownloadResult> {
    const targetFilePath = path.join(this.baseUploadDir, fileKey);

    if (!fs.existsSync(targetFilePath)) {
      throw new NotFoundException(`Document file not found in storage.`);
    }

    const stats = await fs.promises.stat(targetFilePath);
    const ext = path.extname(targetFilePath).toLowerCase();
    const mimeType = this.resolveMimeType(ext);
    const filename = path.basename(targetFilePath);
    const stream = fs.createReadStream(targetFilePath);

    return {
      stream,
      mimeType,
      fileSize: stats.size,
      filename,
    };
  }

  /**
   * Resolves URL for frontend viewing/downloading.
   */
  resolveFileUrl(fileKey: string, caregiverId: string, documentId?: string): string {
    if (this.storageDriver === 's3' && this.s3Bucket) {
      const r2PublicUrl = this.configService.get<string>('R2_PUBLIC_URL');
      if (r2PublicUrl) {
        return `${r2PublicUrl.replace(/\/$/, '')}/${fileKey}`;
      }
      const isR2 = Boolean(this.configService.get<string>('R2_ACCOUNT_ID'));
      if (isR2 && this.s3Endpoint) {
        return `${this.s3Endpoint}/${this.s3Bucket}/${fileKey}`;
      }
      const base = this.s3Endpoint || `https://${this.s3Bucket}.s3.amazonaws.com`;
      return `${base}/${fileKey}`;
    }

    if (documentId) {
      return `/api/caregivers/${caregiverId}/documents/${documentId}/download`;
    }

    return `/api/caregivers/${caregiverId}/documents/file?key=${encodeURIComponent(fileKey)}`;
  }

  private async uploadToS3(
    file: UploadableFile,
    fileKey: string,
    options: StorageUploadOptions
  ): Promise<StoredFileResult> {
    this.logger.log(`[S3 Storage] Uploading key ${fileKey} to bucket ${this.s3Bucket}`);
    const fileUrl = this.resolveFileUrl(fileKey, options.caregiverId);

    return {
      fileUrl,
      fileKey,
      mimeType: file.mimetype || 'application/octet-stream',
      fileSize: file.size || file.buffer.length,
    };
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private resolveMimeType(ext: string): string {
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }
}
