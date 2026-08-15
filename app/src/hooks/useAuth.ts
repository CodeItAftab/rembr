import { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";

WebBrowser.maybeCompleteAuthSession();

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const redirectUrl = Linking.createURL("auth-callback");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        scopes: "https://www.googleapis.com/auth/gmail.readonly",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(
      data.url!,
      redirectUrl,
    );

    if (result.type === "success") {
      const { url } = result;
      const params = new URLSearchParams(url.split("#")[1]);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });

        const { data: { session: newSession } } = await supabase.auth.getSession();

        if (newSession?.provider_refresh_token) {
          const { error: fnError } = await supabase.functions.invoke("save-gmail-token", {
            body: { refresh_token: newSession.provider_refresh_token },
          });

          if (fnError) {
            console.error("Failed to save Gmail token:", fnError);
          }
        }
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, loading, signInWithGoogle, signOut };
}