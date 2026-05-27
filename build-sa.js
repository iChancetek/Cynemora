const fs = require('fs');

try {
  const env = fs.readFileSync('.env.local', 'utf8');

  const extract = (key) => {
    // Look for KEY="value" or KEY=value
    const regex = new RegExp(key + '="?(.*?)"?(?:\\n|\\r|$)');
    const match = env.match(regex);
    if (!match) return null;
    let val = match[1];
    // Unescape newlines for private key
    val = val.replace(/\\n/g, '\n');
    return val;
  };

  const sa = {
    type: 'service_account',
    project_id: extract('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    private_key_id: '',
    private_key: extract('FIREBASE_PRIVATE_KEY'),
    client_email: extract('FIREBASE_CLIENT_EMAIL'),
    client_id: extract('FIREBASE_CLIENT_ID'),
    auth_uri: extract('FIREBASE_AUTH_URI'),
    token_uri: extract('FIREBASE_TOKEN_URI'),
    auth_provider_x509_cert_url: extract('FIREBASE_AUTH_PROVIDER_X509_CERT_URL'),
    client_x509_cert_url: extract('FIREBASE_CLIENT_X509_CERT_URL'),
    universe_domain: extract('FIREBASE_UNIVERSE_DOMAIN')
  };

  fs.writeFileSync('service-account.json', JSON.stringify(sa, null, 2));
  console.log("Service account JSON created.");
} catch (e) {
  console.error("Error creating SA:", e);
}
