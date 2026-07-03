/**
 * Schema for the LLM structured output when parsing a job description.
 *
 * This defines what the LLM must return — parsed signals + interview type +
 * estimated duration. Used by jdService to validate the LLM response via
 * generateStructuredOutput.
 */
import { z } from 'zod';
import { interviewTypeEnum } from './interviewSession';

/**
 * The structured output the LLM produces from a raw job description.
 * Each field maps to what the setup-review screen displays.
 */
export const jdParsingResultSchema = z.object({
  /** The role title extracted from the JD */
  role: z.string(),
  /** Seniority level (e.g. "Senior (5+ years)", "Staff", "Mid-level") */
  seniority: z.string(),
  /** Technology stack mentioned or implied */
  stack: z.array(z.string()),
  /** Cultural signals and values */
  culture: z.array(z.string()),
  /** Key focus areas for the interview */
  focusAreas: z.array(z.string()),
  /** Best interview type based on the role */
  interviewType: interviewTypeEnum,
  /** Estimated interview duration in minutes (typically 20-35) */
  estimatedMinutes: z.number().int().min(10).max(60),
});

export type JdParsingResult = z.infer<typeof jdParsingResultSchema>;

/** Schema name used for mock registration and the OpenAI function call */
export const JD_PARSING_SCHEMA_NAME = 'jd_parsing_result';
