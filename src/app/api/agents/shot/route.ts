/* ========================================
   Cynemora — Shot Agent API Route
   Decomposes scenes into structured shot plans
   ======================================== */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { run } from "@openai/agents";
import { shotAgent } from "@/lib/agents/registry";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      sceneNumber,
      sceneTitle,
      sceneDescription,
      sceneLocation,
      sceneTimeOfDay,
      sceneMood,
      sceneCharacters,
    } = body;

    if (!projectId || !sceneNumber) {
      return NextResponse.json(
        { error: "projectId and sceneNumber are required" },
        { status: 400 }
      );
    }

    // Verify session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    let userId = "guest";

    if (sessionCookie) {
      try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie);
        userId = decoded.uid;
      } catch (err) {
        console.warn("Session verification failed, fallback to guest");
      }
    }

    // Format the prompt for the Shot Agent
    const shotAgentInput = `
Scene Number: ${sceneNumber}
Title: ${sceneTitle || "Untitled"}
Description: ${sceneDescription || "No description provided."}
Location: ${sceneLocation || "INT. SCENE"}
Time of Day: ${sceneTimeOfDay || "DAY"}
Mood: ${sceneMood || "Neutral"}
Characters: ${(sceneCharacters || []).join(", ")}
`;

    // Execute the Shot Agent
    const result = await run(shotAgent, shotAgentInput);

    // Parse the structured output
    let shotPlan;
    try {
      const outputText = result.finalOutput || "";
      const jsonMatch = outputText.match(/```json\s*([\s\S]*?)\s*```/);
      const rawJson = jsonMatch ? jsonMatch[1] : outputText;
      shotPlan = JSON.parse(rawJson);
    } catch (e) {
      console.warn("JSON parsing failed, falling back to mock shot plan", e);
      // Fallback shots if JSON parsing fails
      shotPlan = {
        shots: [
          {
            number: 1,
            type: "establishing",
            description: `Wide establishing shot of ${sceneLocation || "the location"}.`,
            framing: { angle: "low", composition: "Rule of thirds", focalLength: "24mm", depthOfField: "deep" },
            movement: { type: "pan", speed: "slow", description: "Slow pan across the environment." },
            duration: 6,
            compiledPrompt: `Wide establishing shot of ${sceneLocation || "the location"}. Cinematic lighting, 8k resolution, photorealistic.`,
          },
          {
            number: 2,
            type: "medium",
            description: `Medium shot focusing on the characters ${(sceneCharacters || []).join(", ")}.`,
            framing: { angle: "eye-level", composition: "Two-shot", focalLength: "50mm", depthOfField: "medium" },
            movement: { type: "static", speed: "static", description: "Static camera capture." },
            duration: 5,
            compiledPrompt: `Medium shot of characters at ${sceneLocation || "the location"}. Volumetric light, detailed faces, dramatic cinematic.`,
          }
        ]
      };
    }

    // Update Firestore project document with the new shot list
    const projectRef = adminDb.collection("projects").doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectSnap.data() || {};
    const existingShots = projectData.shots || {};
    const sceneKey = `scene_${sceneNumber}`;
    
    // Save to Firestore
    const updatedShots = {
      ...existingShots,
      [sceneKey]: shotPlan.shots,
    };

    await projectRef.update({
      shots: updatedShots,
      status: "production",
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      shots: shotPlan.shots,
      agentUsed: "Shot Planner",
    });
  } catch (error) {
    console.error("[API] Shot agent error:", error);
    return NextResponse.json(
      {
        error: "Shot planning failed",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
