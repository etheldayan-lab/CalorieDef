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
    const paceLabel = p.pace === "drastic" ? "אגרסיבי" : p.pace === "slow" ? "עדין" : "מאוזן";
    const facts =
      `נתונים ידועים על המשתמש: ` +
      (p.weight ? `משקל ${Math.round(p.weight)} ק"ג, ` : "") +
      (p.height ? `גובה ${Math.round(p.height)} ס"מ, ` : "") +
      (p.age ? `גיל ${Math.round(p.age)}, ` : "") +
      (p.gender ? `מין ${p.gender === "male" ? "גבר" : p.gender === "female" ? "אישה" : "לא צוין"}, ` : "") +
      (p.goalWeight ? `משקל יעד נוכחי ${Math.round(p.goalWeight)} ק"ג, ` : "") +
      `קצב דיאטה מועדף: ${paceLabel}. `;

    const prompt =
      "זוהי תמונת גוף של אדם. בהתבסס על התמונה ועל הנתונים הידועים, תני הערכה כללית, אישית ולא רפואית. " +
      facts +
      "כתבי טקסט קצר וחם בעברית (text) של 3–5 משפטים בלבד, בסגנון מאמן כושר: ציון קצר של מבנה הגוף ואיפה מרוכז השומן אם בכלל, " +
      "המלצה על טווח משקל יעד שיתאים למראה חטוב ובריא, ומשפט סיכום קצר. אל תכתבי רשימות ארוכות — טקסט זורם וקצר. " +
      "החזירי גם: טווח יעד מומלץ (goalLow, goalHigh במספרים, ק\"ג), משקל יעד מומלץ יחיד (goalRecommended, מספר), " +
      "ואחוז שומן משוער (bodyFat, מספר שלם, הערכה גסה — אופציונלי). " +
      "התבססי על המשקל והגובה כמקור עיקרי; התמונה היא תוספת בלבד. " +
      "אם התמונה אינה תמונת גוף ברורה, כתבי בטקסט שצריך תמונה ברורה יותר והשאירי את טווח היעד קרוב לנתונים הקיימים.";

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
            text: { type: "STRING" },
            goalLow: { type: "NUMBER" },
            goalHigh: { type: "NUMBER" },
            goalRecommended: { type: "NUMBER" },
            bodyFat: { type: "INTEGER" },
          },
          required: ["text", "goalRecommended"],
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
    // round the recommended goal to a sensible 0.5 kg step
    if (typeof parsed.goalRecommended === "number") {
      parsed.goalRecommended = Math.round(parsed.goalRecommended * 2) / 2;
    }
    return json(parsed, 200);
  } catch (e) {
    return json({ error: "exception", detail: String(e) }, 500);
  }
});
