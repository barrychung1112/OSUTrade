import { importPKCS8, SignJWT } from "jose";

const tokenLifetimeSeconds = 5 * 60;

export async function issueTradeMessageRealtimeToken({
  userId,
  privateKeyPem,
  keyId,
  issuer,
  now = new Date(),
}: {
  userId: string;
  privateKeyPem: string;
  keyId: string;
  issuer: string;
  now?: Date;
}) {
  const privateKey = await importPKCS8(privateKeyPem.replace(/\\n/g, "\n"), "RS256");
  const issuedAt = Math.floor(now.getTime() / 1000);

  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "RS256", kid: keyId })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience("authenticated")
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + tokenLifetimeSeconds)
    .sign(privateKey);
}
