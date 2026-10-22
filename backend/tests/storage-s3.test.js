const { mockClient } = require('aws-sdk-client-mock');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { sdkStreamMixin } = require('@smithy/util-stream');
const { Readable } = require('stream');

const createS3Storage = require('@/storage/s3Storage');

const s3 = mockClient(S3Client);
const storage = createS3Storage({
  bucket: 'nexora-test',
  region: 'auto',
  endpoint: 'https://example.r2.cloudflarestorage.com',
  forcePathStyle: false,
  accessKeyId: 'key',
  secretAccessKey: 'secret',
});

beforeEach(() => s3.reset());

describe('#08 S3 storage driver', () => {
  test('put writes a private object with the right content type', async () => {
    s3.on(PutObjectCommand).resolves({});
    await storage.put('public/uploads/setting/logo-abc.png', Buffer.from('x'), 'image/png');
    const input = s3.commandCalls(PutObjectCommand)[0].args[0].input;
    expect(input).toMatchObject({
      Bucket: 'nexora-test',
      Key: 'public/uploads/setting/logo-abc.png',
      ContentType: 'image/png',
    });
    expect(input.ACL).toBeUndefined();
  });

  test('get returns the body and content type', async () => {
    s3.on(GetObjectCommand).resolves({
      Body: sdkStreamMixin(Readable.from([Buffer.from('image-bytes')])),
      ContentType: 'image/png',
    });
    const file = await storage.get('public/uploads/setting/logo-abc.png');
    expect(file.body.toString()).toBe('image-bytes');
    expect(file.contentType).toBe('image/png');
  });

  test('get returns null for a missing object', async () => {
    const error = Object.assign(new Error('missing'), { name: 'NoSuchKey' });
    s3.on(GetObjectCommand).rejects(error);
    expect(await storage.get('public/uploads/setting/missing.png')).toBeNull();
  });

  test('other errors are not swallowed', async () => {
    s3.on(GetObjectCommand).rejects(new Error('AccessDenied'));
    await expect(storage.get('public/uploads/setting/x.png')).rejects.toThrow('AccessDenied');
  });

  test('remove deletes the object', async () => {
    s3.on(DeleteObjectCommand).resolves({});
    await storage.remove('public/uploads/setting/logo-abc.png');
    expect(s3.commandCalls(DeleteObjectCommand)[0].args[0].input.Key).toBe(
      'public/uploads/setting/logo-abc.png'
    );
  });
});
