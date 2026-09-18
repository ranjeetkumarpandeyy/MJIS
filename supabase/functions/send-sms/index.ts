import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Browser / Supabase preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  // Prevent the GET request from producing a JSON parsing error
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        success: true,
        function: "send-sms",
        message: "MJIS SMS function is active",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed. Use POST.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    // Safely read request body
    let body: {
      recipients?: unknown;
      message?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or empty JSON request body.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const { recipients, message } = body;

    // Validate recipients
    if (
      !Array.isArray(recipients) ||
      recipients.length === 0 ||
      !recipients.every(
        (number) =>
          typeof number === "string" && number.trim().length > 0,
      )
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "recipients must be a non-empty array of phone numbers.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Validate message
    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "message is required.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Read TextBee API key from Supabase Secret
    const apiKey = Deno.env.get("TEXTBEE_API_KEY");

    if (!apiKey) {
      console.error("TEXTBEE_API_KEY is missing");

      return new Response(
        JSON.stringify({
          success: false,
          error: "TEXTBEE_API_KEY is not configured.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Send SMS through TextBee
    const textbeeResponse = await fetch(
      "https://api.textbee.dev/api/v1/gateway/send-sms",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          recipients,
          message: message.trim(),
        }),
      },
    );

    const responseText = await textbeeResponse.text();

    let result: unknown;

    try {
      result = JSON.parse(responseText);
    } catch {
      result = {
        rawResponse: responseText,
      };
    }

    console.log("TextBee response:", {
      status: textbeeResponse.status,
      ok: textbeeResponse.ok,
    });

    return new Response(
      JSON.stringify({
        success: textbeeResponse.ok,
        status: textbeeResponse.status,
        data: result,
      }),
      {
        status: textbeeResponse.ok ? 200 : textbeeResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("SMS function error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send SMS.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});