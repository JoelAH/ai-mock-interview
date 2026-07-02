#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { resolveStageConfig } from '../config/stage-config';

const app = new cdk.App();
const stageConfig = resolveStageConfig(app);

new InfraStack(app, `AiMockInterview-${stageConfig.stage.charAt(0).toUpperCase() + stageConfig.stage.slice(1)}`, {
  description: `AI Mock Interview infrastructure (${stageConfig.stage})`,
  stageConfig,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});
