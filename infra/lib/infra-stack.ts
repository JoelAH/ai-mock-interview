import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import type { StageConfig } from '../config/stage-config';

export interface InfraStackProps extends cdk.StackProps {
  stageConfig: StageConfig;
}

/**
 * AI Mock Interview infrastructure stack.
 *
 * Resources are parameterized by stage (dev/prod) via StageConfig:
 * - Dev: short retention, auto-delete on destroy, relaxed settings.
 * - Prod: longer retention, deletion protection, access logging, higher resources.
 */
export class InfraStack extends cdk.Stack {
  public readonly audioBucket: s3.Bucket;
  public readonly accessLogBucket?: s3.Bucket;
  public readonly healthLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { stageConfig } = props;

    // --- S3: Access log bucket (prod only) ---
    if (stageConfig.accessLogging) {
      this.accessLogBucket = new s3.Bucket(this, 'AccessLogBucket', {
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        lifecycleRules: [
          {
            id: 'ExpireLogsAfter180Days',
            expiration: cdk.Duration.days(180),
            enabled: true,
          },
        ],
      });
    }

    // --- S3 Bucket: session audio storage ---
    this.audioBucket = new s3.Bucket(this, 'AudioBucket', {
      bucketName: cdk.PhysicalName.GENERATE_IF_NEEDED,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: stageConfig.bucketRemovalPolicy,
      autoDeleteObjects: stageConfig.autoDeleteObjects,
      serverAccessLogsBucket: this.accessLogBucket,
      serverAccessLogsPrefix: this.accessLogBucket ? 'audio-bucket/' : undefined,
      lifecycleRules: [
        {
          id: 'ExpireAudio',
          expiration: cdk.Duration.days(stageConfig.audioRetentionDays),
          enabled: true,
        },
      ],
    });

    // --- Stub Lambda: health check ---
    this.healthLambda = new lambda.Function(this, 'HealthLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async () => ({
          statusCode: 200,
          body: JSON.stringify({ status: 'ok', stage: '${stageConfig.stage}', timestamp: new Date().toISOString() }),
        });
      `),
      description: `Health-check Lambda (${stageConfig.stage})`,
      timeout: cdk.Duration.seconds(stageConfig.lambdaTimeout),
      memorySize: stageConfig.lambdaMemorySize,
      environment: {
        STAGE: stageConfig.stage,
      },
    });

    // Least-privilege: Lambda can read from the audio bucket only.
    this.audioBucket.grantRead(this.healthLambda);

    this.healthLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:ListBucket'],
        resources: [this.audioBucket.bucketArn, `${this.audioBucket.bucketArn}/*`],
      }),
    );

    // --- Deletion protection (prod only) ---
    if (stageConfig.stage === 'prod') {
      this.terminationProtection = true;
    }

    // --- Outputs ---
    new cdk.CfnOutput(this, 'AudioBucketName', {
      value: this.audioBucket.bucketName,
      description: `S3 bucket for session audio (${stageConfig.stage})`,
    });

    new cdk.CfnOutput(this, 'HealthLambdaArn', {
      value: this.healthLambda.functionArn,
      description: `Health-check Lambda ARN (${stageConfig.stage})`,
    });

    new cdk.CfnOutput(this, 'Stage', {
      value: stageConfig.stage,
      description: 'Deployment stage',
    });
  }
}
