import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Markdown } from "@/components/markdown";
import { NoAccess } from "@/components/no-access";
import { canAccess } from "@/lib/access";
import { getBoard, listBoardsFor } from "@/lib/community/boards";
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

const when = (d: Date) => d.toLocaleString("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

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
          <li key={post.id} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{post.author.name}</span>
              <span className="text-zinc-500">{when(post.createdAt)}</span>
              {post.pinned ? <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-900">Pinned</span> : null}
            </div>
            <Markdown>{post.bodyMd}</Markdown>
            {post.images.length ? (
              <div className={`grid gap-2 ${post.images.length > 1 ? "grid-cols-2" : ""}`}>
                {post.images.map((img) => (
                  // Served through the access-checked /media route, so next/image's optimiser isn't used.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={img.id} src={`/media/${img.path}`} alt="" loading="lazy" className="max-h-96 w-full rounded-md object-cover" />
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
