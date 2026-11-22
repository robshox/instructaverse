import Link from "next/link";
import type { Plan } from "@/lib/plans";

/** Shown in place of gated content (AC-16): the plans that would grant access, or a note that it's private. */
export function NoAccess({ title, plans, signedIn }: { title: string; plans: Plan[]; signedIn: boolean }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h1 className="text-xl font-semibold">{title} is for members</h1>
      {plans.length ? (
        <>
          <p className="text-zinc-600 dark:text-zinc-400">Join with one of these plans to get access:</p>
          <ul className="flex flex-col gap-2">
            {plans.map((p) => (
              <li key={p.id} className="font-medium">
                {p.name}
              </li>
            ))}
          </ul>
          <Link href="/pricing" className="self-start rounded-md bg-zinc-900 px-4 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
            See plans
          </Link>
        </>
      ) : (
        <p className="text-zinc-600 dark:text-zinc-400">This isn&rsquo;t open to members yet.</p>
      )}
      {!signedIn ? (
        <p className="text-sm">
          Already a member?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      ) : null}
    </section>
  );
}
