"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Icon } from "@/components/icon";

export type SortableItem = { id: string; label: string; content: ReactNode };
export type ReorderResult = { error?: string };

/**
 * A list reordered by native drag-and-drop or the ↑/↓ buttons (the keyboard
 * path, AC-28). Every change sends the full new order to `onReorder`; on error
 * the list snaps back and shows the message.
 */
export function SortableList({
  items,
  onReorder,
  label,
  className = "",
  itemClassName = "",
}: {
  items: SortableItem[];
  onReorder: (ids: string[]) => Promise<ReorderResult>;
  label: string;
  className?: string;
  itemClassName?: string;
}) {
  const serverOrder = items.map((i) => i.id).join("|");
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // Take the server's order again whenever it changes (after a save, add or delete).
  const [seenServerOrder, setSeenServerOrder] = useState(serverOrder);
  if (seenServerOrder !== serverOrder) {
    setSeenServerOrder(serverOrder);
    setOrder(serverOrder ? serverOrder.split("|") : []);
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const visible = order.filter((id) => byId.has(id));

  function commit(next: string[]) {
    if (next.join("|") === visible.join("|")) return;
    const previous = visible;
    setOrder(next);
    setError(undefined);
    startTransition(async () => {
      const result = await onReorder(next);
      if (result.error) {
        setOrder(previous);
        setError(result.error);
      }
    });
  }

  function move(id: string, to: number) {
    const next = visible.filter((x) => x !== id);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, id);
    commit(next);
  }

  return (
    <div className={className}>
      <ol aria-label={label} aria-busy={pending} className="flex flex-col">
        {visible.map((id, index) => {
          const item = byId.get(id)!;
          return (
            <li
              key={id}
              onDragOver={(e) => {
                if (!dragging) return; // not ours: let an outer list handle it
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                setOver(id);
              }}
              onDragLeave={() => setOver((o) => (o === id ? null : o))}
              onDrop={(e) => {
                if (!dragging) return;
                e.preventDefault();
                e.stopPropagation();
                if (dragging && dragging !== id) move(dragging, visible.indexOf(id));
                setDragging(null);
                setOver(null);
              }}
              onDragEnd={(e) => {
                e.stopPropagation();
                setDragging(null);
                setOver(null);
              }}
              className={`flex items-center gap-3 ${dragging === id ? "opacity-40" : ""} ${over === id && dragging !== id ? "shadow-[inset_0_2px_0_var(--color-accent)]" : ""} ${itemClassName}`}
            >
              {/* Only the handle drags, so text in inputs inside the row stays selectable. */}
              <span
                draggable
                onDragStart={(e) => {
                  e.stopPropagation(); // nested lists: only the innermost item drags
                  setDragging(id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", id);
                  const row = e.currentTarget.closest("li");
                  if (row) e.dataTransfer.setDragImage(row, 16, 16);
                }}
                className="cursor-grab text-dim active:cursor-grabbing"
                title="Drag to reorder"
                aria-hidden
              >
                <Icon name="grip-vertical" size={16} />
              </span>
              <div className="min-w-0 flex-1">{item.content}</div>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={index === 0 || pending}
                  onClick={() => move(id, index - 1)}
                  aria-label={`Move ${item.label} up`}
                  className="rounded px-1.5 font-mono text-xs text-muted hover:text-fg disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === visible.length - 1 || pending}
                  onClick={() => move(id, index + 1)}
                  aria-label={`Move ${item.label} down`}
                  className="rounded px-1.5 font-mono text-xs text-muted hover:text-fg disabled:opacity-30"
                >
                  ↓
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
