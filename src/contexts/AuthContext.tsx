import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isSigningOut: boolean;

  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: Error | null;
    needsPhoneVerification?: boolean;
    phone?: string;
  }>;

  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ) => Promise<{
    error: Error | null;
  }>;

  verifyPhoneChange: (
    phone: string,
    token: string
  ) => Promise<{
    error: Error | null;
  }>;

  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizePhone = (phone: string) => {
  const value = phone.trim();
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return value.startsWith("+") ? value : `+${digits}`;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (event === "SIGNED_IN" && session?.user?.id) {
        queryClient.invalidateQueries({
          queryKey: ["user-role", session.user.id],
        });
      }

      if (event === "SIGNED_OUT") {
        queryClient.removeQueries({ queryKey: ["user-role"] });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        error: error as Error,
        needsPhoneVerification: false,
      };
    }

    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("blocked")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Error checking blocked status:", profileError);
      }

      if (profile?.blocked) {
        await supabase.auth.signOut({ scope: "local" });

        return {
          error: new Error(
            "Your account has been blocked. Please contact an administrator."
          ),
          needsPhoneVerification: false,
        };
      }

      /*
       * IMPORTANT:
       * Do NOT link/update the user's phone automatically during
       * email/password login.
       *
       * supabase.auth.updateUser({ phone }) starts a phone-change flow.
       * Your configured Supabase Send SMS Auth Hook is invoked for that
       * flow. That is why a normal email/password login was showing:
       * "Invalid payload sent to hook".
       *
       * The mobile number collected during signup stays in user metadata
       * until the user explicitly starts the separate phone-verification
       * flow via verifyPhoneChange().
       */
      return {
        error: null,
        needsPhoneVerification: false,
      };
    }

    return {
      error: null,
      needsPhoneVerification: false,
    };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ) => {
    const normalizedPhone = normalizePhone(phone);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,

          // Self-created portal accounts are marked so the employee
          // payroll/KYC area can request statutory details/documents.
          employee_onboarding_required: true,
          payroll_identity_required: true,

          mobile: normalizedPhone,
          mobile_pending_verification: normalizedPhone,
        },
      },
    });

    if (error) {
      return { error: error as Error };
    }

    if (data?.user?.identities && data.user.identities.length === 0) {
      return { error: new Error("User already registered") };
    }

    return { error: null };
  };

  /*
   * Explicit phone verification only.
   * This function is called by a dedicated OTP flow, not by email login.
   */
  const verifyPhoneChange = async (phone: string, token: string) => {
    const normalizedPhone = normalizePhone(phone);

    const { error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token,
      type: "phone_change",
    });

    if (error) {
      return { error: error as Error };
    }

    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        mobile: normalizedPhone,
        mobile_pending_verification: null,
      },
    });

    if (metadataError) {
      console.warn(
        "Mobile was verified, but metadata cleanup failed:",
        metadataError
      );
    }

    return { error: null };
  };

  const signOut = async () => {
    setIsSigningOut(true);

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setSession(null);
      setUser(null);
      queryClient.clear();
      setIsSigningOut(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isSigningOut,
        signIn,
        signUp,
        verifyPhoneChange,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
