export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmail = (input: SendEmailInput) => Promise<void>;

export const emailFrom = process.env.EMAIL_FROM || "OSUTrade <no-reply@osutrade.local>";

export async function sendEmail(input: SendEmailInput) {
  if (!input.to) return;

  const provider = process.env.EMAIL_PROVIDER || "console";

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend email failed: ${response.status} ${body}`);
    }

    return;
  }

  console.info("Email notification skipped; configure EMAIL_PROVIDER=resend.", {
    to: input.to,
    subject: input.subject,
  });
}
