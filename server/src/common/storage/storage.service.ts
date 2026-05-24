import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || '';
    const region = this.configService.get<string>('R2_REGION', 'auto');

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
      this.logger.log('S3/R2 Client initialized successfully');
    } else {
      this.logger.warn('Missing R2 configuration in environment variables');
    }
  }

  async uploadFile(buffer: Buffer, key: string, mimetype: string): Promise<string> {
    if (!this.s3Client) {
      throw new Error('Storage service is not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ContentLength: buffer.length,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`Successfully uploaded file to R2: ${key}`);
      return key; // return the key, not the URL
    } catch (error) {
      this.logger.error(`Failed to upload file to R2: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPresignedUrl(key: string, expiresIn: number = 900): Promise<string> {
    if (!this.s3Client) {
      return '';
    }

    if (!key) {
      return '';
    }

    // if it happens to be an old local URL like /uploads/..., just return it for backwards compatibility if needed, or maybe handle it at service level.
    if (key.startsWith('/')) {
      return key;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for ${key}: ${error.message}`, error.stack);
      return '';
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.s3Client || !key) return;
    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));
      this.logger.log(`Successfully deleted file from R2: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}: ${error.message}`);
    }
  }

  async deleteDirectory(prefix: string): Promise<void> {
    if (!this.s3Client || !prefix) return;
    try {
      let isTruncated = true;
      let continuationToken: string | undefined = undefined;

      while (isTruncated) {
        const listRes = await this.s3Client.send(new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }));

        if (listRes.Contents && listRes.Contents.length > 0) {
          const deleteParams = {
            Bucket: this.bucketName,
            Delete: {
              Objects: listRes.Contents.map((c) => ({ Key: c.Key })),
            },
          };
          await this.s3Client.send(new DeleteObjectsCommand(deleteParams));
          this.logger.log(`Deleted ${listRes.Contents.length} files from R2 directory: ${prefix}`);
        }

        isTruncated = listRes.IsTruncated ?? false;
        continuationToken = listRes.NextContinuationToken;
      }
    } catch (error) {
      this.logger.error(`Failed to delete directory ${prefix}: ${error.message}`);
    }
  }
}
