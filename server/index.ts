import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { normalizeScored } from "../src/lib/scores";
import { CHANNELS, type AnalyzeResponse, type ApiErrorBody, type ChannelOption, type ContentResponse, type HealthResponse } from "../src/types";
import { AiError, generateJson, MOCK_MODE, MODEL } from "./ai";
import { buildChannelList, eventCandidates, findEvent, isOnlineChannel } from "./candidates";
import { mockChannels, mockContent, mockCustomerTypes } from "./mock";
import {
  ANALYZE_SYSTEM,
  analyzeUserPrompt,
  channelsUserPrompt,
  CONTENT_SYSTEM,
  contentUserPrompt,
  type ContentTarget,
} from "./prompts";
import { aiAnalysisSchema, aiChannelsSchema, analyzeRequestSchema, contentRequestSchema, generatedContentSchema } from "./schemas";

const MAX_CUSTOMER_TYPES = 3;

const app = express();
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/] }));
app.use(express.json({ limit: "100kb" }));

/** Small delay in mock mode so loading states are visible during demos. */
const mockDelay = () => new Promise((resolve) => setTimeout(resolve, 600));

function sendError(res: Response<ApiErrorBody>, status: number, message: string) {
  res.status(status).json({ error: message });
}

function handleError(res: Response<ApiErrorBody>, err: unknown) {
  if (err instanceof AiError) return sendError(res, err.status, err.message);
  console.error("[server] unexpected error", err);
  sendError(res, 500, "Unexpected server error.");
}

function allowedIds(eventIds: string[]): Set<string> {
  return new Set<string>([...CHANNELS, ...eventIds]);
}

function requireChannels(channels: ChannelOption[]): ChannelOption[] {
  if (channels.length === 0) throw new AiError("The AI didn't return any usable channels. Please try again.", 502);
  return channels;
}

app.get("/api/health", (_req, res: Response<HealthResponse>) => {
  res.json({ ok: true, mock: MOCK_MODE, model: MODEL });
});

app.post("/api/analyze", async (req: Request, res: Response<AnalyzeResponse | ApiErrorBody>) => {
  const parsed = analyzeRequestSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, "Please fill in the business name, type, neighbourhood and description.");
  const { business, customerType } = parsed.data;

  try {
    // Re-score channels for a chosen customer type.
    if (customerType) {
      let channels: ChannelOption[];
      if (MOCK_MODE) {
        await mockDelay();
        channels = mockChannels(business, customerType);
      } else {
        const events = eventCandidates(business, [customerType]);
        const result = await generateJson(ANALYZE_SYSTEM, channelsUserPrompt(business, customerType, events), aiChannelsSchema);
        channels = buildChannelList(result.channels, allowedIds(events.map((m) => m.event.id)));
      }
      return res.json({ customerTypes: [customerType], channels: requireChannels(channels), channelsFor: customerType.id, mock: MOCK_MODE });
    }

    // First analysis: customer types plus channels for the best-fit type.
    if (MOCK_MODE) {
      await mockDelay();
      const customerTypes = mockCustomerTypes(business);
      const top = customerTypes[0];
      if (!top) throw new AiError("No customer types available.", 500);
      return res.json({ customerTypes, channels: mockChannels(business, top), channelsFor: top.id, mock: true });
    }

    const events = eventCandidates(business, []);
    const result = await generateJson(ANALYZE_SYSTEM, analyzeUserPrompt(business, events), aiAnalysisSchema);
    const stamp = Date.now().toString(36);
    const customerTypes = normalizeScored(
      result.customerTypes.map((t, i) => ({ ...t, id: `ct-${i + 1}-${stamp}` })),
      MAX_CUSTOMER_TYPES,
    );
    const top = customerTypes[0];
    if (!top) throw new AiError("The AI didn't return any customer types. Please try again.", 502);
    const channels = requireChannels(buildChannelList(result.channels, allowedIds(events.map((m) => m.event.id))));
    res.json({ customerTypes, channels, channelsFor: top.id, mock: false });
  } catch (err) {
    handleError(res, err);
  }
});

app.post("/api/content", async (req: Request, res: Response<ContentResponse | ApiErrorBody>) => {
  const parsed = contentRequestSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, "Invalid request. Choose a customer type and where to reach them.");
  const { business, customerType, channel } = parsed.data;

  let target: ContentTarget;
  if (channel.kind === "online" && isOnlineChannel(channel.id)) {
    target = { kind: "online", channel: channel.id };
  } else {
    const event = channel.kind === "event" ? findEvent(channel.id) : undefined;
    if (!event) return sendError(res, 400, "Unknown channel or event. Go back and choose again.");
    target = { kind: "event", event };
  }

  try {
    const content = MOCK_MODE
      ? (await mockDelay(), mockContent(business, customerType, target))
      : await generateJson(CONTENT_SYSTEM, contentUserPrompt(business, customerType, target), generatedContentSchema);

    // Email never has hashtags; nothing else has a subject line.
    const isEmail = target.kind === "online" && target.channel === "email";
    res.json({
      content: {
        ...content,
        hashtags: isEmail ? [] : content.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)),
        subjectLine: isEmail ? content.subjectLine : undefined,
      },
      mock: MOCK_MODE,
    });
  } catch (err) {
    handleError(res, err);
  }
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`[server] ReachRight API on http://localhost:${port} (${MOCK_MODE ? "MOCK AI mode" : `model ${MODEL}`})`);
});
