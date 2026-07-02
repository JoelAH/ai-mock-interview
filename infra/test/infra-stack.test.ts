import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { InfraStack } from '../lib/infra-stack';
import { stageConfigs } from '../config/stage-config';

// ---------------------------------------------------------------------------
// Dev stage
// ---------------------------------------------------------------------------
describe('InfraStack (dev)', () => {
  const app = new cdk.App();
  const stack = new InfraStack(app, 'TestDev', { stageConfig: stageConfigs.dev });
  const template = Template.fromStack(stack);

  it('creates an S3 bucket with SSE encryption', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' },
          }),
        ]),
      },
    });
  });

  it('applies a 3-day lifecycle rule (dev retention)', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            ExpirationInDays: 3,
            Status: 'Enabled',
          }),
        ]),
      },
    });
  });

  it('sets DeletionPolicy to Delete for dev bucket', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    const audioBucketKey = Object.keys(buckets).find((k) => k.startsWith('AudioBucket'));
    expect(audioBucketKey).toBeDefined();
    expect(buckets[audioBucketKey!].DeletionPolicy).toBe('Delete');
  });

  it('does NOT create an access log bucket in dev', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    const logBucketKey = Object.keys(buckets).find((k) => k.startsWith('AccessLogBucket'));
    expect(logBucketKey).toBeUndefined();
  });

  it('does NOT enable termination protection in dev', () => {
    expect(stack.terminationProtection).toBe(false);
  });

  it('creates a Lambda with 128 MB memory (dev)', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 128,
      Timeout: 10,
    });
  });

  it('sets STAGE env var to dev on Lambda', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({ STAGE: 'dev' }),
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Prod stage
// ---------------------------------------------------------------------------
describe('InfraStack (prod)', () => {
  const app = new cdk.App();
  const stack = new InfraStack(app, 'TestProd', { stageConfig: stageConfigs.prod });
  const template = Template.fromStack(stack);

  it('applies a 90-day lifecycle rule (prod retention)', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            ExpirationInDays: 90,
            Status: 'Enabled',
          }),
        ]),
      },
    });
  });

  it('sets DeletionPolicy to Retain for prod bucket', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    const audioBucketKey = Object.keys(buckets).find((k) => k.startsWith('AudioBucket'));
    expect(audioBucketKey).toBeDefined();
    expect(buckets[audioBucketKey!].DeletionPolicy).toBe('Retain');
  });

  it('creates an access log bucket in prod', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    const logBucketKey = Object.keys(buckets).find((k) => k.startsWith('AccessLogBucket'));
    expect(logBucketKey).toBeDefined();
  });

  it('enables termination protection in prod', () => {
    expect(stack.terminationProtection).toBe(true);
  });

  it('creates a Lambda with 256 MB memory (prod)', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 256,
      Timeout: 15,
    });
  });

  it('sets STAGE env var to prod on Lambda', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({ STAGE: 'prod' }),
      },
    });
  });

  it('configures server access logging on the audio bucket', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      LoggingConfiguration: Match.objectLike({
        LogFilePrefix: 'audio-bucket/',
      }),
    });
  });
});
