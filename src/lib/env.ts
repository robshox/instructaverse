import { z } from "zod";

/** Empty strings count as missing, so `FOO=` in an env file fails loudly. */
const required = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string({ error: "is required" }),
);
const optional = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const schema = z.object({
  BASE_URL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.url({ error: (i) => (i.input === undefined ? "is required" : "must be a valid URL") }),
  ),
  AUTH_SECRET: required.pipe(z.string().min(32, "must be at least 32 characters")),
  DATA_DIR: optional.transform((v) => v ?? "/data"),

  STRIPE_SECRET_KEY: required,
  STRIPE_WEBHOOK_SECRET: required,

  MUX_TOKEN_ID: required,
  MUX_TOKEN_SECRET: required,
  MUX_SIGNING_KEY_ID: required,
  MUX_SIGNING_PRIVATE_KEY: required,
  MUX_WEBHOOK_SECRET: required,

  SMTP_HOST: required,
  SMTP_PORT: z.preprocess(
    (v) => (v === "" || v === undefined ? 587 : v),
    z.coerce.number().int().positive(),
  ),
  SMTP_USER: optional,
  SMTP_PASS: optional,
  SMTP_FROM: required,
});

export type Env = z.infer<typeof schema>;

/** Thrown when configuration is missing or invalid. Lists variable names, never values. */
export class EnvError extends Error {
  constructor(
    readonly variables: string[],
    details: string[],
  ) {
    super(`Invalid environment configuration:\n${details.map((d) => `  - ${d}`).join("\n")}`);
    this.name = "EnvError";
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (result.success) return result.data;

  const byVar = new Map<string, string>();
  for (const issue of result.error.issues) {
    const name = String(issue.path[0]);
    if (!byVar.has(name)) byVar.set(name, `${name} ${issue.message}`);
  }
  throw new EnvError([...byVar.keys()], [...byVar.values()]);
}

let cached: Env | undefined;

/** Validated process env, parsed once. Throws EnvError naming any bad variables. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
