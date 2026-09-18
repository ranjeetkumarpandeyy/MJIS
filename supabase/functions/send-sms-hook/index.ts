import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const TEXTBEE_URL =
  "https://api.textbee.dev/api/v1/gateway/send-sms";

const hookSecret = Deno.env
  .get("SEND_SMS_HOOK_SECRET")
  ?.replace("v1,whsec_", "");

const textbeeApiKey = Deno.env.get("TEXTBEE_API_KEY");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "POST required" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!hookSecret) {
    console.error("SEND_SMS_HOOK_SECRET is not configured.");
    return new Response(
      JSON.stringify({ error: "Hook secret is not configured." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!textbeeApiKey) {
    console.error("TEXTBEE_API_KEY is not configured.");
    return new Response(
      JSON.stringify({ error: "TextBee key is not configured." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Read the raw body first because Standard Webhooks signature
    // verification must use the exact received payload.
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);

    const wh = new Webhook(hookSecret);
    const event = wh.verify(payload, headers) as {
      user?: {
        phone?: string | null;
      };
      sms?: {
        otp?: string | null;
      };
    };

    const phone = String(event.user?.phone ?? "").trim();
    const otp = String(event.sms?.otp ?? "").trim();

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({
          error: "Hook payload did not contain phone and OTP.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const message =
      `MJIS verification code: ${otp}. ` +
      "Use this code to complete your mobile verification/login. " +
      "Do not share this code.";

    const response = await fetch(TEXTBEE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": textbeeApiKey,
      },
      body: JSON.stringify({
        recipients: [phone],
        message,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "TextBee auth SMS failed:",
        response.status,
        responseText,
      );

      return new Response(
        JSON.stringify({
          error: "TextBee failed to send the authentication SMS.",
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("Authentication SMS accepted by TextBee.");

    // Supabase expects a successful Send SMS Hook to return HTTP 200.
    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Send SMS Hook error:", error);

    return new Response(
      JSON.stringify({
        error: "Authentication SMS hook failed.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
