import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

if (!client) {
  console.warn("[Twilio] SMS not configured. Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
}
if (!fromNumber) {
  console.warn("[Twilio] Missing TWILIO_PHONE_NUMBER");
}

export interface SendSmsOptions {
  to: string;
  message: string;
}

export async function sendSms({ to, message }: SendSmsOptions) {
  if (!client || !fromNumber) {
    const error = "Twilio not configured. Check environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER";
    console.error("[Twilio]", error);
    return { success: false, error };
  }

  if (!to || !message) {
    return { success: false, error: "Missing phone number or message" };
  }

  try {
    const phoneNumber = to.startsWith("+") ? to : `+91${to.replace(/\D/g, "")}`;
    console.log(`[Twilio] Sending SMS to ${phoneNumber}, from ${fromNumber}`);
    
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber,
    });

    return { success: true, sid: result.sid };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Twilio] SMS sending failed:", errorMsg);
    return { success: false, error: errorMsg };
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
