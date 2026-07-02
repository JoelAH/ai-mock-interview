# Infrastructure (CDK)

AWS CDK app for the AI Mock Interview project. Supports isolated dev and prod environments with stage-specific configuration.

## Resources

| Resource | Dev | Prod |
|----------|-----|------|
| S3 Audio Bucket | 3-day retention, auto-delete on destroy | 90-day retention, retained on delete |
| S3 Access Log Bucket | — | Yes (180-day retention) |
| Lambda (Node.js 20) | 128 MB, 10s timeout | 256 MB, 15s timeout |
| Termination Protection | Off | On |
| Access Logging | Off | On |

## Prerequisites

- Node.js 20+
- AWS CLI configured with credentials (`aws configure`)
- CDK bootstrapped in target account/region: `npx cdk bootstrap`

## Commands

```bash
# Install dependencies
npm install

# Synthesize dev stack (default)
npx cdk synth

# Synthesize prod stack
npx cdk synth --context stage=prod

# Deploy dev
npx cdk deploy --context stage=dev

# Deploy prod
npx cdk deploy --context stage=prod

# Compare deployed stack with local changes
npx cdk diff --context stage=dev

# Run CDK assertions tests (both stages)
npm test

# Destroy dev stack (prod has termination protection)
npx cdk destroy --context stage=dev
```

## Environment Selection

The stage is selected via CDK context:

```bash
npx cdk synth --context stage=dev   # → AiMockInterview-Dev
npx cdk synth --context stage=prod  # → AiMockInterview-Prod
```

If no `--context stage=` is provided, defaults to `dev`.

## Configuration

Stage-specific settings live in `config/stage-config.ts`. Each stage defines:

- `audioRetentionDays` — S3 lifecycle expiration
- `bucketRemovalPolicy` — DESTROY (dev) vs RETAIN (prod)
- `autoDeleteObjects` — convenience for dev teardown
- `accessLogging` — server access logs on the audio bucket
- `lambdaMemorySize` / `lambdaTimeout` — resource allocation

To add a new stage (e.g. staging), add an entry to the `stageConfigs` map.

## Project Structure

```
infra/
├── bin/app.ts                  # CDK app entry point (resolves stage from context)
├── config/stage-config.ts      # Per-stage configuration (dev, prod)
├── lib/infra-stack.ts          # Stack definition (S3 + Lambda + IAM)
├── test/infra-stack.test.ts    # CDK assertions tests (dev + prod)
├── cdk.json                    # CDK configuration
├── tsconfig.json               # TypeScript config (isolated from root)
├── vitest.config.ts            # Test runner config
└── package.json                # Infra-specific dependencies
```

## Notes

- Prod uses `RemovalPolicy.RETAIN` — deleting the stack will NOT delete stored audio.
- Prod enables termination protection — you must disable it manually before destroying.
- The Lambda is an inline stub. Future tasks may promote service-layer functions here.
- Deploy is optional at this stage; `cdk synth` validates correctness without touching AWS.
