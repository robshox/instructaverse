import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { PostCard } from "@/components/post-card";
import { Card, Eyebrow } from "@/components/ui";
import { canAccess } from "@/lib/access";
import { boardsWithCounts, getBoard } from "@/lib/community/boards";
import { listComments } from "@/lib/community/comments";
import { likeSummary } from "@/lib/community/likes";
import { listPosts } from "@/lib/community/posts";
import { plansGranting } from "@/lib/courses";
import { getViewer } from "@/lib/session";
import { Composer } from "../composer";

export default function BoardPage({ params }: PageProps<"/board/[boardId]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <Board params={params} />
    </Suspense>
  );
}

/** Board (FR-6, AC-18, AC-19). */
async function Board({ params }: Pick<PageProps<"/board/[boardId]">, "params">) {
  const { boardId } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const board = await getBoard(boardId);
  if (!board) notFound();
  if (!(await canAccess(viewer, board.groupIds))) {
    return <NoAccess title={board.name} plans={await plansGranting(board.groupIds)} signedIn />;
  }
  const [posts, boards] = await Promise.all([listPosts(board.id), boardsWithCounts(viewer)]);
  const comments = await listComments(posts.map((p) => p.id));
  const likes = await likeSummary(
    viewer.id,
    posts.map((p) => p.id),
    [...comments.values()].flat().map((c) => c.id),
  );

  return (
    <main className="grid items-start gap-10 lg:grid-cols-[1fr_300px]">
      <div className="flex min-w-0 flex-col gap-5">
        <div>
          <Eyebrow>
            Community <b className="font-normal text-accent">·</b> Board
          </Eyebrow>
          <h1 className="mt-3 text-[44px] leading-[1.05] font-medium tracking-[-.04em]">{board.name}</h1>
        </div>
        <Composer boardId={board.id} />
        {posts.length === 0 ? (
          <Card className="p-6 text-muted">No posts yet. Start the conversation.</Card>
        ) : (
          <ul className="flex flex-col gap-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} comments={comments.get(post.id) ?? []} viewer={{ id: viewer.id, role: viewer.role }} likes={likes} />
            ))}
          </ul>
        )}
      </div>

      <aside className="lg:mt-[86px]">
        <Card className="p-2.5">
          <p className="px-3.5 py-2 font-mono text-xs uppercase tracking-[.04em] text-muted">Boards</p>
          <nav aria-label="Boards" className="flex flex-col">
            {boards.map((b) => {
              const current = b.id === board.id;
              return (
                <Link
                  key={b.id}
                  href={`/board/${b.id}`}
                  aria-current={current ? "page" : undefined}
                  className={`flex justify-between gap-3 rounded-md px-3.5 py-[9px] text-sm ${
                    current ? "bg-raised text-fg shadow-[inset_2px_0_0_var(--color-accent)]" : "text-muted hover:bg-raised hover:text-fg"
                  }`}
                >
                  <span>{b.name}</span>
                  <span className="font-mono text-xs text-dim">
                    {b.postCount}
                    <span className="sr-only"> {b.postCount === 1 ? "post" : "posts"}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </Card>
      </aside>
    </main>
  );
}
