import * as cdk from 'aws-cdk-lib';

/**
 * Per-stage configuration for the AI Mock Interview infrastructure.
 */
export interface StageConfig {
  /** Stage name used in resource naming */
  stage: 'dev' | 'prod';

  /** S3 lifecycle expiration in days */
  audioRetentionDays: number;

  /** Whether the S3 bucket should be retained on stack deletion */
  bucketRemovalPolicy: cdk.RemovalPolicy;

  /** Auto-delete bucket objects when stack is destroyed (dev convenience) */
  autoDeleteObjects: boolean;

  /** Enable S3 access logging (prod security requirement) */
  accessLogging: boolean;

  /** Lambda memory in MB */
  lambdaMemorySize: number;

  /** Lambda timeout in seconds */
  lambdaTimeout: number;
}

export const stageConfigs: Record<string, StageConfig> = {
  dev: {
    stage: 'dev',
    audioRetentionDays: 3,
    bucketRemovalPolicy: cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    accessLogging: false,
    lambdaMemorySize: 128,
    lambdaTimeout: 10,
  },
  prod: {
    stage: 'prod',
    audioRetentionDays: 90,
    bucketRemovalPolicy: cdk.RemovalPolicy.RETAIN,
    autoDeleteObjects: false,
    accessLogging: true,
    lambdaMemorySize: 256,
    lambdaTimeout: 15,
  },
};

/**
 * Resolves stage config from CDK context or defaults to 'dev'.
 */
export function resolveStageConfig(app: cdk.App): StageConfig {
  const stage = app.node.tryGetContext('stage') ?? 'dev';
  const config = stageConfigs[stage];
  if (!config) {
    throw new Error(`Unknown stage: "${stage}". Valid stages: dev, prod`);
  }
  return config;
}
