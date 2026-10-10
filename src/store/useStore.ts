import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AnalyzeResponse,
  Baseline,
  BusinessProfile,
  ChannelOption,
  ContentItem,
  CustomerType,
  GeneratedContent,
  ResultsEntry,
} from "../types";

export type AiMode = "unknown" | "mock" | "live" | "offline";

interface PersistedState {
  profile: BusinessProfile | null;
  customerTypes: CustomerType[];
  /** Channel scores cached per customer type id, so switching back doesn't call the AI again. */
  channelsByType: Record<string, ChannelOption[]>;
  analysisMock: boolean;
  selectedTypeId: string | null;
  selectedChannelId: string | null;
  /** The content item being reviewed or published. */
  currentContentId: string | null;
  contentItems: ContentItem[];
  baseline: Baseline | null;
  results: Record<string, ResultsEntry>;
}

interface StoreState extends PersistedState {
  aiMode: AiMode;
  setAiMode: (mode: AiMode) => void;
  setProfile: (profile: BusinessProfile) => void;
  setAnalysis: (res: AnalyzeResponse) => void;
  setChannelsFor: (typeId: string, channels: ChannelOption[]) => void;
  selectCustomerType: (id: string) => void;
  selectChannel: (id: string) => void;
  createContent: (args: { customerType: CustomerType; channel: ChannelOption; content: GeneratedContent; mock: boolean }) => void;
  replaceGenerated: (id: string, content: GeneratedContent, mock: boolean) => void;
  updateContent: (id: string, patch: Partial<GeneratedContent>) => void;
  approve: (id: string) => void;
  publish: (id: string) => void;
  startAnother: () => void;
  setBaseline: (baseline: Baseline) => void;
  logResult: (entry: Omit<ResultsEntry, "loggedAt">) => void;
  resetDemo: () => void;
}

const initialState: PersistedState = {
  profile: null,
  customerTypes: [],
  channelsByType: {},
  analysisMock: false,
  selectedTypeId: null,
  selectedChannelId: null,
  currentContentId: null,
  contentItems: [],
  baseline: null,
  results: {},
};

const now = () => new Date().toISOString();

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sameProfile(a: BusinessProfile | null, b: BusinessProfile): boolean {
  return a !== null && a.name === b.name && a.type === b.type && a.neighbourhood === b.neighbourhood && a.description === b.description;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => {
      const mapItem = (id: string, fn: (item: ContentItem) => ContentItem) =>
        set((s) => ({ contentItems: s.contentItems.map((it) => (it.id === id ? fn(it) : it)) }));

      return {
        ...initialState,
        aiMode: "unknown",
        setAiMode: (aiMode) => set({ aiMode }),

        // A changed business invalidates the analysis and any selection.
        setProfile: (profile) =>
          set((s) =>
            sameProfile(s.profile, profile)
              ? { profile }
              : {
                  profile,
                  customerTypes: [],
                  channelsByType: {},
                  selectedTypeId: null,
                  selectedChannelId: null,
                  currentContentId: null,
                },
          ),

        // The best-fit customer type starts selected because the channels were scored for it.
        setAnalysis: (res) =>
          set({
            customerTypes: res.customerTypes,
            channelsByType: { [res.channelsFor]: res.channels },
            analysisMock: res.mock,
            selectedTypeId: res.channelsFor,
            selectedChannelId: null,
          }),

        setChannelsFor: (typeId, channels) =>
          set((s) => ({ channelsByType: { ...s.channelsByType, [typeId]: channels } })),

        selectCustomerType: (id) =>
          set((s) => {
            const keep = s.channelsByType[id]?.some((c) => c.id === s.selectedChannelId);
            return { selectedTypeId: id, selectedChannelId: keep ? s.selectedChannelId : null };
          }),

        selectChannel: (selectedChannelId) => set({ selectedChannelId }),

        createContent: ({ customerType, channel, content, mock }) => {
          const ts = now();
          const item: ContentItem = {
            ...content,
            id: newId(),
            customerTypeId: customerType.id,
            customerTypeName: customerType.name,
            channel,
            status: "draft",
            createdAt: ts,
            updatedAt: ts,
            generatedByMock: mock,
          };
          set((s) => ({ contentItems: [item, ...s.contentItems], currentContentId: item.id }));
        },

        replaceGenerated: (id, content, mock) =>
          mapItem(id, (it) => ({
            ...it,
            body: content.body,
            hashtags: content.hashtags,
            subjectLine: content.subjectLine,
            imageBrief: content.imageBrief,
            generatedByMock: mock,
            status: "draft",
            approvedAt: undefined,
            updatedAt: now(),
          })),

        // Editing approved content sends it back to draft so it is approved again as changed.
        updateContent: (id, patch) =>
          mapItem(id, (it) => ({ ...it, ...patch, status: "draft", approvedAt: undefined, updatedAt: now() })),

        approve: (id) => mapItem(id, (it) => ({ ...it, status: "approved", approvedAt: now(), updatedAt: now() })),

        publish: (id) =>
          mapItem(id, (it) => (it.status === "approved" ? { ...it, status: "published", publishedAt: now(), updatedAt: now() } : it)),

        startAnother: () => set({ currentContentId: null, selectedChannelId: null }),

        setBaseline: (baseline) => set({ baseline }),

        logResult: (entry) => set((s) => ({ results: { ...s.results, [entry.contentId]: { ...entry, loggedAt: now() } } })),

        resetDemo: () => set((s) => ({ ...initialState, aiMode: s.aiMode })),
      };
    },
    {
      name: "reachright-demo",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Data from the earlier multi-role prototype has a different shape; start fresh.
      migrate: () => initialState,
      partialize: (s): PersistedState => ({
        profile: s.profile,
        customerTypes: s.customerTypes,
        channelsByType: s.channelsByType,
        analysisMock: s.analysisMock,
        selectedTypeId: s.selectedTypeId,
        selectedChannelId: s.selectedChannelId,
        currentContentId: s.currentContentId,
        contentItems: s.contentItems,
        baseline: s.baseline,
        results: s.results,
      }),
    },
  ),
);

/** The currently selected customer type and channel, resolved to objects. */
export function useSelection() {
  const customerType = useStore((s) => s.customerTypes.find((t) => t.id === s.selectedTypeId));
  const channel = useStore((s) =>
    s.selectedTypeId ? s.channelsByType[s.selectedTypeId]?.find((c) => c.id === s.selectedChannelId) : undefined,
  );
  return { customerType, channel };
}

export function useCurrentContent(): ContentItem | undefined {
  return useStore((s) => s.contentItems.find((c) => c.id === s.currentContentId));
}
