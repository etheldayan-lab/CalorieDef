// Supabase Edge Function: scan-meal
// Receives a meal photo (base64) from the logged-in app, asks Google Gemini
// (vision) to identify the foods and estimate calories / protein / fiber,
// and returns a structured result. The Gemini API key lives ONLY here, as a
// server secret (GEMINI_API_KEY) — never in the app or the browser.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Model is overridable via the GEMINI_MODEL secret, so it can be changed
// without editing code if Google retires/renames a model again.
const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  try {
    const { image, mimeType } = await req.json();
    if (!image) return json({ error: "no_image" }, 400);

    const KEY = Deno.env.get("GEMINI_API_KEY");
    if (!KEY) return json({ error: "missing_server_key" }, 500);

    const prompt =
      "זוהי תמונה של צלחת אוכל. זהי את כל פריטי המזון שנראים בצלחת. " +
      "לכל פריט החזירי: שם בעברית, הערכת קלוריות, חלבון בגרמים, וסיבים תזונתיים בגרמים, " +
      "בהתבסס על הכמות שנראית בתמונה. חשבי גם סכום כולל לכל הצלחת. " +
      "אם את לא בטוחה בכמות, תני הערכה סבירה. הוסיפי הערה קצרה אחת אם יש משהו לא ודאי.";

    const body = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || "image/jpeg", data: image } },
        ],
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  calories: { type: "INTEGER" },
                  protein_g: { type: "INTEGER" },
                  fiber_g: { type: "INTEGER" },
                },
                required: ["name", "calories", "protein_g", "fiber_g"],
              },
            },
            total_calories: { type: "INTEGER" },
            total_protein_g: { type: "INTEGER" },
            total_fiber_g: { type: "INTEGER" },
            note: { type: "STRING" },
          },
          required: ["items", "total_calories", "total_protein_g", "total_fiber_g"],
        },
      },
    };

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
    );

    if (!r.ok) {
      const detail = await r.text();
      return json({ error: "gemini_" + r.status, detail }, 502);
    }

    const data = await r.json();
    const txt = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || "").join("");
    const parsed = JSON.parse(txt);
    return json(parsed, 200);
  } catch (e) {
    return json({ error: "exception", detail: String(e) }, 500);
  }
});
