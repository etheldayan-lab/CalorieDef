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

    // Objective anchors computed from the user's own numbers (BMI). The photo only
    // fine-tunes within this healthy band — it never sets the target on its own.
    const round5 = (x: number) => Math.round(x * 2) / 2;
    const hM = p.height ? Number(p.height) / 100 : 0;
    const ideal = hM ? round5(22 * hM * hM) : null;       // BMI 22 — "ideal" weight for this height
    const healthyLo = hM ? round5(20 * hM * hM) : null;   // lower bound we allow (BMI 20)
    const healthyHi = hM ? round5(24.5 * hM * hM) : null; // upper bound we allow (BMI 24.5)
    const curBmi = (hM && p.weight) ? (Number(p.weight) / (hM * hM)) : null;

    const facts =
      `נתונים ידועים על המשתמש: ` +
      (p.weight ? `משקל ${Math.round(p.weight)} ק"ג, ` : "") +
      (p.height ? `גובה ${Math.round(p.height)} ס"מ, ` : "") +
      (curBmi ? `BMI נוכחי ${curBmi.toFixed(1)}, ` : "") +
      (p.age ? `גיל ${Math.round(p.age)}, ` : "") +
      (p.gender ? `מין ${p.gender === "male" ? "גבר" : p.gender === "female" ? "אישה" : "לא צוין"}, ` : "") +
      (p.goalWeight ? `משקל יעד נוכחי שהוגדר ${Math.round(p.goalWeight)} ק"ג, ` : "") +
      `קצב דיאטה מועדף: ${paceLabel}. `;

    const anchor = hM
      ? `חישוב אובייקטיבי לפי הגובה: טווח משקל בריא ${healthyLo}–${healthyHi} ק"ג, ומשקל יעד אידיאלי (BMI 22) כ-${ideal} ק"ג. `
      : "";

    const prompt =
      "זוהי תמונת גוף של אדם. תני הערכה כללית, אישית ולא רפואית, המבוססת בעיקר על הנתונים המספריים. " +
      facts + anchor +
      "חשוב מאוד לדיוק: בסיס החישוב הוא הנתונים (משקל, גובה, BMI). התמונה משמשת רק לכוונון עדין של היעד בתוך הטווח הבריא, לפי מבנה הגוף ומסת השריר. " +
      "מבנה גוף שרירי/אתלטי → יעד מעט גבוה יותר (שריר שוקל יותר משומן); עודף שומן נראה לעין → יעד מעט נמוך יותר — אך תמיד בתוך הטווח הבריא. " +
      (hM ? `המלצת היעד (goalRecommended) חייבת להיות בתוך הטווח ${healthyLo}–${healthyHi} ק"ג, וברוב המקרים קרובה ל-${ideal} ק"ג. אל תמליצי על יעד נמוך מ-${healthyLo} ק"ג גם אם הוא ייראה רזה יותר. ` : "") +
      "כתבי טקסט קצר וחם בעברית (text) של 3–5 משפטים בלבד, בסגנון מאמן כושר: ציון קצר של מבנה הגוף, ההמלצה על טווח היעד, ומשפט סיכום. בלי רשימות. " +
      "החזירי גם: טווח יעד מומלץ (goalLow, goalHigh, ק\"ג), משקל יעד מומלץ יחיד (goalRecommended), ואחוז שומן משוער (bodyFat, אופציונלי). " +
      "אם התמונה אינה תמונת גוף ברורה, צייני זאת בטקסט והשאירי את היעד שווה למשקל היעד האידיאלי לפי הגובה.";

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
    // Safety net: clamp every weight the model returns into the healthy band derived
    // from the user's height, and round to 0.5 kg — so the photo can never push the
    // target to an unhealthy value even if the model errs.
    if (hM && healthyLo != null && healthyHi != null) {
      const clamp = (x: number) => round5(Math.max(healthyLo, Math.min(healthyHi, x)));
      if (typeof parsed.goalRecommended === "number") parsed.goalRecommended = clamp(parsed.goalRecommended);
      if (typeof parsed.goalLow === "number") parsed.goalLow = clamp(parsed.goalLow);
      if (typeof parsed.goalHigh === "number") parsed.goalHigh = clamp(parsed.goalHigh);
      if (typeof parsed.goalLow === "number" && typeof parsed.goalHigh === "number" && parsed.goalLow > parsed.goalHigh) {
        const t = parsed.goalLow; parsed.goalLow = parsed.goalHigh; parsed.goalHigh = t;
      }
    } else if (typeof parsed.goalRecommended === "number") {
      parsed.goalRecommended = Math.round(parsed.goalRecommended * 2) / 2;
    }
    return json(parsed, 200);
  } catch (e) {
    return json({ error: "exception", detail: String(e) }, 500);
  }
});
