import { create } from "zustand";

type ItemType = "text" | "image";

export type TierItem = {
  id: string;
  type: ItemType;
  content: string;
};

export type Tier = {
  id: string;
  label: string;
  color: string;
  itemIds: string[];
};

export type TierState = {
  tiers: Tier[];
  items: Record<string, TierItem>;
  bankItemIds: string[];
};

type AddItemInput = {
  id: string;
  type: ItemType;
  content: string;
};

type MoveItemInput = {
  itemId: string;
  fromId: string | "bank";
  toId: string | "bank";
  toIndex?: number;
};

type UpdateTierInput = {
  label?: string;
  color?: string;
};

export type TierStore = TierState & {
  addItem: (item: AddItemInput) => void;
  moveItem: (params: MoveItemInput) => void;
  addTier: () => void;
  deleteTier: (tierId: string) => void;
  updateTier: (tierId: string, updates: UpdateTierInput) => void;
  reorderTiers: (newTiersArray: Tier[]) => void;
  resetStore: () => void;
};

const createDefaultState = (): TierState => ({
  tiers: [
    { id: "tier-s", label: "S", color: "#FF7F7F", itemIds: [] },
    { id: "tier-a", label: "A", color: "#FFBF7F", itemIds: [] },
    { id: "tier-b", label: "B", color: "#FFFF7F", itemIds: [] },
    { id: "tier-c", label: "C", color: "#7FBF7F", itemIds: [] },
    { id: "tier-d", label: "D", color: "#7F7FFF", itemIds: [] },
  ],
  items: {},
  bankItemIds: [],
});

const removeFromList = (list: string[], itemId: string): string[] =>
  list.filter((id) => id !== itemId);

const insertAtIndex = (
  list: string[],
  itemId: string,
  toIndex?: number,
): string[] => {
  const next = [...list];
  const safeIndex = Math.max(0, Math.min(toIndex ?? next.length, next.length));
  next.splice(safeIndex, 0, itemId);
  return next;
};

const useTierStore = create<TierStore>((set) => ({
  ...createDefaultState(),

  addItem: ({ id, type, content }) =>
    set((state) => ({
      items: {
        ...state.items,
        [id]: { id, type, content },
      },
      bankItemIds: [...state.bankItemIds, id],
    })),

  moveItem: ({ itemId, fromId, toId, toIndex }) =>
    set((state) => {
      const tiers = state.tiers.map((tier) => ({
        ...tier,
        itemIds: [...tier.itemIds],
      }));
      let bankItemIds = [...state.bankItemIds];

      if (fromId === "bank") {
        bankItemIds = removeFromList(bankItemIds, itemId);
      } else {
        const fromTier = tiers.find((tier) => tier.id === fromId);
        if (fromTier) {
          fromTier.itemIds = removeFromList(fromTier.itemIds, itemId);
        }
      }

      if (toId === "bank") {
        bankItemIds = insertAtIndex(bankItemIds, itemId, toIndex);
      } else {
        const toTier = tiers.find((tier) => tier.id === toId);
        if (toTier) {
          toTier.itemIds = insertAtIndex(toTier.itemIds, itemId, toIndex);
        }
      }

      return { tiers, bankItemIds };
    }),

  addTier: () =>
    set((state) => ({
      tiers: [
        ...state.tiers,
        {
          id: `tier-${crypto.randomUUID()}`,
          label: "New",
          color: "#AAAAAA",
          itemIds: [],
        },
      ],
    })),

  deleteTier: (tierId) =>
    set((state) => {
      const tierToDelete = state.tiers.find((tier) => tier.id === tierId);
      if (!tierToDelete) return state;

      return {
        tiers: state.tiers.filter((tier) => tier.id !== tierId),
        bankItemIds: [...state.bankItemIds, ...tierToDelete.itemIds],
      };
    }),

  updateTier: (tierId, updates) =>
    set((state) => ({
      tiers: state.tiers.map((tier) =>
        tier.id === tierId
          ? {
              ...tier,
              ...(updates.label !== undefined ? { label: updates.label } : {}),
              ...(updates.color !== undefined ? { color: updates.color } : {}),
            }
          : tier,
      ),
    })),

  reorderTiers: (newTiersArray) =>
    set(() => ({
      tiers: newTiersArray,
    })),

  resetStore: () =>
    set(() => ({
      ...createDefaultState(),
    })),
}));

export default useTierStore;
