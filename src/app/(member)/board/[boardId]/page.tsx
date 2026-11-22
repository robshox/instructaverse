import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { PostCard } from "@/components/post-card";
import { canAccess } from "@/lib/access";
import { getBoard, listBoardsFor } from "@/lib/community/boards";
import { listComments } from "@/lib/community/comments";
import { likeSummary } from "@/lib/community/likes";
import { listPosts } from "@/lib/community/posts";
import { plansGranting } from "@/lib/courses";
import { getViewer } from "@/lib/session";
import { Composer } from "../composer";

export default function BoardPage({ params }: PageProps<"/board/[boardId]">) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <Board params={params} />
    </Suspense>
  );
}

async function Board({ params }: Pick<PageProps<"/board/[boardId]">, "params">) {
  const { boardId } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const board = await getBoard(boardId);
  if (!board) notFound();
  if (!(await canAccess(viewer, board.groupIds))) {
    return <NoAccess title={board.name} plans={await plansGranting(board.groupIds)} signedIn />;
  }
  const [posts, boards] = await Promise.all([listPosts(board.id), listBoardsFor(viewer)]);
  const comments = await listComments(posts.map((p) => p.id));
  const likes = await likeSummary(
    viewer.id,
    posts.map((p) => p.id),
    [...comments.values()].flat().map((c) => c.id),
  );

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="text-2xl font-semibold">{board.name}</h1>
        {boards.length > 1 ? (
          <nav className="flex gap-3 text-sm" aria-label="Boards">
            {boards
              .filter((b) => b.id !== board.id)
              .map((b) => (
                <Link key={b.id} href={`/board/${b.id}`} className="underline-offset-4 hover:underline">
                  {b.name}
                </Link>
              ))}
          </nav>
        ) : null}
      </div>
      <Composer boardId={board.id} />
      {posts.length === 0 ? <p className="text-sm text-zinc-500">No posts yet. Start the conversation.</p> : null}
      <ul className="flex flex-col gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} comments={comments.get(post.id) ?? []} viewer={{ id: viewer.id, role: viewer.role }} likes={likes} />
        ))}
      </ul>
    </main>
  );
}
