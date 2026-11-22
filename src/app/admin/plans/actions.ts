"use server";

import { refresh } from "next/cache";
import { createPlan, deletePlan, PlanInputError, PlanInUseError, updatePlan, type PlanInput } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";

export type PlanFormState = { error?: string; ok?: number };

function fromForm(formData: FormData): PlanInput {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    type: String(formData.get("type") ?? "") as PlanInput["type"],
    stripePriceIds: String(formData.get("stripePriceIds") ?? "")
      .split(/[\s,]+/)
      .filter(Boolean),
    groupIds: formData.getAll("groupIds").map(String),
    listed: formData.get("listed") === "on",
  };
}

export async function savePlanAction(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  await requireAdmin();
  const id = formData.get("id");
  try {
    if (typeof id === "string" && id) await updatePlan(id, fromForm(formData));
    else await createPlan(fromForm(formData));
  } catch (e) {
    if (e instanceof PlanInputError) return { error: e.message };
    throw e;
  }
  refresh();
  return { ok: Date.now() };
}

export async function deletePlanAction(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  await requireAdmin();
  if (formData.get("confirm") !== "yes") return {};
  try {
    await deletePlan(String(formData.get("id")));
  } catch (e) {
    if (e instanceof PlanInUseError) return { error: e.message };
    throw e;
  }
  refresh();
  return { ok: Date.now() };
}
