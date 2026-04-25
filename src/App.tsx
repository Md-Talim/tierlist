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
import { toPng } from "html-to-image";
import { nanoid } from "nanoid";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  onRemoveItem: (itemId: string) => void;
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
  onRemoveItem,
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
        className="relative flex w-12 items-center justify-center text-base font-bold text-zinc-900 sm:w-15 sm:text-lg"
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
            className="w-8 bg-transparent text-center text-base font-bold text-zinc-900 outline-none sm:w-10 sm:text-lg"
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
            return (
              <SortableItem
                key={item.id}
                item={item}
                onRemove={() => onRemoveItem(item.id)}
              />
            );
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read image as data URL."));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
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
  const removeItem = useTierStore((state) => state.removeItem);
  const reorderTiers = useTierStore((state) => state.reorderTiers);
  const resetStore = useTierStore((state) => state.resetStore);

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [newTextItem, setNewTextItem] = useState("");
  const [pasteMessage, setPasteMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const tierIds = useMemo(() => tiers.map((tier) => tier.id), [tiers]);

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

  const showPasteToast = (message: string) => {
    setPasteMessage(message);
  };

  useEffect(() => {
    if (!pasteMessage) return;
    const timeoutId = window.setTimeout(() => {
      setPasteMessage("");
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [pasteMessage]);

  const addImageFileToBank = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const dataUrl = await readFileAsDataUrl(file);
      addItem({
        id: nanoid(),
        type: "image",
        content: dataUrl,
      });
    },
    [addItem],
  );

  const handleImageInputChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await addImageFileToBank(file);
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    const listener = (event: globalThis.ClipboardEvent) => {
      const clipboardItems = event.clipboardData?.items;
      if (!clipboardItems) return;

      for (const clipboardItem of Array.from(clipboardItems)) {
        if (clipboardItem.kind !== "file") continue;
        const file = clipboardItem.getAsFile();
        if (!file || !file.type.startsWith("image/")) continue;

        void addImageFileToBank(file).then(() => {
          showPasteToast("Image pasted!");
        });
        break;
      }
    };

    document.addEventListener("paste", listener);
    return () => {
      document.removeEventListener("paste", listener);
    };
  }, [addImageFileToBank]);

  const handleAddTextItem = () => {
    const value = newTextItem.trim();
    if (!value) return;

    addItem({
      id: nanoid(),
      type: "text",
      content: value,
    });
    setNewTextItem("");
  };

  const handleTextSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleAddTextItem();
  };

  const handleExportPng = async () => {
    if (!boardRef.current || isExporting) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(boardRef.current);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "tierlist.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
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
          <header className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Tier List
            </h1>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to reset? This cannot be undone.",
                    )
                  ) {
                    resetStore();
                  }
                }}
                className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleExportPng}
                disabled={isExporting}
                className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? "Exporting..." : "Export as PNG"}
              </button>
            </div>
          </header>

          <section
            ref={boardRef}
            className="overflow-hidden rounded-lg border border-white/10 bg-zinc-800/50"
          >
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
                  onRemoveItem={removeItem}
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
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition hover:bg-white/10"
                >
                  Add Image
                </button>
              </div>
            </div>

            <form
              onSubmit={handleTextSubmit}
              className="mb-3 flex items-center gap-2"
            >
              <input
                type="text"
                value={newTextItem}
                onChange={(e) => setNewTextItem(e.target.value)}
                placeholder="Add text item"
                className="w-full rounded-md border border-white/10 bg-zinc-800/40 px-3 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-white/20"
              />
              <button
                type="submit"
                className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition hover:bg-white/10"
              >
                Add
              </button>
            </form>

            {pasteMessage ? (
              <p className="mb-2 text-xs text-zinc-400">{pasteMessage}</p>
            ) : null}

            <SortableContext items={bankItemIds} strategy={rectSortingStrategy}>
              <DroppableContainer
                id="bank"
                className="flex min-h-32 flex-nowrap gap-3 overflow-x-auto rounded-lg border border-white/10 bg-zinc-800/40 p-3 sm:flex-wrap sm:overflow-x-visible"
              >
                {bankItemIds.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Upload images or add text items below to get started.
                  </p>
                ) : null}

                {bankItemIds.map((itemId) => {
                  const item = items[itemId];
                  if (!item) return null;
                  return (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onRemove={() => removeItem(item.id)}
                    />
                  );
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
