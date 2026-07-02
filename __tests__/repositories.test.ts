import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User, InterviewSession, InterviewQuestion, FeedbackReport } from '@/lib/models';
import { userRepository } from '@/lib/repositories/userRepository';
import { sessionRepository } from '@/lib/repositories/sessionRepository';
import { questionRepository } from '@/lib/repositories/questionRepository';
import { feedbackRepository } from '@/lib/repositories/feedbackRepository';
import {
  userSchema,
  interviewSessionSchema,
  interviewQuestionSchema,
  feedbackReportSchema,
} from '@/lib/schemas';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  // Set env var so dbConnect() uses this URI
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ---------------------------------------------------------------------------
// Schema validation tests (Mongoose)
// ---------------------------------------------------------------------------
describe('Mongoose schema validation', () => {
  it('User accepts valid doc', async () => {
    const doc = await User.create({
      clerkUserId: 'user_123',
      email: 'test@example.com',
    });
    expect(doc.clerkUserId).toBe('user_123');
    expect(doc.subscriptionStatus).toBe('none');
  });

  it('User rejects missing required fields', async () => {
    await expect(User.create({ email: 'test@example.com' })).rejects.toThrow();
    await expect(User.create({ clerkUserId: 'user_1' })).rejects.toThrow();
  });

  it('InterviewSession accepts valid doc', async () => {
    const userId = new mongoose.Types.ObjectId();
    const doc = await InterviewSession.create({
      userId,
      sourceType: 'paste',
      interviewType: 'behavioral',
    });
    expect(doc.status).toBe('setup');
    expect(doc.overallScore).toBeNull();
  });

  it('InterviewSession rejects invalid enum', async () => {
    const userId = new mongoose.Types.ObjectId();
    await expect(
      InterviewSession.create({ userId, sourceType: 'invalid', interviewType: 'behavioral' }),
    ).rejects.toThrow();
  });

  it('InterviewQuestion accepts valid doc', async () => {
    const sessionId = new mongoose.Types.ObjectId();
    const doc = await InterviewQuestion.create({
      sessionId,
      text: 'Tell me about a time you led a team.',
      type: 'behavioral',
      order: 0,
    });
    expect(doc.isFollowUp).toBe(false);
    expect(doc.answerTranscript).toBe('');
  });

  it('FeedbackReport accepts valid doc', async () => {
    const sessionId = new mongoose.Types.ObjectId();
    const doc = await FeedbackReport.create({
      sessionId,
      overallScore: 78,
      technicalAccuracyScore: 80,
      communicationScore: 75,
      structureScore: 79,
      synthesizedInsight: 'Focus on structuring answers with STAR method.',
    });
    expect(doc.overallScore).toBe(78);
  });

  it('FeedbackReport rejects score out of range', async () => {
    const sessionId = new mongoose.Types.ObjectId();
    await expect(
      FeedbackReport.create({
        sessionId,
        overallScore: 150,
        technicalAccuracyScore: 80,
        communicationScore: 75,
        structureScore: 79,
        synthesizedInsight: 'Some insight',
      }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Zod schema validation tests
// ---------------------------------------------------------------------------
describe('Zod schema validation', () => {
  it('userSchema validates a correct user', () => {
    const result = userSchema.safeParse({
      clerkUserId: 'user_abc',
      email: 'user@test.com',
    });
    expect(result.success).toBe(true);
  });

  it('userSchema rejects invalid email', () => {
    const result = userSchema.safeParse({
      clerkUserId: 'user_abc',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('interviewSessionSchema validates correctly', () => {
    const result = interviewSessionSchema.safeParse({
      userId: new mongoose.Types.ObjectId().toString(),
      sourceType: 'paste',
      interviewType: 'mix',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('setup');
    }
  });

  it('interviewQuestionSchema validates correctly', () => {
    const result = interviewQuestionSchema.safeParse({
      sessionId: new mongoose.Types.ObjectId().toString(),
      text: 'Design a URL shortener',
      type: 'architectural',
      order: 1,
    });
    expect(result.success).toBe(true);
  });

  it('feedbackReportSchema rejects missing fields', () => {
    const result = feedbackReportSchema.safeParse({
      sessionId: new mongoose.Types.ObjectId().toString(),
      overallScore: 80,
      // missing other scores
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Repository tests
// ---------------------------------------------------------------------------
describe('userRepository', () => {
  it('upserts and finds a user by clerkId', async () => {
    await userRepository.upsertByClerkId('clerk_1', { email: 'a@b.com' });
    const found = await userRepository.findByClerkId('clerk_1');
    expect(found).not.toBeNull();
    expect(found!.email).toBe('a@b.com');
  });

  it('updates subscription fields', async () => {
    await userRepository.upsertByClerkId('clerk_2', { email: 'c@d.com' });
    const updated = await userRepository.updateSubscription('clerk_2', {
      subscriptionStatus: 'active',
      subscriptionId: 'sub_123',
      lemonCustomerId: 'cust_456',
    });
    expect(updated!.subscriptionStatus).toBe('active');
    expect(updated!.subscriptionId).toBe('sub_123');
  });

  it('deletes a user by clerkId', async () => {
    await userRepository.upsertByClerkId('clerk_3', { email: 'e@f.com' });
    await userRepository.deleteByClerkId('clerk_3');
    const found = await userRepository.findByClerkId('clerk_3');
    expect(found).toBeNull();
  });
});

describe('sessionRepository', () => {
  it('creates and finds sessions by userId', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    await sessionRepository.create({
      userId,
      sourceType: 'paste',
      interviewType: 'behavioral',
      jdText: 'Some JD',
    });
    const sessions = await sessionRepository.findByUserId(userId);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].jdText).toBe('Some JD');
  });

  it('updates status and score', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const created = await sessionRepository.create({
      userId,
      sourceType: 'preset',
      interviewType: 'mix',
    });
    const id = created._id.toString();

    await sessionRepository.updateStatus(id, 'completed');
    await sessionRepository.setOverallScore(id, 85);

    const found = await sessionRepository.findById(id);
    expect(found!.status).toBe('completed');
    expect(found!.overallScore).toBe(85);
  });
});

describe('questionRepository', () => {
  it('creates and finds questions by sessionId', async () => {
    const sessionId = new mongoose.Types.ObjectId().toString();
    await questionRepository.create({
      sessionId,
      text: 'Q1',
      type: 'behavioral',
      order: 0,
    });
    await questionRepository.create({
      sessionId,
      text: 'Q2',
      type: 'follow_up',
      order: 1,
      isFollowUp: true,
    });

    const questions = await questionRepository.findBySessionId(sessionId);
    expect(questions).toHaveLength(2);
    expect(questions[0].text).toBe('Q1');
    expect(questions[1].isFollowUp).toBe(true);
  });

  it('sets answer and scores', async () => {
    const sessionId = new mongoose.Types.ObjectId().toString();
    const created = await questionRepository.create({
      sessionId,
      text: 'Q1',
      type: 'architectural',
      order: 0,
    });
    const id = created._id.toString();

    await questionRepository.setAnswer(id, 'My answer transcript');
    await questionRepository.setScores(id, { relevance: 90, depth: 70, clarity: 85 }, 'Good use of examples');

    const found = await questionRepository.findById(id);
    expect(found!.answerTranscript).toBe('My answer transcript');
    expect(found!.scores).toEqual({ relevance: 90, depth: 70, clarity: 85 });
    expect(found!.strongAnswerNotes).toBe('Good use of examples');
  });
});

describe('feedbackRepository', () => {
  it('creates and finds a report by sessionId', async () => {
    const sessionId = new mongoose.Types.ObjectId().toString();
    await feedbackRepository.create({
      sessionId,
      overallScore: 82,
      technicalAccuracyScore: 85,
      communicationScore: 78,
      structureScore: 83,
      synthesizedInsight: 'Work on conciseness in answers.',
    });

    const found = await feedbackRepository.findBySessionId(sessionId);
    expect(found).not.toBeNull();
    expect(found!.overallScore).toBe(82);
    expect(found!.synthesizedInsight).toBe('Work on conciseness in answers.');
  });
});
