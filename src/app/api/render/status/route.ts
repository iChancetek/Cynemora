/* ========================================
   Cynemora — Render Status API Route
   Polls render operation status
   ======================================== */

import { NextRequest, NextResponse } from "next/server";
import { getRenderManager } from "@/lib/rendering/manager";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get("operationId");
    const provider = searchParams.get("provider");

    if (!operationId || !provider) {
      return NextResponse.json(
        { error: "operationId and provider are required" },
        { status: 400 }
      );
    }

    const manager = getRenderManager();
    const status = await manager.checkStatus(operationId, provider);

    return NextResponse.json({
      success: true,
      operation: status,
    });
  } catch (error) {
    console.error("[API] Render status error:", error);
    return NextResponse.json(
      {
        error: "Status check failed",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
