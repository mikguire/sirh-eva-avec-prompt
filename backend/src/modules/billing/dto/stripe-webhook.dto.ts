export interface StripeWebhookEventDto {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      customer?: string;
      subscription?: string;
      status?: string;
      current_period_start?: number;
      current_period_end?: number;
    };
  };
}
