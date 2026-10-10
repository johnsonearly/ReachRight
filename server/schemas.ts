import { z } from "zod";
import { BUSINESS_TYPES } from "../src/types";

export const businessProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(BUSINESS_TYPES),
  neighbourhood: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(1500),
});

const score = z.number().int().min(0).max(100);

export const customerTypeSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().min(1).max(80),
  ageRange: z.string().min(1).max(20),
  description: z.string().min(1).max(300),
  fitScore: score,
  reason: z.string().min(1).max(300),
});

export const channelOptionSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  kind: z.enum(["online", "event"]),
  fitScore: score,
  reason: z.string().min(1).max(300),
  detail: z.string().max(200).optional(),
});

export const analyzeRequestSchema = z.object({
  business: businessProfileSchema,
  customerType: customerTypeSchema.optional(),
});

export const contentRequestSchema = z.object({
  business: businessProfileSchema,
  customerType: customerTypeSchema,
  channel: channelOptionSchema,
});

// ---- Shapes the model is asked to return. Scores are clamped and sorted by the server. ----

const aiScore = z.number();

export const aiCustomerTypeSchema = z.object({
  name: z.string().min(1).max(80),
  ageRange: z.string().min(1).max(20),
  description: z.string().min(1).max(300),
  fitScore: aiScore,
  reason: z.string().min(1).max(300),
});

export const aiChannelScoreSchema = z.object({
  id: z.string().min(1).max(60),
  fitScore: aiScore,
  reason: z.string().min(1).max(300),
});

export const aiAnalysisSchema = z.object({
  customerTypes: z.array(aiCustomerTypeSchema).min(2).max(3),
  channels: z.array(aiChannelScoreSchema).min(1).max(10),
});

export const aiChannelsSchema = z.object({
  channels: z.array(aiChannelScoreSchema).min(1).max(10),
});

export const generatedContentSchema = z.object({
  body: z.string().min(1).max(3000),
  hashtags: z.array(z.string().min(1).max(40)).max(2),
  subjectLine: z.string().max(120).optional(),
  imageBrief: z.string().min(1).max(600),
});
