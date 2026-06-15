import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface SendSmsOptions {
  to: string;
  message: string;
}

export async function sendSms({ to, message }: SendSmsOptions) {
  if (!client || !fromNumber) {
    console.warn("Twilio SMS not configured. Skipping SMS send.");
    return { success: false, error: "Twilio not configured" };
  }

  if (!to || !message) {
    return { success: false, error: "Missing phone number or message" };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to.startsWith("+") ? to : `+91${to.replace(/\D/g, "")}`,
    });

    return { success: true, sid: result.sid };
  } catch (error) {
    console.error("SMS sending failed:", error);
    return { success: false, error: String(error) };
  }
}

export function generateDonationReceiptSms(
  donorName: string,
  amount: number,
  receiptNumber: string
): string {
  return `Dear ${donorName}, Thank you for your donation of INR ${amount}. Your 80G receipt number is ${receiptNumber}. Visit nisvarthjan.org to verify. - Nisvarthjan Seva Foundation`;
}

export function generateMembershipReceiptSms(
  memberName: string,
  membershipId: string,
  receiptNumber: string
): string {
  return `Dear ${memberName}, Your membership (ID: ${membershipId}) has been confirmed. Receipt: ${receiptNumber}. Thank you for supporting Nisvarthjan! - Nisvarthjan Seva Foundation`;
}
