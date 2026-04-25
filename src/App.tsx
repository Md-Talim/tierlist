import type { DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { KeyboardEvent } from "react";
import { useMemo, useState } from "react";
import SortableItem from "./components/SortableItem";
import type { Tier } from "./store/useTierStore";
import useTierStore from "./store/useTierStore";

type ContainerId = string | "bank";

type TierRowProps = {
  tier: Tier;
  index: number;
  tierCount: number;
  items: Record<
    string,
    { id: string; type: "text" | "image"; content: string }
  >;
  isEditing: boolean;
  editingValue: string;
  onStartEdit: (tier: Tier) => void;
  onChangeEditValue: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onChangeColor: (tierId: string, color: string) => void;
  onDeleteTier: (tierId: string) => void;
};

function getContainerForId(
  id: string,
  tiers: { id: string; itemIds: string[] }[],
  bankItemIds: string[],
): ContainerId | null {
  if (id === "bank") return "bank";
  if (tiers.some((tier) => tier.id === id)) return id;

  if (bankItemIds.includes(id)) return "bank";

  const tier = tiers.find((t) => t.itemIds.includes(id));
  return tier ? tier.id : null;
}

function DroppableContainer({
  id,
  className,
  children,
}: {
  id: string;
  className: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} id={id} className={className}>
      {children}
    </div>
  );
}

