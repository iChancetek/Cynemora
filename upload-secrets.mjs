import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import dotenv from 'dotenv';
import fs from 'fs';

// Load .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

// Setup credentials from the .env.local
const projectId = envConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = envConfig.FIREBASE_CLIENT_EMAIL;
const privateKey = envConfig.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

const client = new SecretManagerServiceClient({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  }
});

async function createOrUpdateSecret(secretId, payload) {
  const parent = `projects/${projectId}`;
  let secretPath = `${parent}/secrets/${secretId}`;

  // Check if secret exists
  try {
    await client.getSecret({ name: secretPath });
    console.log(`Secret ${secretId} already exists. Adding new version...`);
  } catch (err) {
    if (err.code === 5) { // NOT_FOUND
      console.log(`Creating secret ${secretId}...`);
      await client.createSecret({
        parent,
        secretId,
        secret: {
          replication: {
            automatic: {},
          },
        },
      });
    } else {
      throw err;
    }
  }

  // Add a new version
  const [version] = await client.addSecretVersion({
    parent: secretPath,
    payload: {
      data: Buffer.from(payload, 'utf8'),
    },
  });

  console.log(`Added version ${version.name} to ${secretId}.`);
}

async function run() {
  const keysToUpload = [
    'GEMINI_API_KEY',
    'OPENAI_API_KEY'
  ];

  for (const key of keysToUpload) {
    if (envConfig[key]) {
      try {
        await createOrUpdateSecret(key, envConfig[key]);
      } catch (e) {
        console.error(`Failed to upload ${key}:`, e.message);
      }
    } else {
      console.log(`Skipping ${key} - not found in .env.local`);
    }
  }
  console.log('Finished uploading secrets!');
}

run().catch(console.error);
