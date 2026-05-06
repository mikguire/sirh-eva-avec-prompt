import { Module } from "@nestjs/common";
import { StripeSignatureService } from "../../common/webhooks/stripe-signature.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BillingController } from "./billing.controller";
import { BillingWebhookController } from "./billing-webhook.controller";
import { BillingWebhookService } from "./billing-webhook.service";

@Module({
  controllers: [BillingController, BillingWebhookController],
  providers: [PrismaService, StripeSignatureService, BillingWebhookService]
})
export class BillingModule {}