function TierRow({
  tier,
  index,
  tierCount,
  items,
  isEditing,
  editingValue,
  onStartEdit,
  onChangeEditValue,
  onCommitEdit,
  onCancelEdit,
  onChangeColor,
  onDeleteTier,
}: TierRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: tier.id,
      data: { type: "tier" },
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleLabelKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onCommitEdit();
    } else if (event.key === "Escape") {
      onCancelEdit();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex min-h-28 ${
        index !== tierCount - 1 ? "border-b border-white/10" : ""
      }`}
    >
      <div
        className="relative flex w-15 items-center justify-center text-lg font-bold text-zinc-900"
        style={{ backgroundColor: tier.color }}
      >
        <button
          type="button"
          aria-label="Drag tier"
          className="absolute left-1 top-1 rounded p-1 text-sm leading-none text-zinc-900/70 transition hover:bg-black/10 hover:text-zinc-900"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

        {isEditing ? (
          <input
            autoFocus
            value={editingValue}
            onChange={(e) => onChangeEditValue(e.target.value)}
            onBlur={onCommitEdit}
            onKeyDown={handleLabelKeyDown}
            className="w-10 bg-transparent text-center text-lg font-bold text-zinc-900 outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => onStartEdit(tier)}
            className="w-full px-2 text-center"
          >
            {tier.label}
          </button>
        )}

        <label
          className="absolute bottom-1 right-1 h-4 w-4 cursor-pointer overflow-hidden rounded-full border border-black/30"
          title="Change tier color"
        >
          <input
            type="color"
            value={tier.color}
            onChange={(e) => onChangeColor(tier.id, e.target.value)}
            className="h-6 w-6 -translate-x-1 -translate-y-1 cursor-pointer appearance-none border-0 bg-transparent p-0"
          />
        </label>
      </div>

      <SortableContext items={tier.itemIds} strategy={rectSortingStrategy}>
        <DroppableContainer
          id={tier.id}
          className="flex flex-1 flex-wrap content-center gap-3 p-3"
        >
          {tier.itemIds.map((itemId) => {
            const item = items[itemId];
            if (!item) return null;
            return <SortableItem key={item.id} item={item} />;
          })}

          <button
            type="button"
            onClick={() => onDeleteTier(tier.id)}
            className="ml-auto self-start opacity-0 transition group-hover:opacity-100 text-zinc-400 hover:text-zinc-100"
            aria-label="Delete tier"
            title="Delete tier"
          >
            ×
          </button>
        </DroppableContainer>
      </SortableContext>
    </div>
  );
}

function App() {
  const tiers = useTierStore((state) => state.tiers);
  const items = useTierStore((state) => state.items);
  const bankItemIds = useTierStore((state) => state.bankItemIds);
  const addItem = useTierStore((state) => state.addItem);
  const moveItem = useTierStore((state) => state.moveItem);
  const updateTier = useTierStore((state) => state.updateTier);
  const addTier = useTierStore((state) => state.addTier);
  const deleteTier = useTierStore((state) => state.deleteTier);
  const reorderTiers = useTierStore((state) => state.reorderTiers);

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const tierIds = useMemo(() => tiers.map((tier) => tier.id), [tiers]);

  const handleAddTestItem = () => {
    const id = `test-${crypto.randomUUID()}`;
    addItem({
      id,
      type: "text",
      content: "Test",
    });
  };

  const startEditingTier = (tier: Tier) => {
    setEditingTierId(tier.id);
    setEditingLabel(tier.label);
  };

  const commitTierLabel = () => {
    if (!editingTierId) return;

    const nextLabel = editingLabel.trim();
    if (nextLabel.length > 0) {
      updateTier(editingTierId, { label: nextLabel });
    }
    setEditingTierId(null);
    setEditingLabel("");
  };

  const cancelTierLabelEdit = () => {
    setEditingTierId(null);
    setEditingLabel("");
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (active.data.current?.type === "tier") return;

    const fromId = getContainerForId(activeId, tiers, bankItemIds);
    const toId = getContainerForId(overId, tiers, bankItemIds);

    if (!fromId || !toId || fromId === toId) return;

    const destinationIds =
      toId === "bank"
        ? bankItemIds
        : (tiers.find((tier) => tier.id === toId)?.itemIds ?? []);

    const overIsContainer =
      overId === "bank" || tiers.some((tier) => tier.id === overId);

    const toIndex = overIsContainer
      ? destinationIds.length
      : Math.max(destinationIds.indexOf(overId), 0);

    moveItem({
      itemId: activeId,
      fromId,
      toId,
      toIndex,
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (active.data.current?.type === "tier") {
      const oldIndex = tiers.findIndex((tier) => tier.id === activeId);
      const newIndex = tiers.findIndex((tier) => tier.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      reorderTiers(arrayMove(tiers, oldIndex, newIndex));
      return;
    }

    const fromId = getContainerForId(activeId, tiers, bankItemIds);
    const toId = getContainerForId(overId, tiers, bankItemIds);

    if (!fromId || !toId) return;

    const destinationIds =
      toId === "bank"
        ? bankItemIds
        : (tiers.find((tier) => tier.id === toId)?.itemIds ?? []);

    const overIsContainer =
      overId === "bank" || tiers.some((tier) => tier.id === overId);

    let toIndex: number;

    if (fromId === toId) {
      if (overIsContainer) {
        toIndex = destinationIds.length - 1;
      } else {
        toIndex = destinationIds.indexOf(overId);
      }
    } else {
      if (overIsContainer) {
        toIndex = destinationIds.length;
      } else {
        toIndex = destinationIds.indexOf(overId);
      }
    }

    if (toIndex < 0) toIndex = destinationIds.length;

    moveItem({
      itemId: activeId,
      fromId,
      toId,
      toIndex,
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <main className="min-h-screen bg-zinc-900 text-zinc-100">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Tier List
            </h1>
            <button
              type="button"
              className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
            >
              Export as PNG
            </button>
          </header>

          <section className="overflow-hidden rounded-lg border border-white/10 bg-zinc-800/50">
            <SortableContext
              items={tierIds}
              strategy={verticalListSortingStrategy}
            >
              {tiers.map((tier, idx) => (
                <TierRow
                  key={tier.id}
                  tier={tier}
                  index={idx}
                  tierCount={tiers.length}
                  items={items}
                  isEditing={editingTierId === tier.id}
                  editingValue={editingTierId === tier.id ? editingLabel : ""}
                  onStartEdit={startEditingTier}
                  onChangeEditValue={setEditingLabel}
                  onCommitEdit={commitTierLabel}
                  onCancelEdit={cancelTierLabelEdit}
                  onChangeColor={(tierId, color) =>
                    updateTier(tierId, { color })
                  }
                  onDeleteTier={deleteTier}
                />
              ))}
            </SortableContext>
          </section>

          <div className="mt-2">
            <button
              type="button"
              onClick={addTier}
              className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition hover:bg-white/10"
            >
              + Add Tier
            </button>
          </div>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Item Bank
              </p>
              <button
                type="button"
                onClick={handleAddTestItem}
                className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition hover:bg-white/10"
              >
                Add Test Item
              </button>
            </div>

            <SortableContext items={bankItemIds} strategy={rectSortingStrategy}>
              <DroppableContainer
                id="bank"
                className="flex min-h-32 flex-wrap gap-3 rounded-lg border border-white/10 bg-zinc-800/40 p-3"
              >
                {bankItemIds.map((itemId) => {
                  const item = items[itemId];
                  if (!item) return null;
                  return <SortableItem key={item.id} item={item} />;
                })}
              </DroppableContainer>
            </SortableContext>
          </section>
        </div>
      </main>
    </DndContext>
  );
}

export default App;
