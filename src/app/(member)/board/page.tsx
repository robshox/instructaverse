import { redirect } from "next/navigation";
import { Suspense } from "react";
import { listBoardsFor } from "@/lib/community/boards";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Board" };

/** Opens the first board the member can see. */
export default function BoardIndex() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <FirstBoard />
    </Suspense>
  );
}

async function FirstBoard() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const [first] = await listBoardsFor(viewer);
  if (first) redirect(`/board/${first.id}`);
  return <p className="text-muted">There&rsquo;s no board for you yet.</p>;
}
