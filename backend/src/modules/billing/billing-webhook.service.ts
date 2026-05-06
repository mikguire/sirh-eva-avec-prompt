import { BadRequestException, Injectable } from "@nestjs/common";
import { SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { StripeSignatureService } from "../../common/webhooks/stripe-signature.service";

type StripeSubscriptionPayload = {
  id?: string;
  subscription?: string;
  status?: string;
  current_period_start?: number;
  current_period_end?: number;
};

type StripeEventPayload = {
  id?: string;
  type?: string;
  data?: { object?: StripeSubscriptionPayload };
};

@Injectable()
export class BillingWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeSignatureService: StripeSignatureService
  ) {}

  async handleStripeWebhook(
    signatureHeader: string | undefined,
    rawBody: string | undefined
  ): Promise<{ received: true }> {
    if (!rawBody) {
      throw new BadRequestException("Missing raw webhook body");
    }

    this.stripeSignatureService.verify(signatureHeader, rawBody);

    let parsedEvent: StripeEventPayload;
    try {
      parsedEvent = JSON.parse(rawBody) as StripeEventPayload;
    } catch {
      throw new BadRequestException("Invalid JSON webhook body");
    }

    if (!parsedEvent?.id) {
      return { received: true };
    }

    const duplicate = await this.prisma.subscription.findFirst({
      where: { lastWebhookEventId: parsedEvent.id }
    });
    if (duplicate) {
      return { received: true };
    }

    if (parsedEvent.type !== "customer.subscription.updated") {
      return { received: true };
    }

    const obj = parsedEvent.data?.object;
    const stripeSubscriptionId =
      typeof obj?.id === "string"
        ? obj.id
        : typeof obj?.subscription === "string"
          ? obj.subscription
          : undefined;

    if (!stripeSubscriptionId) {
      return { received: true };
    }

    const current = await this.prisma.subscription.findFirst({
      where: { providerSubscriptionId: stripeSubscriptionId }
    });
    if (!current) {
      return { received: true };
    }

    const statusRaw = typeof obj?.status === "string" ? obj.status : "";
    const mappedStatus = this.mapStripeStatus(statusRaw);

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant', $1, true)`,
        current.tenantId
      );
      const periodStart = obj?.current_period_start;
      const periodEnd = obj?.current_period_end;
      await tx.subscription.updateMany({
        where: {
          tenantId: current.tenantId,
          providerSubscriptionId: stripeSubscriptionId
        },
        data: {
          status: mappedStatus,
          currentPeriodStart: new Date((periodStart ?? 0) * 1000),
          currentPeriodEnd: new Date((periodEnd ?? 0) * 1000),
          lastWebhookEventId: parsedEvent.id
        }
      });
    });

    return { received: true };
  }

  private mapStripeStatus(status: string): SubscriptionStatus {
    if (status === "active") {
      return SubscriptionStatus.ACTIVE;
    }
    if (status === "trialing") {
      return SubscriptionStatus.TRIALING;
    }
    if (status === "canceled" || status === "cancelled") {
      return SubscriptionStatus.CANCELED;
    }
    return SubscriptionStatus.PAST_DUE;
  }
}
