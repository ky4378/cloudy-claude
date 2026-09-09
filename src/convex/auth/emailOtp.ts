import { Email } from "@convex-dev/auth/providers/Email";
import axios from "axios";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

// Verification codes are sent through Resend when RESEND_API_KEY is set — a
// verified sending domain (DKIM/SPF) keeps these out of spam, which is what
// users actually see in their inbox. Without a key we fall back to the
// Freebuff email relay (auth.freebuff.app/send_otp) so sign-up never breaks.
//
// Keys (managed in the Freebuff Keys tab, never shipped to the browser):
//   RESEND_API_KEY  — re_… from https://resend.com/api-keys
//   RESEND_FROM     — optional "Name <you@yourdomain.com>"; defaults to
//                     onboarding@resend.dev (Resend's free test sender, which
//                     only delivers to the account owner's own email — verify
//                     a domain in Resend and set RESEND_FROM before launch).
const RESEND_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM =
  process.env.RESEND_FROM ?? "Cloudy <onboarding@resend.dev>";

async function sendViaResend(email: string, token: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [email],
      subject: "Your Cloudy verification code",
      html: `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <h2 style="margin: 0 0 12px; font-size: 20px;">Your Cloudy verification code</h2>
  <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6;">Use the code below to verify your email address and finish creating your account.</p>
  <p style="margin: 0 0 16px; font-size: 30px; font-weight: 700; letter-spacing: 8px; text-align: center; color: #111827;">${token}</p>
  <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.6;">This code expires in 15 minutes. If you didn't request it, you can safely ignore this email.</p>
</div>`,
      text: `Your Cloudy verification code is ${token}. It expires in 15 minutes. If you didn't request it, you can safely ignore this email.`,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  // This function can be asynchronous
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: email, token }) {
    if (RESEND_KEY) {
      try {
        await sendViaResend(email, token);
        return;
      } catch (error) {
        // A bad/expired key shouldn't block sign-up — fall through to the
        // Freebuff relay below.
        console.error("Resend OTP send failed, using relay fallback:", error);
      }
    }
    try {
      await axios.post(
        "https://auth.freebuff.app/send_otp",
        {
          to: email,
          otp: token,
          appName: "Cloudy AI",
        },
        {
          headers: {
            "x-api-key": "fb_email_2crN1hqIArZP2bEfvjp5Qik4",
          },
        },
      );
    } catch (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
