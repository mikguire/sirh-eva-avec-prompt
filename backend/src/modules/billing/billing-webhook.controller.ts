import { Controller, Headers, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Request } from "express";
import { Public } from "../../common/auth/public.decorator";
import { BillingWebhookService } from "./billing-webhook.service";

type RequestWithRawBody = Request & { rawBody?: Buffer };

@SkipThrottle()
@Controller("billing")
export class BillingWebhookController {
  constructor(private readonly billingWebhookService: BillingWebhookService) {}

  @Public()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(
    @Headers("stripe-signature") signature: string | undefined,
    @Req() request: RequestWithRawBody
  ): Promise<{ received: true }> {
    const rawBody = request.rawBody?.toString("utf8");
    return this.billingWebhookService.handleStripeWebhook(signature, rawBody);
  }
}
