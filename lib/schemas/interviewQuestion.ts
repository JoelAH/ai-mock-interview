import { z } from 'zod';

export const questionTypeEnum = z.enum(['behavioral', 'technical', 'architectural', 'follow_up', 'rescue']);

export const questionScoresSchema = z
  .object({
    relevance: z.number().min(0).max(100).optional(),
    depth: z.number().min(0).max(100).optional(),
    clarity: z.number().min(0).max(100).optional(),
  })
  .nullable();

export const interviewQuestionSchema = z.object({
  sessionId: z.string().min(1),
  text: z.string().min(1),
  type: questionTypeEnum,
  order: z.number().int().min(0),
  isFollowUp: z.boolean().default(false),
  answerTranscript: z.string().default(''),
  scores: questionScoresSchema.default(null),
  strongAnswerNotes: z.string().default(''),
});

export type InterviewQuestionDTO = z.infer<typeof interviewQuestionSchema>;
export type QuestionScores = z.infer<typeof questionScoresSchema>;
