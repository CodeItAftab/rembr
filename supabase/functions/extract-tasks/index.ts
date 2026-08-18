import { createClient } from "jsr:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function extractWithGemini(subject: string, snippet: string) {
  const prompt = `You are a task-deadline extractor. Given an email subject and snippet, determine if it describes a task with a deadline (e.g. "submit report by Friday", "contract due the 25th").

Subject: ${subject}
Snippet: ${snippet}

Respond with ONLY valid JSON, no markdown, in this exact shape:
{"has_task": boolean, "title": string or null, "deadline_iso": string or null, "priority": "high"|"medium"|"low" or null}

If there's no clear task/deadline, set has_task to false and other fields to null. Infer deadline_iso as a full ISO 8601 datetime based on today being ${new Date().toISOString()}. Use medium priority by default unless urgency language suggests otherwise.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error: ${JSON.stringify(data)}`);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return { has_task: false };
  }
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Invalid session" }, 401);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: messages, error: fetchError } = await adminClient
      .from("scanned_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("processed", false)
      .limit(20);

    if (fetchError) return json({ error: fetchError.message }, 500);

    let tasksCreated = 0;

    for (const msg of messages ?? []) {
      try {
        const result = await extractWithGemini(
          msg.subject ?? "",
          msg.snippet ?? "",
        );

        if (result.has_task && result.title) {
          await adminClient.from("tasks").insert({
            user_id: user.id,
            title: result.title,
            deadline: result.deadline_iso ?? null,
            priority: result.priority ?? "medium",
            status: "upcoming",
            sender_name: msg.sender_name,
            sender_email: msg.sender_email,
            source_email_id: msg.gmail_message_id,
          });
          tasksCreated++;
        }
      } catch (err) {
        console.error(
          `Extraction failed for message ${msg.gmail_message_id}:`,
          err,
        );
      }

      await adminClient
        .from("scanned_messages")
        .update({ processed: true })
        .eq("id", msg.id);
    }

    return json({
      success: true,
      tasksCreated,
      messagesProcessed: messages?.length ?? 0,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
