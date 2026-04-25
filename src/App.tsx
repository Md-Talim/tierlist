import type { DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import SortableItem from "./components/SortableItem";
import useTierStore from "./store/useTierStore";

type ContainerId = string | "bank";

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

function App() {
  const tiers = useTierStore((state) => state.tiers);
  const items = useTierStore((state) => state.items);
  const bankItemIds = useTierStore((state) => state.bankItemIds);
  const addItem = useTierStore((state) => state.addItem);
  const moveItem = useTierStore((state) => state.moveItem);

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const handleAddTestItem = () => {
    const id = `test-${crypto.randomUUID()}`;
    addItem({
      id,
      type: "text",
      content: "Test",
    });
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

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
            {tiers.map((tier, idx) => (
              <div
                key={tier.id}
                className={`flex min-h-28 ${
                  idx !== tiers.length - 1 ? "border-b border-white/10" : ""
                }`}
              >
                <div
                  className="flex w-15 items-center justify-center text-lg font-bold text-zinc-900"
                  style={{ backgroundColor: tier.color }}
                >
                  {tier.label}
                </div>

                <SortableContext
                  items={tier.itemIds}
                  strategy={rectSortingStrategy}
                >
                  <DroppableContainer
                    id={tier.id}
                    className="flex flex-1 flex-wrap content-center gap-3 p-3"
                  >
                    {tier.itemIds.map((itemId) => {
                      const item = items[itemId];
                      if (!item) return null;
                      return <SortableItem key={item.id} item={item} />;
                    })}
                  </DroppableContainer>
                </SortableContext>
              </div>
            ))}
          </section>

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
