import { z } from 'zod';

export const feedbackReportSchema = z.object({
  sessionId: z.string().min(1),
  overallScore: z.number().min(0).max(100),
  technicalAccuracyScore: z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  structureScore: z.number().min(0).max(100),
  synthesizedInsight: z.string().min(1),
});

export type FeedbackReportDTO = z.infer<typeof feedbackReportSchema>;
