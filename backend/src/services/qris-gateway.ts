import { convertQRIS, parseQRIS, validateQRIS } from "qris-dinamis/src/core/index"

import { env } from "../env"
import { badGateway } from "../lib/errors"
import {
  signCallbackBody,
  verifyCallbackSignature,
  type GatewayTransactionInput,
  type GatewayTransactionResult,
  type PaymentGateway,
} from "./payment-gateway"

/**
 * Real gateway adapter backed by the qris-dinamis library.
 *
 * The hotel owns one static QRIS string. Each payment converts it into a dynamic
 * QRIS carrying that reservation's exact total, so the guest scans and pays the
 * right amount instead of typing one in.
 *
 * What this adapter CANNOT do: tell anyone the payment succeeded. Producing a
 * payload is a request for payment, not a confirmation. The QRIS standard has no
 * push and no webhook, so nothing here will ever turn a payment PAID.
 * Confirmation comes from reconciliation, see modules/payment-reconcile.ts.
 */
export class QrisGateway implements PaymentGateway {
  constructor(
    private readonly staticQris: string,
    private readonly publicBaseUrl: string,
    private readonly webhookSecret: string
  ) {
    // Fail at construction rather than on the first guest payment.
    const check = validateQRIS(staticQris)
    if (!check.valid) {
      throw new Error(
        `QRIS_STATIC_CODE is not a valid QRIS string: ${check.errors.join("; ")}`
      )
    }
  }

  async createTransaction(input: GatewayTransactionInput): Promise<GatewayTransactionResult> {
    // Payment ids are derived from the transaction id, the same rule the mock
    // gateway uses, so TRX001 always becomes PAY001.
    const paymentId = `PAY${input.transactionId.replace(/^TRX/, "")}`

    const payload = buildDynamicQris(this.staticQris, input.amount)

    // Never hand out a code that would fail in a guest's banking app.
    const check = validateQRIS(payload)
    if (!check.valid) {
      throw badGateway(`Generated QRIS failed validation: ${check.errors.join("; ")}`)
    }

    return {
      paymentId,
      paymentUrl: `${this.publicBaseUrl.replace(/\/+$/, "")}/pay/${paymentId}`,
      status: "PENDING",
    }
  }

  verifySignature(rawBody: string, signature: string | undefined): boolean {
    return verifyCallbackSignature(rawBody, this.webhookSecret, signature)
  }

  /** Builds the payload the guest scans for a given stored amount. */
  payloadFor(amount: number): string {
    return buildDynamicQris(this.staticQris, amount)
  }

  /** Amount encoded in a payload, or null when the payload is not dynamic. */
  amountIn(payload: string): number | null {
    const amount = parseQRIS(payload).amount
    return amount === undefined ? null : Number(amount)
  }

  /** Merchant identity read out of the static code, for the pay screen. */
  merchantInfo() {
    const parsed = parseQRIS(this.staticQris)
    return {
      merchantName: parsed.merchantName,
      merchantCity: parsed.merchantCity,
      currency: parsed.currency,
      provider: parsed.merchantAccountInfo[0]?.globallyUniqueId ?? null,
    }
  }
}

/**
 * Single place where a static code becomes a dynamic one. Used by the gateway
 * adapter and by the guest facing pay endpoint, so the two can never drift.
 */
export function buildDynamicQris(staticQris: string, amount: number): string {
  return convertQRIS(staticQris, { amount })
}

export function qrisGatewayFromEnv(): QrisGateway {
  if (!env.qrisStaticCode || !env.publicBaseUrl) {
    throw new Error("qris gateway needs QRIS_STATIC_CODE and PUBLIC_BASE_URL")
  }

  return new QrisGateway(env.qrisStaticCode, env.publicBaseUrl, env.webhookSecret)
}

export { signCallbackBody }
