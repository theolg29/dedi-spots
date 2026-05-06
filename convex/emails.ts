"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const FROM = "Spots <noreply@mail.theolegourrierec.fr>";

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error: ${text}`);
  }
}

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spots</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F1;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr><td style="background:#4A7C59;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
          <p style="margin:0 0 6px;font-size:36px;line-height:1;">🌿</p>
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:4px;text-transform:uppercase;">SPOTS</p>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:1px;">Découvrir · Partager · Explorer</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px 32px 28px;border-radius:0 0 16px 16px;box-shadow:0 4px 32px rgba(0,0,0,0.06);">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 0;text-align:center;">
          <p style="margin:0;color:#9A9A9A;font-size:11px;">© 2025 Spots · Tous droits réservés</p>
          <p style="margin:4px 0 0;color:#bbb;font-size:11px;">Tu reçois cet email car tu as un compte Spots.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function otpBlock(code: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:#FEF4F1;border:2px solid #F4845F;border-radius:14px;padding:28px;text-align:center;">
      <p style="margin:0;font-size:46px;font-weight:700;letter-spacing:14px;color:#1A1A1A;font-family:'Courier New',monospace;">${code}</p>
      <p style="margin:10px 0 0;color:#F4845F;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Expire dans 10 minutes</p>
    </td></tr>
  </table>`;
}

export const sendWelcomeEmail = internalAction({
  args: { email: v.string(), name: v.string() },
  handler: async (_ctx, { email, name }) => {
    const firstName = name.split(" ")[0] ?? name;
    await sendEmail(
      email,
      `Bienvenue sur Spots, ${firstName} ! 🌿`,
      layout(`
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#111;">
          Bienvenue, ${firstName} ! 🎉
        </h1>
        <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.7;">
          Ton compte <strong style="color:#4A7C59;">Spots</strong> est prêt.
          Tu peux maintenant découvrir et partager les lieux les plus remarquables autour de toi.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr><td style="background:#EEF4F0;border-left:3px solid #4A7C59;border-radius:0 12px 12px 0;padding:18px 20px;">
            <p style="margin:0 0 10px;color:#4A7C59;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Par où commencer ?</p>
            <p style="margin:0 0 6px;color:#333;font-size:14px;line-height:1.6;">📍 &nbsp;Explore les spots près de chez toi</p>
            <p style="margin:0 0 6px;color:#333;font-size:14px;line-height:1.6;">📸 &nbsp;Ajoute ta première crique ou ton panorama</p>
            <p style="margin:0;color:#333;font-size:14px;line-height:1.6;">⭐ &nbsp;Visite un spot pour laisser un avis authentique</p>
          </td></tr>
        </table>

        <p style="margin:0;color:#aaa;font-size:12px;line-height:1.6;">
          Seuls les utilisateurs présents physiquement sur place peuvent noter un spot — c'est ça, l'authenticité Spots.
        </p>
      `),
    );
  },
});

export const sendVerificationEmail = internalAction({
  args: { email: v.string(), code: v.string() },
  handler: async (_ctx, { email, code }) => {
    await sendEmail(
      email,
      "Confirme ton adresse email — Spots",
      layout(`
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#111;">
          Confirme ton adresse email
        </h1>
        <p style="margin:0 0 4px;color:#555;font-size:15px;line-height:1.7;">
          Entre ce code dans l'application pour finaliser la création de ton compte.
        </p>
        ${otpBlock(code)}
        <p style="margin:0;color:#aaa;font-size:12px;">
          Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email en toute sécurité.
        </p>
      `),
    );
  },
});

export const sendPasswordResetEmail = internalAction({
  args: { email: v.string(), code: v.string() },
  handler: async (_ctx, { email, code }) => {
    await sendEmail(
      email,
      "Réinitialise ton mot de passe — Spots",
      layout(`
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#111;">
          Réinitialisation du mot de passe
        </h1>
        <p style="margin:0 0 4px;color:#555;font-size:15px;line-height:1.7;">
          Entre ce code dans l'application pour choisir un nouveau mot de passe.
        </p>
        ${otpBlock(code)}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
          <tr><td style="background:#FFF8F0;border:1px solid #F4845F;border-radius:10px;padding:14px 16px;">
            <p style="margin:0;color:#c0632a;font-size:13px;line-height:1.5;">
              ⚠️ &nbsp;Si tu n'as pas demandé cette réinitialisation, ton compte est peut-être en danger.
              Change ton mot de passe dès que possible.
            </p>
          </td></tr>
        </table>
        <p style="margin:0;color:#aaa;font-size:12px;">
          Si tu n'es pas à l'origine de cette demande, ignore cet email.
        </p>
      `),
    );
  },
});
