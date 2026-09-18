import { supabase } from "@/integrations/supabase/client";

export type SendMJISSMSResponse = {
  success: boolean;
  status?: number;
  data?: unknown;
};

export async function sendMJISSMS(
  recipient: string,
  message: string,
): Promise<SendMJISSMSResponse> {
  const phone = recipient.trim();
  const sms = message.trim();

  if (!phone) {
    throw new Error("Recipient number is required.");
  }

  if (!phone.startsWith("+")) {
    throw new Error(
      "Please enter the recipient number with country code, for example +919876543210.",
    );
  }

  if (!sms) {
    throw new Error("Message is required.");
  }

  const { data, error } = await supabase.functions.invoke("send-sms", {
    body: {
      recipients: [phone],
      message: sms,
    },
  });

  if (error) {
    console.error("MJIS SMS function error:", error);
    throw new Error(error.message || "SMS could not be sent.");
  }

  if (data?.success === false) {
    const remoteError =
      data?.data?.message ||
      data?.data?.error ||
      data?.error ||
      "SMS could not be sent.";

    throw new Error(String(remoteError));
  }

  return data as SendMJISSMSResponse;
}
