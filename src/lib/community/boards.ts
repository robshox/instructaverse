import { asc, count, eq, inArray, max } from "drizzle-orm";
import { db } from "@/db";
import { boardGroups, boards, posts } from "@/db/schema";
import { canAccess, type Viewer } from "@/lib/access";

export type Board = typeof boards.$inferSelect & { groupIds: string[] };

export class BoardInputError extends Error {}

export async function createBoard(input: { name: string; groupIds: string[] }): Promise<{ id: string }> {
  const name = input.name.trim();
  if (!name) throw new BoardInputError("Enter a board name");
  const id = crypto.randomUUID();
  const [{ last } = { last: null }] = await db.select({ last: max(boards.position) }).from(boards);
  db.transaction((tx) => {
    tx.insert(boards).values({ id, name, position: (last ?? -1) + 1 }).run();
    if (input.groupIds.length) tx.insert(boardGroups).values(input.groupIds.map((groupId) => ({ boardId: id, groupId }))).run();
  });
  return { id };
}

export async function updateBoard(id: string, input: { name: string; groupIds: string[] }) {
  const name = input.name.trim();
  if (!name) throw new BoardInputError("Enter a board name");
  db.transaction((tx) => {
    tx.update(boards).set({ name }).where(eq(boards.id, id)).run();
    tx.delete(boardGroups).where(eq(boardGroups.boardId, id)).run();
    const groupIds = [...new Set(input.groupIds)];
    if (groupIds.length) tx.insert(boardGroups).values(groupIds.map((groupId) => ({ boardId: id, groupId }))).run();
  });
}

export async function deleteBoard(id: string) {
  await db.delete(boards).where(eq(boards.id, id));
}

/** FR-5.1: a "General" board exists from the start (admins only until groups are added). */
export async function ensureDefaultBoard() {
  if ((await db.$count(boards)) === 0) await createBoard({ name: "General", groupIds: [] });
}

async function withGroups(rows: (typeof boards.$inferSelect)[]): Promise<Board[]> {
  if (!rows.length) return [];
  const links = await db
    .select()
    .from(boardGroups)
    .where(inArray(boardGroups.boardId, rows.map((r) => r.id)));
  return rows.map((r) => ({ ...r, groupIds: links.filter((l) => l.boardId === r.id).map((l) => l.groupId) }));
}

export async function getBoard(id: string): Promise<Board | null> {
  return (await withGroups(await db.select().from(boards).where(eq(boards.id, id))))[0] ?? null;
}

export async function listBoards(): Promise<Board[]> {
  return withGroups(await db.select().from(boards).orderBy(asc(boards.position), asc(boards.name)));
}

export async function listBoardsFor(viewer: Viewer): Promise<Board[]> {
  const all = await listBoards();
  const visible = await Promise.all(all.map((b) => canAccess(viewer, b.groupIds)));
  return all.filter((_, i) => visible[i]);
}

/** AC-18: the boards this viewer can see, in board order, each with its post count. */
export async function boardsWithCounts(viewer: Viewer): Promise<(Board & { postCount: number })[]> {
  const visible = await listBoardsFor(viewer);
  if (!visible.length) return [];
  const counts = await db
    .select({ boardId: posts.boardId, n: count() })
    .from(posts)
    .where(inArray(posts.boardId, visible.map((b) => b.id)))
    .groupBy(posts.boardId);
  const byBoard = new Map(counts.map((c) => [c.boardId, c.n]));
  return visible.map((b) => ({ ...b, postCount: byBoard.get(b.id) ?? 0 }));
}
