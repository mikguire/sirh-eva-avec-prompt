import { BillingWebhookController } from "./billing-webhook.controller";
import { BillingWebhookService } from "./billing-webhook.service";

describe("BillingWebhookController", () => {
  const billingWebhookService = {
    handleStripeWebhook: jest.fn()
  } as unknown as jest.Mocked<BillingWebhookService>;

  const controller = new BillingWebhookController(billingWebhookService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forwards stripe signature and utf8 body to service", async () => {
    billingWebhookService.handleStripeWebhook.mockResolvedValue({ received: true });

    const out = await controller.stripeWebhook("sig_1", {
      rawBody: Buffer.from(JSON.stringify({ id: "evt_1" }), "utf8")
    } as never);

    expect(out).toEqual({ received: true });
    expect(billingWebhookService.handleStripeWebhook).toHaveBeenCalledWith(
      "sig_1",
      JSON.stringify({ id: "evt_1" })
    );
  });

  it("passes undefined raw body when missing", async () => {
    billingWebhookService.handleStripeWebhook.mockResolvedValue({ received: true });

    await controller.stripeWebhook("sig_2", {} as never);

    expect(billingWebhookService.handleStripeWebhook).toHaveBeenCalledWith("sig_2", undefined);
  });
});
