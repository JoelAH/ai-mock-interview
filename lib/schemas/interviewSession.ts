import { z } from 'zod';

export const sourceTypeEnum = z.enum(['paste', 'preset']);
export const interviewTypeEnum = z.enum(['behavioral', 'technical', 'architectural', 'mix']);
export const sessionStatusEnum = z.enum(['setup', 'in_progress', 'completed', 'abandoned']);

export const parsedSignalsSchema = z
  .object({
    role: z.string(),
    seniority: z.string(),
    stack: z.array(z.string()),
    culture: z.array(z.string()),
    focusAreas: z.array(z.string()),
  })
  .nullable();

export const interviewSessionSchema = z.object({
  userId: z.string().min(1), // ObjectId as string
  sourceType: sourceTypeEnum,
  jdText: z.string().default(''),
  parsedSignals: parsedSignalsSchema.default(null),
  interviewType: interviewTypeEnum,
  status: sessionStatusEnum.default('setup'),
  overallScore: z.number().min(0).max(100).nullable().default(null),
});

export type InterviewSessionDTO = z.infer<typeof interviewSessionSchema>;
export type ParsedSignals = z.infer<typeof parsedSignalsSchema>;
