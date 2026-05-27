/* ========================================
   Cynemora — Story Agent API Route
   Converts raw input into narrative graphs
   ======================================== */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { run } from "@openai/agents";
import { storyAgent } from "@/lib/agents/registry";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, content, projectId } = body;
    const storyInput = input || content;

    if (!storyInput || typeof storyInput !== "string") {
      return NextResponse.json(
        { error: "Story input is required" },
        { status: 400 }
      );
    }

    // Get current user id from session cookie
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

    // Execute the Story Agent
    const result = await run(storyAgent, storyInput);

    // Parse the structured output
    let narrativeGraph;
    try {
      // Attempt to extract JSON from the response
      const outputText = result.finalOutput || "";
      const jsonMatch = outputText.match(/```json\s*([\s\S]*?)\s*```/);
      const rawJson = jsonMatch ? jsonMatch[1] : outputText;
      narrativeGraph = JSON.parse(rawJson);
    } catch {
      // If JSON parsing fails, fallback structure
      narrativeGraph = {
        title: "Untitled Production",
        logline: storyInput.slice(0, 100) + "...",
        genre: "Sci-Fi",
        tone: "Cinematic",
        themes: ["Discovery"],
        acts: [
          {
            number: 1,
            title: "Act I",
            description: "The journey begins.",
            scenes: [
              {
                number: 1,
                title: "Opening Scene",
                description: storyInput,
                location: "INT. SPACE STATION",
                timeOfDay: "NIGHT",
                mood: "Mysterious",
                characters: ["Protagonist"],
                continuityNotes: []
              }
            ]
          }
        ],
        characters: [{ name: "Protagonist", description: "Main explorer", role: "Protagonist" }],
        emotionalArc: [{ sceneNumber: 1, intensity: 0.5, emotion: "Awe", description: "Starts exploration" }]
      };
    }

    // Save to Firestore
    const pid = projectId || `proj_${Date.now()}`;
    const projectRef = adminDb.collection("projects").doc(pid);
    
    const projectData = {
      id: pid,
      userId,
      title: narrativeGraph.title || "Untitled Production",
      description: narrativeGraph.logline || storyInput.slice(0, 150) + "...",
      status: "planning",
      tier: "standard",
      createdAt: new Date(),
      updatedAt: new Date(),
      narrativeGraph,
      creditsUsed: 5,
      creditsEstimated: 15,
    };
    
    await projectRef.set(projectData, { merge: true });

    return NextResponse.json({
      success: true,
      projectId: pid,
      narrativeGraph,
      agentUsed: "Story Architect",
    });
  } catch (error) {
    console.error("[API] Story agent error:", error);
    return NextResponse.json(
      {
        error: "Story processing failed",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
