import {
  BucketAlreadyOwnedByYou, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand, S3Client, S3ServiceException,
} from '@aws-sdk/client-s3';
import { S3Config } from '@config/types';
import {
  publicReadPolicy, StorageService,
} from './storage.service';

const config: S3Config = {
  endpoint: 'http://minio:9000',
  publicUrl: 'https://photos.example.com',
  region: 'us-east-1',
  accessKey: 'key',
  secretKey: 'secret',
  bucket: 'pethouse-photos',
  forcePathStyle: true,
};

function missing (): S3ServiceException {
  return new S3ServiceException({
    name: 'NotFound',
    $fault: 'client',
    $metadata: { httpStatusCode: 404 },
  });
}

describe('StorageService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('treats losing the bucket creation race as success and still applies the policy', async () => {
    const commands: string[] = [];
    jest.spyOn(S3Client.prototype, 'send').mockImplementation(async (command) => {
      commands.push(command.constructor.name);
      if (command instanceof HeadBucketCommand) {
        throw missing();
      }
      if (command instanceof CreateBucketCommand) {
        throw new BucketAlreadyOwnedByYou({
          message: 'already owned',
          $metadata: {},
        });
      }
    });

    await new StorageService(config).ensureBucket();

    expect(commands).toEqual([HeadBucketCommand.name, CreateBucketCommand.name, PutBucketPolicyCommand.name]);
  });

  it('still fails boot on any other bucket creation error', async () => {
    jest.spyOn(S3Client.prototype, 'send').mockImplementation(async (command) => {
      if (command instanceof HeadBucketCommand) {
        throw missing();
      }
      throw new S3ServiceException({
        name: 'AccessDenied',
        $fault: 'client',
        $metadata: { httpStatusCode: 403 },
      });
    });

    await expect(new StorageService(config).ensureBucket()).rejects.toThrow(S3ServiceException);
  });

  it('builds public URLs from the public base, not the internal endpoint', () => {
    const service = new StorageService(config);

    expect(service.publicUrl('tanks/4/abc.jpg')).toBe('https://photos.example.com/pethouse-photos/tanks/4/abc.jpg');
  });

  it('signs an upload URL bound to the key, content type and size', async () => {
    const service = new StorageService(config);

    const target = await service.createUploadUrl('tanks/4/abc.jpg', 'image/jpeg', 1234);
    const url = new URL(target.url);

    expect(url.origin).toBe('http://minio:9000');
    expect(url.pathname).toBe('/pethouse-photos/tanks/4/abc.jpg');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length');
    expect(url.searchParams.has('x-amz-checksum-crc32')).toBe(false);
    expect(target.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('writes a policy allowing anonymous reads of every object', () => {
    const policy: unknown = JSON.parse(publicReadPolicy('pethouse-photos'));

    expect(policy).toMatchObject({
      Statement: [{
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: ['arn:aws:s3:::pethouse-photos/*'],
      }],
    });
  });
});
