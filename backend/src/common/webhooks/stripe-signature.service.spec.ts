import { createHmac } from "crypto";
import { UnauthorizedException } from "@nestjs/common";
import { StripeSignatureService } from "./stripe-signature.service";

function buildStripeSignatureHeader(secret: string, rawBody: string, timestamp = "1234567890"): string {
  const payload = `${timestamp}.${rawBody}`;
  const v1 = createHmac("sha256", secret).update(payload).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

describe("StripeSignatureService", () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  });

  it("accepts a valid Stripe-style signature", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret_minimum_32_chars__";
    const rawBody = '{"id":"evt_1","type":"ping"}';
    const service = new StripeSignatureService();
    const header = buildStripeSignatureHeader(process.env.STRIPE_WEBHOOK_SECRET, rawBody);
    expect(() => service.verify(header, rawBody)).not.toThrow();
  });

  it("rejects missing header", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret_minimum_32_chars__";
    const service = new StripeSignatureService();
    expect(() => service.verify(undefined, "{}")).toThrow(UnauthorizedException);
  });

  it("rejects invalid signature", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret_minimum_32_chars__";
    const service = new StripeSignatureService();
    expect(() => service.verify("t=1,v1=deadbeef", "{}")).toThrow(UnauthorizedException);
  });
});
