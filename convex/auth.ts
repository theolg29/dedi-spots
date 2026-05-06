import Google from "@auth/core/providers/google";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const FROM = "Spots <noreply@mail.theolegourrierec.fr>";

async function sendResendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[auth] RESEND_API_KEY not set — skipping email");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error("[auth] Resend error:", await res.text());
  }
}

function otpHtml(code: string, title: string, body: string): string {
  return `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#F8F7F2;border-radius:16px;">
    <h1 style="font-size:24px;color:#1A1A1A;margin-bottom:8px;">${title}</h1>
    <p style="color:#4A4A4A;font-size:15px;line-height:1.6;margin-bottom:24px;">${body}</p>
    <div style="text-align:center;background:#fff;border:1px solid #E8E6E1;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="font-size:40px;font-weight:700;letter-spacing:10px;color:#1A1A1A;margin:0;">${code}</p>
      <p style="color:#8A8A8A;font-size:12px;margin:10px 0 0;">Expire dans 10 minutes</p>
    </div>
    <p style="color:#8A8A8A;font-size:12px;margin:0;">Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
  </div>`;
}

function makeOtpProvider(
  id: string,
  subject: string,
  title: string,
  body: string,
) {
  return Email({
    id,
    name: id,
    maxAge: 60 * 10,
    generateVerificationToken: async () =>
      Math.floor(100000 + Math.random() * 900000).toString(),
    sendVerificationRequest: async ({
      identifier: email,
      token,
    }: {
      identifier: string;
      token: string;
      [k: string]: any;
    }) => {
      await sendResendEmail(email, subject, otpHtml(token, title, body));
    },
  });
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          name: params.name as string,
        };
      },
      verify: makeOtpProvider(
        "resend-verify",
        "Confirme ton adresse email — Spots",
        "Confirme ton email",
        "Entre ce code dans l'application pour finaliser la création de ton compte.",
      ),
      reset: makeOtpProvider(
        "resend-reset",
        "Réinitialise ton mot de passe — Spots",
        "Réinitialisation du mot de passe",
        "Entre ce code dans l'application pour choisir un nouveau mot de passe.",
      ),
    }),
    Google,
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      if (redirectTo.startsWith("spots://")) return redirectTo;
      const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");
      if (redirectTo.startsWith("/") || redirectTo.startsWith("?")) {
        return siteUrl + redirectTo;
      }
      return redirectTo;
    },
  },
});
