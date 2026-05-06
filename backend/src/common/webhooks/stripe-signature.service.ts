import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";

@Injectable()
export class StripeSignatureService {
  verify(signatureHeader: string | undefined, rawBody: string): void {
    if (!signatureHeader) {
      throw new UnauthorizedException("Missing stripe-signature header");
    }

    const parts = signatureHeader.split(",").map((entry) => entry.trim());
    const timestamp = parts.find((part) => part.startsWith("t="))?.split("=")[1];
    const v1 = parts.find((part) => part.startsWith("v1="))?.split("=")[1];
    if (!timestamp || !v1) {
      throw new UnauthorizedException("Invalid stripe signature format");
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new UnauthorizedException("STRIPE_WEBHOOK_SECRET is not set");
    }

    const payload = `${timestamp}.${rawBody}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    const incomingBuffer = Buffer.from(v1, "hex");
    if (
      expectedBuffer.length !== incomingBuffer.length ||
      !timingSafeEqual(expectedBuffer, incomingBuffer)
    ) {
      throw new UnauthorizedException("Stripe signature mismatch");
    }
  }
}
