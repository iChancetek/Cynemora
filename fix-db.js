const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const serviceAccount = require("./service-account.json");

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "cynemoraai.firebasestorage.app"
});

const db = getFirestore(app);
const storage = getStorage(app);

async function fix() {
  console.log("Scanning Firestore for rogue Google API links...");
  const snapshot = await db.collection("renders").get();
  let fixedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.videoUrl && data.videoUrl.includes("generativelanguage.googleapis.com")) {
      console.log(`Found broken document [${doc.id}]. Locating file in Storage bucket...`);
      
      const [files] = await storage.bucket().getFiles({ prefix: `renders/${data.userId}/` });
      
      if (files.length > 0) {
        // Find the newest file
        files.sort((a, b) => new Date(b.metadata.timeCreated) - new Date(a.metadata.timeCreated));
        const newestFile = files[0];
        
        // Construct the public download URL based on Firebase Storage standards
        const bucket = "cynemoraai.firebasestorage.app";
        const fixedUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(newestFile.name)}?alt=media`;
        
        await db.collection("renders").doc(doc.id).update({
          videoUrl: fixedUrl
        });
        console.log(`✅ Successfully updated ${doc.id} to point directly to Storage: ${newestFile.name}`);
        fixedCount++;
      } else {
        console.log(`⚠️ No files found in storage for user ${data.userId}`);
      }
    }
  }

  if (fixedCount === 0) {
    console.log("No broken documents found.");
  } else {
    console.log(`Successfully repaired ${fixedCount} documents!`);
  }
}

fix().then(() => process.exit(0)).catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
