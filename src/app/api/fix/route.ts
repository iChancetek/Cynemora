import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("renders").get();
    const urls = [];
    
    for (const doc of snapshot.docs) {
      urls.push(doc.data().videoUrl);
    }
    
    return NextResponse.json({ urls });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
