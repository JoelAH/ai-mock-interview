/**
 * Schema for the LLM structured output when the interview orchestrator
 * decides the next question and action (probe/advance/rescue/end).
 *
 * Used by sessionService.processTurn via generateStructuredOutput.
 * The LLM receives the conversation history + latest transcript and
 * returns the next interviewer turn.
 */
import { z } from 'zod';
import { questionTypeEnum } from './interviewQuestion';

/**
 * The structured output the LLM produces for each turn decision.
 */
export const orchestratorResultSchema = z.object({
  /** The next question text the interviewer should ask */
  questionText: z.string(),
  /** Type of question being asked */
  questionType: questionTypeEnum,
  /** Whether this is a follow-up probing deeper on the same topic */
  isFollowUp: z.boolean(),
  /**
   * Decision on what to do next:
   * - "probe": ask a follow-up to dig deeper into the current answer
   * - "advance": move to a new topic/question
   * - "rescue": the candidate seems stuck, rephrase or offer a hint
   * - "end": the interview has covered enough ground, wrap up
   */
  action: z.enum(['probe', 'advance', 'rescue', 'end']),
  /** Brief internal reasoning for the decision (not shown to user, useful for debugging) */
  reasoning: z.string(),
});

export type OrchestratorResult = z.infer<typeof orchestratorResultSchema>;

/** Schema name used for mock registration and the OpenAI structured output call */
export const ORCHESTRATOR_SCHEMA_NAME = 'orchestrator_turn_decision';
