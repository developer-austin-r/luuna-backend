/**
 * Typed interfaces for the Meta WhatsApp Cloud API webhook payload.
 *
 * Reference:
 *  https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 *
 * These are NOT class-validator DTOs — they describe the *incoming* raw JSON
 * that Meta posts to the webhook, which we validate manually in the service.
 */

export interface MetaWebhookPayload {
  object: string; // Always "whatsapp_business_account"
  entry: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id: string; // WABA ID
  changes: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  field: string; // e.g. "messages"
  value: MetaWebhookChangeValue;
}

export interface MetaWebhookChangeValue {
  messaging_product: string; // "whatsapp"
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: MetaContact[];
  messages?: MetaIncomingMessage[];
  statuses?: MetaMessageStatus[];
  errors?: MetaError[];
}

export interface MetaContact {
  profile: { name: string };
  wa_id: string;
}

export interface MetaIncomingMessage {
  from: string; // sender phone number (international, no +)
  id: string; // wamid
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'location' | 'contacts' | 'interactive' | 'button' | 'order' | 'unknown';
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  document?: { id: string; filename?: string; mime_type: string; sha256: string };
  audio?: { id: string; mime_type: string };
  sticker?: { id: string; animated: boolean; mime_type: string; sha256: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  interactive?: { type: string; [key: string]: unknown };
  button?: { payload: string; text: string };
  context?: { from: string; id: string };
}

export interface MetaMessageStatus {
  id: string; // wamid
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin?: { type: string };
  };
  pricing?: { billable: boolean; pricing_model: string; category: string };
  errors?: MetaError[];
}

export interface MetaError {
  code: number;
  title: string;
  message?: string;
  error_data?: { details: string };
}

/** Status priority for preventing out-of-order downgrades. */
export const STATUS_PRIORITY: Record<string, number> = {
  PENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4,
};

/** Map Meta's lowercase status strings to our enum values. */
export const META_STATUS_MAP: Record<string, string> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
};
