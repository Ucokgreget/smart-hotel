import { env } from "../env"
import { MockGateway, type PaymentGateway } from "./payment-gateway"
import { QrisGateway } from "./qris-gateway"

/**
 * Chooses the adapter from PAYMENT_GATEWAY_MODE.
 *
 * Kept in its own module because it needs both adapters, and payment-gateway.ts
 * is imported by qris-gateway.ts. Putting the registry there would close an
 * import cycle.
 */
let gateway: PaymentGateway

export function initGateway(mode: string): PaymentGateway {
  switch (mode) {
    case "mock":
      gateway = new MockGateway(env.webhookSecret)
      return gateway

    case "qris": {
      // env.ts already refuses to boot in qris mode without these two.
      const staticQris = env.qrisStaticCode
      const publicBaseUrl = env.publicBaseUrl
      if (!staticQris || !publicBaseUrl) {
        throw new Error("qris mode needs QRIS_STATIC_CODE and PUBLIC_BASE_URL")
      }
      gateway = new QrisGateway(staticQris, publicBaseUrl, env.webhookSecret)
      return gateway
    }

    default:
      throw new Error(`PAYMENT_GATEWAY_MODE "${mode}" belum didukung. Pilihan: mock, qris.`)
  }
}

export function getGateway(): PaymentGateway {
  if (!gateway) throw new Error("Gateway belum diinisialisasi.")
  return gateway
}

/** Test seam: swaps the active adapter. */
export function setGateway(next: PaymentGateway): void {
  gateway = next
}
