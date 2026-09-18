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
    phone?: string
  ) => Promise<{
    error: Error | null;
  }>;

  // Kept for the separate mobile-verification flow.
  // It is NOT called automatically during email/password login.
  verifyPhoneChange: (
    phone: string,
    token: string
  ) => Promise<{
    error: Error | null;
  }>;

  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeIndianPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return "";
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);

      if (event === "SIGNED_IN" && nextSession?.user?.id) {
        queryClient.invalidateQueries({
          queryKey: ["user-role", nextSession.user.id],
        });
      }

      if (event === "SIGNED_OUT") {
        queryClient.removeQueries({
          queryKey: ["user-role"],
        });
      }
    });

    supabase.auth.getSession().then(
      ({ data: { session: existingSession } }) => {
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  /**
   * IMPORTANT:
   * Email/password sign-in must stay a normal login operation.
   * We do NOT call updateUser({ phone }) here.
   *
   * Calling updateUser({ phone }) during every login starts a
   * phone-change verification flow and invokes the Send SMS Hook.
   * If that hook has any configuration/secret/provider problem,
   * it can make an otherwise valid email login fail with:
   * "Invalid payload sent to hook".
   *
   * Mobile verification is intentionally a separate flow.
   */
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
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("blocked")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error(
          "Error checking blocked status:",
          profileError
        );
      }

      if (profile?.blocked) {
        await supabase.auth.signOut({
          scope: "local",
        });

        return {
          error: new Error(
            "Your account has been blocked. Please contact an administrator."
          ),
          needsPhoneVerification: false,
        };
      }
    }

    return {
      error: null,
      needsPhoneVerification: false,
    };
  };

  /**
   * Signup stores the mobile number in user metadata.
   *
   * We intentionally do NOT call updateUser({ phone }) here,
   * because a fresh email signup is not yet authenticated for a
   * phone-change flow. The phone can be linked/verified later from
   * a dedicated authenticated screen.
   */
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ) => {
    // Defensive guard: older callers may omit phone.
    // Never call .replace() on an undefined value.
    const normalizedPhone = phone
      ? normalizeIndianPhone(phone)
      : "";

    if (phone && !normalizedPhone) {
      return {
        error: new Error(
          "Please enter a valid 10-digit Indian mobile number."
        ),
      };
    }

    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          ...(normalizedPhone
            ? {
                mobile: normalizedPhone,
                mobile_pending_verification: normalizedPhone,
              }
            : {}),
        },
      },
    });

    if (error) {
      return {
        error: error as Error,
      };
    }

    // Supabase can return a user with no identity when
    // the email already exists.
    if (
      data?.user?.identities &&
      data.user.identities.length === 0
    ) {
      return {
        error: new Error("User already registered"),
      };
    }

    return {
      error: null,
    };
  };

  /**
   * Separate authenticated phone verification helper.
   * This is only called by an explicit mobile-verification screen,
   * never automatically during email login.
   */
  const verifyPhoneChange = async (
    phone: string,
    token: string
  ) => {
    const normalizedPhone = normalizeIndianPhone(phone);

    if (!normalizedPhone) {
      return {
        error: new Error("Invalid mobile number."),
      };
    }

    if (!/^\d{6}$/.test(token)) {
      return {
        error: new Error("OTP must be 6 digits."),
      };
    }

    const { error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token,
      type: "phone_change",
    });

    if (error) {
      return {
        error: error as Error,
      };
    }

    const { error: metadataError } =
      await supabase.auth.updateUser({
        data: {
          mobile: normalizedPhone,
          mobile_pending_verification: null,
        },
      });

    if (metadataError) {
      console.warn(
        "Phone verified, but metadata cleanup failed:",
        metadataError
      );
    }

    return {
      error: null,
    };
  };

  const signOut = async () => {
    setIsSigningOut(true);

    try {
      await supabase.auth.signOut({
        scope: "local",
      });
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
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
}