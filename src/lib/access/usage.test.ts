import { beforeAll, describe, expect, it } from "vitest";
import { migrateDb } from "@/db";
import { createGroup } from "@/lib/access";
import { groupUsage } from "@/lib/access/usage";
import { createBoard } from "@/lib/community/boards";
import { createCourse } from "@/lib/courses";
import { createEvent } from "@/lib/events";
import { createPlan } from "@/lib/plans";

beforeAll(() => migrateDb());

describe("group usage (AC-32)", () => {
  it("counts courses, boards and events per group and lists the plans that grant it", async () => {
    const pro = await createGroup("Pro usage");
    const solo = await createGroup("Solo usage");
    const unused = await createGroup("Unused usage");
    await createCourse({ title: "C1", groupIds: [pro.id] });
    await createCourse({ title: "C2", groupIds: [pro.id, solo.id] });
    await createBoard({ name: "B usage", groupIds: [pro.id] });
    await createEvent({
      title: "E",
      description: "",
      startsLocal: "2031-01-01T10:00",
      endsLocal: "",
      timezone: "UTC",
      zoomUrl: "https://zoom.us/j/1",
      groupIds: [pro.id],
    });
    await createPlan({ name: "Sprint", description: "", type: "one_off", stripePriceIds: ["price_u1"], groupIds: [pro.id], listed: true });
    await createPlan({ name: "Annual", description: "", type: "recurring", stripePriceIds: ["price_u2"], groupIds: [pro.id], listed: false });

    const usage = await groupUsage();
    expect(usage.get(pro.id)).toEqual({ courses: 2, boards: 1, events: 1, plans: ["Annual", "Sprint"] });
    expect(usage.get(solo.id)).toEqual({ courses: 1, boards: 0, events: 0, plans: [] });
    expect(usage.get(unused.id)).toEqual({ courses: 0, boards: 0, events: 0, plans: [] });
  });
});
