import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TierItem = {
  id: string;
  type: "text" | "image";
  content: string;
};

type SortableItemProps = {
  item: TierItem;
  onRemove: (itemId: string) => void;
};

function SortableItem({ item, onRemove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: item.id,
      data: {
        type: "item",
      },
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div {...attributes} {...listeners}>
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-700/80 sm:h-20 sm:w-20">
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
      </div>

      <button
        type="button"
        aria-label="Remove item"
        title="Remove item"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(item.id);
        }}
        className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs leading-none text-zinc-100 opacity-0 transition hover:bg-black/85 group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

export default SortableItem;
