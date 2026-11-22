import Link from "next/link";

/** Normally unreachable: the proxy redirects / to /courses or /pricing. */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <div className="flex gap-4">
        <Link href="/pricing" className="underline">
          See plans
        </Link>
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </div>
    </main>
  );
}
