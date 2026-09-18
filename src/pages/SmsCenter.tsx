import { useState } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useIsAdminOrHR } from "@/hooks/useUserRole";
import { sendMJISSMS } from "@/integrations/sms";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const SmsCenter = () => {
  const { user } = useAuth();
  const { isAdminOrHR, isLoading: roleLoading } = useIsAdminOrHR();
  const { toast } = useToast();

  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (roleLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Only HR/Admin can access the SMS gateway
  if (!isAdminOrHR) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSend = async () => {
    const phone = recipient.trim();
    const text = message.trim();

    if (!phone) {
      toast({
        title: "Recipient required",
        description: "Enter a phone number with country code.",
        variant: "destructive",
      });
      return;
    }

    if (!phone.startsWith("+")) {
      toast({
        title: "Invalid number",
        description: "Use international format, e.g. +919876543210.",
        variant: "destructive",
      });
      return;
    }

    if (!text) {
      toast({
        title: "Message required",
        description: "Please type an SMS message.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);

      await sendMJISSMS(phone, text);

      toast({
        title: "SMS Sent",
        description: `Message sent to ${phone}.`,
      });

      setRecipient("");
      setMessage("");
    } catch (error) {
      console.error("SMS error:", error);

      toast({
        title: "SMS Failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to send SMS.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">SMS Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Send SMS from the connected MJIS Android/SIM gateway.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="sms-recipient"
                className="mb-2 block text-sm font-medium"
              >
                Recipient Number
              </label>

              <input
                id="sms-recipient"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+919876543210"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary"
              />

              <p className="mt-2 text-xs text-muted-foreground">
                Include country code. Example: +91 for India, +1 for USA,
                +44 for UK.
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="sms-message"
                  className="block text-sm font-medium"
                >
                  Message
                </label>

                <span className="text-xs text-muted-foreground">
                  {message.length} characters
                </span>
              </div>

              <textarea
                id="sms-message"
                rows={7}
                maxLength={1600}
                placeholder="Type your MJIS message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="w-full rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Sending SMS..." : "Send SMS"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="font-medium">MJIS SMS Gateway</p>
          <p className="mt-1 text-muted-foreground">
            Messages are sent through the connected Android phone and its
            active SIM.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SmsCenter;