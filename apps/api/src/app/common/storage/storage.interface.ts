export interface UploadableFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface StoredFileResult {
  fileUrl: string;
  fileKey: string;
  mimeType: string;
  fileSize: number;
}

export interface FileDownloadResult {
  stream: NodeJS.ReadableStream;
  mimeType: string;
  fileSize: number;
  filename: string;
}

export interface StorageUploadOptions {
  tenantId: string;
  caregiverId: string;
  documentType: string;
}

export interface IStorageService {
  uploadFile(
    file: UploadableFile,
    options: StorageUploadOptions
  ): Promise<StoredFileResult>;

  deleteFile(fileKey: string): Promise<void>;

  getFileStream(fileKey: string): Promise<FileDownloadResult>;

  resolveFileUrl(fileKey: string, caregiverId: string, documentId?: string): string;
}
