import { createClient } from "jsr:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getGoogleAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

function parseSender(fromHeader: string): { name: string; email: string } {
  const match = fromHeader.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, "").trim(), email: match[2].trim() };
  }
  return { name: fromHeader, email: fromHeader };
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokenRow, error: tokenError } = await adminClient
      .from("user_gmail_tokens")
      .select("refresh_token")
      .eq("user_id", user.id)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "No Gmail token found for user" }),
        { status: 400 },
      );
    }

    const accessToken = await getGoogleAccessToken(tokenRow.refresh_token);

    // Fetch recent message IDs
    const listRes = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=15",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const listData = await listRes.json();

    if (!listRes.ok) {
      return new Response(
        JSON.stringify({ error: "Gmail list failed", details: listData }),
        { status: 500 },
      );
    }

    const messages = listData.messages ?? [];
    let savedCount = 0;

    for (const msg of messages) {
      const msgRes = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const msgData = await msgRes.json();
      if (!msgRes.ok) continue;

      const headers = msgData.payload?.headers ?? [];
      const subject =
        headers.find((h: any) => h.name === "Subject")?.value ?? "(no subject)";
      const from = headers.find((h: any) => h.name === "From")?.value ?? "";
      const dateHeader = headers.find((h: any) => h.name === "Date")?.value;
      const { name, email } = parseSender(from);

      const { error: insertError } = await adminClient
        .from("scanned_messages")
        .upsert(
          {
            user_id: user.id,
            gmail_message_id: msg.id,
            subject,
            sender_name: name,
            sender_email: email,
            snippet: msgData.snippet ?? "",
            received_at: dateHeader ? new Date(dateHeader).toISOString() : null,
          },
          { onConflict: "user_id,gmail_message_id" },
        );

      if (!insertError) savedCount++;
    }

    return json({ success: true, scanned: savedCount });
  } catch (err) {
    return json({ error: "No Gmail token found for user" }, 400);
  }
});
