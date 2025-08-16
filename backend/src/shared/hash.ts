export async function hash(data: string) {
  const encoder = new TextEncoder();
  const digestBytes = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(data),
  );
  // Now base64 encode the digest bytes
  return btoa(String.fromCharCode(...new Uint8Array(digestBytes)));
}
