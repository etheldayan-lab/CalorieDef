// Supabase Edge Function: fridge-recipes
// Receives a list of ingredients the user has at home (and an optional calorie
// range per person) from the logged-in app, asks Google Gemini to suggest a few
// recipes that mostly use those ingredients, and returns a structured result.
// The Gemini API key lives ONLY here, as a server secret (GEMINI_API_KEY) —
// never in the app or the browser. (Same key/secret as scan-meal.)

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
    const { ingredients, calLow, calHigh } = await req.json();
    const list = Array.isArray(ingredients)
      ? ingredients.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim())
      : [];
    if (!list.length) return json({ error: "no_ingredients" }, 400);

    const KEY = Deno.env.get("GEMINI_API_KEY");
    if (!KEY) return json({ error: "missing_server_key" }, 500);

    const lo = Number.isFinite(calLow) ? Math.round(calLow) : null;
    const hi = Number.isFinite(calHigh) ? Math.round(calHigh) : null;
    const range = lo && hi
      ? `כל מנה צריכה להכיל בערך בין ${lo} ל-${hi} קלוריות למנה אחת. `
      : "";

    const prompt =
      "יש לי במקרר ובמזווה את המרכיבים הבאים: " + list.join(", ") + ". " +
      "הציעי לי 3 עד 4 מתכונים פשוטים ובריאים שאני יכול להכין כמעט רק מהמרכיבים האלה. " +
      range +
      "חשוב מאוד: כל מתכון חייב להתבסס על המרכיבים שברשותי. אסור לדרוש מרכיב עיקרי שלא ברשימה שלי " +
      "(למשל בשר, עוף, דג, ביצים, גבינה, ירק או פחמימה עיקרית שלא ציינתי). " +
      "מותר להוסיף רק מרכיבי בסיס נפוצים שכמעט לכולם יש — מלח, פלפל, שמן, מים, תבלינים, עשבי תיבול, שום, בצל, לימון, רוטב — " +
      "ולציין אותם ברשימת האופציונליים. עדיף מתכון שמשתמש בכמה שיותר מהמרכיבים שלי על פני מתכון שדורש מרכיב חסר. " +
      "אם אין מספיק מרכיבים למתכון טוב, החזירי פחות מתכונים או רשימה ריקה — אל תמציאי מתכונים שדורשים מצרכים שאין לי. " +
      "לכל מתכון החזירי: שם בעברית, הערכת קלוריות למנה, רשימת המרכיבים מהרשימה שלי שבהם הוא משתמש, " +
      "רשימת מרכיבים אופציונליים/נוספים (בסיס בלבד), וצעדי הכנה קצרים בעברית.";

    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            recipes: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  calories: { type: "INTEGER" },
                  uses: { type: "ARRAY", items: { type: "STRING" } },
                  optional: { type: "ARRAY", items: { type: "STRING" } },
                  steps: { type: "ARRAY", items: { type: "STRING" } },
                },
                required: ["name", "calories", "uses", "steps"],
              },
            },
          },
          required: ["recipes"],
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
