import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Inject, Injectable, Logger,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { s3Config } from '@config';

export interface StoredObject {
  contentType: string;
  sizeBytes: number;
}

export interface UploadTarget {
  url: string;
  expiresAt: Date;
}

const UPLOAD_URL_TTL_SECONDS = 300;

function isNotFound (error: unknown): boolean {
  return error instanceof S3ServiceException
    && (error.name === 'NotFound' || error.name === 'NoSuchKey' || error.$metadata.httpStatusCode === 404);
}

/** Anonymous read of every object: photos are served straight from the bucket. */
export function publicReadPolicy (bucket: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Sid: 'PublicRead',
      Effect: 'Allow',
      Principal: '*',
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${bucket}/*`],
    }],
  });
}

/**
 * The one place that talks to S3 (MinIO in the homelab). Images never transit through the API:
 * clients PUT straight to a pre-signed URL, then register the key.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;

  constructor (
    @Inject(s3Config.KEY)
    private readonly config: ConfigType<typeof s3Config>,
  ) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      // Otherwise the pre-signed PUT carries the checksum of an empty body and real uploads fail.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  get bucket (): string {
    return this.config.bucket;
  }

  /** Creates the bucket on first boot and (re)applies the public-read policy. Idempotent. */
  async ensureBucket (): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error: unknown) {
      if (!isNotFound(error)) {
        throw error;
      }

      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Created bucket ${this.bucket}`);
    }

    await this.client.send(new PutBucketPolicyCommand({
      Bucket: this.bucket,
      Policy: publicReadPolicy(this.bucket),
    }));
  }

  /** A pre-signed PUT bound to this key, content type and exact size, valid a few minutes. */
  async createUploadUrl (key: string, contentType: string, sizeBytes: number): Promise<UploadTarget> {
    const url = await getSignedUrl(this.client, new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: sizeBytes,
    }), {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      // Content-Length is always signed; Content-Type only when asked for. Both are, so the
      // uploaded object is exactly what was declared.
      signableHeaders: new Set(['content-type', 'content-length']),
    });

    return {
      url,
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000),
    };
  }

  /** What actually landed under a key, or null when nothing did. */
  async headObject (key: string): Promise<StoredObject | null> {
    try {
      const head = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));

      return {
        contentType: head.ContentType ?? 'application/octet-stream',
        sizeBytes: head.ContentLength ?? 0,
      };
    } catch (error: unknown) {
      if (isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async deleteObject (key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  publicUrl (key: string): string {
    return `${this.config.publicUrl}/${this.bucket}/${key}`;
  }
}
