import { exportPKCS8, generateKeyPair, jwtVerify } from "jose";
import { describe, expect, test } from "vitest";
import { issueTradeMessageRealtimeToken } from "./tradeMessageRealtimeToken";

describe("issueTradeMessageRealtimeToken", () => {
  test("issues a five-minute authenticated token scoped to the signed-in user", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256", {
      extractable: true,
    });
    const token = await issueTradeMessageRealtimeToken({
      userId: "11111111-1111-4111-8111-111111111111",
      privateKeyPem: await exportPKCS8(privateKey),
      keyId: "trade-messages-2026-09",
      issuer: "https://osutrade.com",
      now: new Date("2026-09-09T12:00:00.000Z"),
    });

    const verified = await jwtVerify(token, publicKey, {
      issuer: "https://osutrade.com",
      audience: "authenticated",
      currentDate: new Date("2026-09-09T12:01:00.000Z"),
    });

    expect(verified.payload).toMatchObject({
      sub: "11111111-1111-4111-8111-111111111111",
      role: "authenticated",
      iat: 1788955200,
      exp: 1788955500,
    });
    expect(verified.protectedHeader).toMatchObject({
      alg: "RS256",
      kid: "trade-messages-2026-09",
    });
  });
});
