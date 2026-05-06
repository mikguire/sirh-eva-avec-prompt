import { Subscription } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BillingController } from "./billing.controller";

describe("BillingController", () => {
  it("returns current subscription scoped by tenant", async () => {
    const subscription = { id: "sub_1", tenantId: "tenant_1" } as Subscription;
    const prisma = {
      subscription: {
        findFirst: jest.fn().mockResolvedValue(subscription)
      }
    } as unknown as PrismaService;

    const controller = new BillingController(prisma);
    const out = await controller.getCurrentSubscription({ tenantId: "tenant_1", userId: "u1" });

    expect(out).toEqual(subscription);
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
      where: { tenantId: "tenant_1" },
      orderBy: { createdAt: "desc" }
    });
  });
});
