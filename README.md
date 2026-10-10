# ReachRight

**Find your customers before you message them.**

ReachRight is a prototype for small local shops (starting with retail and cafes in Halifax, Nova Scotia). The owner describes their shop, picks one customer type and one place to reach them, reviews AI-written content, and publishes it.

## The flow

| Step | Screen | What happens |
| --- | --- | --- |
| 1 | **Business** | Name, type, Halifax neighbourhood and a short description. |
| 2 | **Choose** | The AI scores 2 to 3 customer types and up to 5 places to reach them. Places are a mix of online channels and sample local events. Pick one of each. |
| 3 | **Review** | The AI writes content for that exact customer type and place. You can edit, regenerate, then approve it. |
| 4 | **Publish** | Publishing is simulated. You get a short confirmation. |

There is also an optional **Track results** page, linked from the confirmation. Enter impressions and responses for a "before" period and for each published item to compare response rates.

### About fit scores

Each customer type and place gets a **fit score** (an integer from 0 to 100). It's an AI estimate of how well the option matches the business and customer. It is not a probability, a sales forecast or a guarantee. The server clamps every score to 0–100 and sorts the lists highest first. Channel scores depend on the selected customer type: choosing a different type re-scores the places, and the result is cached so switching back doesn't call the AI again.

## Setup

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env      # optional: add your Anthropic API key
npm run dev
```

Open http://localhost:5173. `npm run dev` starts both processes with `concurrently`:

- **client**: Vite + React on port 5173, which proxies `/api` to the server
- **server**: Express on port 8787 (`server/index.ts`, run with `tsx watch`)

| Command | What it does |
| --- | --- |
| `npm test` | Vitest unit tests: score clamping and sorting, event matching, response rate |
| `npm run typecheck` | Strict TypeScript check of client and server |
| `npm run build` | Typecheck and production build of the client |

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | _(empty)_ | Anthropic API key. **If blank, the server runs in Mock AI mode.** |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Model used for scoring and content. |
| `PORT` | `8787` | API server port. The Vite proxy reads the same variable. |

The key is only read by the Node server. The browser never calls the Anthropic API directly.

## API

- `POST /api/analyze` `{ business, customerType? }` → `{ customerTypes, channels, channelsFor, mock }`
  - Without `customerType`, it returns the scored customer types plus channels scored for the best-fit type (`channelsFor`).
  - With `customerType`, it re-scores channels for that type only.
  - The model gets a fixed candidate list: the online channels plus the sample events that best match the business (pre-filtered by `src/lib/matchEvents.ts`). It may only score those ids. Names and dates come from our data, never from the model.
- `POST /api/content` `{ business, customerType, channel }` → `{ content: { body, hashtags, subjectLine?, imageBrief }, mock }`

The model is asked for JSON only. Replies are validated with zod and retried once if malformed. The content prompt forbids false claims, invented discounts or statistics, and health claims.

## What's real vs. mocked

| Part | Status |
| --- | --- |
| AI customer types, fit scores and channel ranking | **Real** with an API key |
| AI content and image brief | **Real** with an API key |
| Mock AI mode | With no key, both endpoints return realistic canned answers for each business type, and the header shows a **Mock AI mode** badge. In mock mode, event scores come from the tag-matching logic. |
| Local events | **Mocked**: 18 sample events in `src/data/halifaxEvents.ts`, labelled "Sample data" in the app |
| Publishing | **Simulated**: it sets the status to Published and records a timestamp. No social APIs are called. |
| Results | Arithmetic on the numbers you enter. Nothing is estimated or pre-filled. |

On the models that support it, the server turns on Anthropic's server-side refusal fallback (`fallbacks: "default"`). If the safety system declines a request, another model answers instead of the request failing. App state lives in `localStorage`; **Reset demo** in the header clears it.

## Project structure

```
server/            index.ts (routes), ai.ts (Anthropic client, JSON + zod, retries),
                   prompts.ts, schemas.ts, candidates.ts (channel/event candidates), mock.ts
src/types.ts       Shared types: CustomerType, ChannelOption, ContentItem, API contracts
src/data/          halifaxEvents.ts (sample events), demoBusiness.ts
src/lib/           api.ts, scores.ts (+ tests), matchEvents.ts (+ tests), results.ts (+ tests), labels.ts
src/store/         Zustand store persisted to localStorage
src/components/    Header, Stepper, FitScore, ChannelPreview, UI primitives
src/pages/         BusinessPage, ChoosePage, ReviewPage, PublishPage, ResultsPage
```

## 2-minute demo script (coffee shop)

1. **Business (~15s).** Click **Load demo: coffee shop**. This loads Harbour Bean Coffee on Spring Garden Road near Dal and SMU. Click **Find my customers**.
2. **Choose (~40s).** "Analysing your business..." appears, then three customer types with fit scores. Campus crammers is marked **Best fit**. Hover or tab to the ⓘ next to "Fit score": it's an estimate, not a guarantee. The places list mixes Instagram and TikTok with campus fairs labelled **Sample data**. Click **Weekend regulars** and the places re-rank to farmers' markets and Facebook. Click back to Campus crammers: no reload, the result is cached. Pick Weekend regulars and **Historic Farmers' Market at the Brewery**, then click **Create my content**.
3. **Review (~35s).** Point out the summary line ("For: Weekend regulars via Historic Farmers' Market...") and its **Change** link. The flyer copy leaves a placeholder for the stall number instead of inventing one. Click **Edit**, fill in the stall number, then click **Done editing**. Optionally click **Regenerate**. Click **Approve**; the button becomes **Continue to publish**.
4. **Publish (~15s).** Review the content once more and click **Publish**. The confirmation reads "Published to Historic Farmers' Market at the Brewery", with **Create another** and **Track results** links.
5. **Track results (~15s).** Show the empty state. Enter Before: 8,000 impressions and 96 responses. Enter the published item: 1,200 impressions and 30 responses. The chart shows 1.2% vs 2.5%. Point out the footnote: results come only from the numbers you enter.

Finish with **Reset demo** in the header.
