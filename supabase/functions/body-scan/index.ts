// Supabase Edge Function: body-scan
// Receives a body photo (base64) plus the user's known numbers (weight, height,
// age, gender, goal) from the logged-in app, asks Google Gemini (vision) for a
// ROUGH body-composition estimate and a gentle daily-calorie adjustment.
// This is an estimate to *assist* the calculation — never a medical measurement.
// The Gemini API key lives ONLY here, as a server secret (GEMINI_API_KEY).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    const { image, mimeType, profile } = await req.json();
    if (!image) return json({ error: "no_image" }, 400);

    const KEY = Deno.env.get("GEMINI_API_KEY");
    if (!KEY) return json({ error: "missing_server_key" }, 500);

    const p = profile || {};
    const facts =
      `נתונים ידועים על המשתמש: ` +
      (p.weight ? `משקל ${Math.round(p.weight)} ק"ג, ` : "") +
      (p.height ? `גובה ${Math.round(p.height)} ס"מ, ` : "") +
      (p.age ? `גיל ${Math.round(p.age)}, ` : "") +
      (p.gender ? `מין ${p.gender === "male" ? "גבר" : p.gender === "female" ? "אישה" : "לא צוין"}, ` : "") +
      (p.goalWeight ? `משקל יעד ${Math.round(p.goalWeight)} ק"ג. ` : ". ");

    const prompt =
      "זוהי תמונת גוף של אדם. בהתבסס על התמונה ועל הנתונים הידועים, תני הערכה גסה ולא רפואית של הרכב הגוף. " +
      facts +
      "החזירי: אחוז שומן גוף משוער (מספר שלם, הערכה גסה), קטגוריית מבנה גוף קצרה בעברית (למשל 'רזה', 'אתלטי', 'ממוצע', 'מלא יותר'), " +
      "התאמה קטנה ומתונה ליעד הקלוריות היומי בטווח -150 עד +150 (מספר שלם, calorieAdjust) — שלילי אם נראה שכדאי גירעון מעט גדול יותר, חיובי אם נראה שצריך יותר אנרגיה, או 0 אם הנתונים הקיימים מספיקים. " +
      "ורמת ביטחון (confidence: 'low' או 'medium'). " +
      "הוסיפי הערה קצרה אחת בעברית (note) שמסבירה את ההערכה ומדגישה שזו הערכה גסה בלבד ולא מדידה רפואית, ושהמשקל והגובה הם המקור העיקרי לחישוב. " +
      "אם התמונה אינה תמונת גוף ברורה, החזירי calorieAdjust=0, confidence='low' והערה שמבקשת תמונה ברורה יותר.";

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
            bodyFat: { type: "INTEGER" },
            build: { type: "STRING" },
            calorieAdjust: { type: "INTEGER" },
            confidence: { type: "STRING" },
            note: { type: "STRING" },
          },
          required: ["build", "calorieAdjust", "note"],
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
    // clamp the adjustment so the AI can only ever nudge, never swing the target
    if (typeof parsed.calorieAdjust === "number") {
      parsed.calorieAdjust = Math.max(-150, Math.min(150, Math.round(parsed.calorieAdjust)));
    } else {
      parsed.calorieAdjust = 0;
    }
    return json(parsed, 200);
  } catch (e) {
    return json({ error: "exception", detail: String(e) }, 500);
  }
});
