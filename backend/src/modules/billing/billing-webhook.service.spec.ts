import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { StripeSignatureService } from "../../common/webhooks/stripe-signature.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BillingWebhookService } from "./billing-webhook.service";

describe("BillingWebhookService", () => {
  let prisma: {
    subscription: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let stripe: { verify: jest.Mock };
  let service: BillingWebhookService;

  beforeEach(() => {
    prisma = {
      subscription: { findFirst: jest.fn() },
      $transaction: jest.fn()
    };
    stripe = { verify: jest.fn() };
    service = new BillingWebhookService(
      prisma as unknown as PrismaService,
      stripe as unknown as StripeSignatureService
    );
  });

  it("throws when raw body is missing", async () => {
    await expect(service.handleStripeWebhook("sig", undefined)).rejects.toThrow(BadRequestException);
  });

  it("propagates stripe verification failure", async () => {
    stripe.verify.mockImplementation(() => {
      throw new UnauthorizedException("bad sig");
    });
    await expect(service.handleStripeWebhook("sig", "{}")).rejects.toThrow(UnauthorizedException);
  });

  it("returns early when event id is absent", async () => {
    stripe.verify.mockReturnValue(undefined);
    const out = await service.handleStripeWebhook("sig", "{}");
    expect(out).toEqual({ received: true });
    expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
  });

  it("throws on invalid JSON after verify", async () => {
    stripe.verify.mockReturnValue(undefined);
    await expect(service.handleStripeWebhook("sig", "not-json")).rejects.toThrow(BadRequestException);
  });

  it("updates subscription in a transaction for subscription.updated", async () => {
    stripe.verify.mockReturnValue(undefined);
    const raw = JSON.stringify({
      id: "evt_unit_1",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_x",
          status: "active",
          current_period_start: 1700000000,
          current_period_end: 1702592000
        }
      }
    });

    prisma.subscription.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "subrow",
        tenantId: "ten_1",
        planId: "p1",
        status: "TRIALING",
        provider: "stripe",
        providerCustomerId: "cus",
        providerSubscriptionId: "sub_x",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastWebhookEventId: null
      });

    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
        subscription: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }
      };
      return fn(tx);
    });

    const out = await service.handleStripeWebhook("sig", raw);
    expect(out).toEqual({ received: true });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
