import { NextRequest, NextResponse } from "next/server";

// ✅ Use a supported model (not experimental)
const MODEL = "gemini-2.0-flash"; // or "gemini-2.5-flash" if you have quota

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(request: NextRequest) {
  try {
    const { prompt, maxRetries = 3 } = await request.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(GEMINI_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        });

        // Handle Gemini API response
        if (!response.ok) {
          const errorText = await response.text();
          return NextResponse.json(
            { error: `Gemini API Error ${response.status}: ${errorText}` },
            { status: response.status }
          );
        }

        const data = await response.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || "No output";

        return NextResponse.json({ text: text.trim() });
      } catch (error: any) {
        if (attempt === maxRetries - 1) throw error;
        console.warn(`Attempt ${attempt + 1} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return NextResponse.json(
      { error: "Failed to get response from Gemini after multiple attempts" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("AI Generation API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
