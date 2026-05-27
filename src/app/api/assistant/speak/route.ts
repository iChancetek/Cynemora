import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing");
    }

    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: "No text" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS Error:", error);
    return NextResponse.json({ error: "Speech generation failed" }, { status: 500 });
  }
}
