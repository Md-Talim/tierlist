import useTierStore from "./store/useTierStore";

type TierItem = {
  id: string;
  type: "text" | "image";
  content: string;
};

function ItemCard({ item }: { item: TierItem }) {
  return (
    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-700/80">
      {item.type === "image" ? (
        <img
          src={item.content}
          alt="placeholder"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs font-medium text-zinc-100">
          {item.content}
        </div>
      )}
    </div>
  );
}

function App() {
  const tiers = useTierStore((state) => state.tiers);
  const items = useTierStore((state) => state.items);
  const bankItemIds = useTierStore((state) => state.bankItemIds);
  const addItem = useTierStore((state) => state.addItem);

  const handleAddTestItem = () => {
    const id = `test-${crypto.randomUUID()}`;
    addItem({
      id,
      type: "text",
      content: "Test",
    });
  };

  return (
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

              <div className="flex flex-1 flex-wrap content-center gap-3 p-3">
                {tier.itemIds.map((itemId) => {
                  const item = items[itemId];
                  if (!item) return null;
                  return <ItemCard key={item.id} item={item} />;
                })}
              </div>
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

          <div className="flex min-h-32 flex-wrap gap-3 rounded-lg border border-white/10 bg-zinc-800/40 p-3">
            {bankItemIds.map((itemId) => {
              const item = items[itemId];
              if (!item) return null;
              return <ItemCard key={item.id} item={item} />;
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
