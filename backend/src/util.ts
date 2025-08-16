export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Include Authorization here
};

export function Ok(
  payload: BodyInit,
  statusCode?: number,
  contentType?: 'text' | 'json',
) {
  let contentHeader = null;
  if (contentType === 'text') {
    contentHeader = { 'Content-Type': 'text/plain' };
  } else if (contentType === 'json') {
    contentHeader = { 'Content-Type': 'application/json' };
  }
  return new Response(payload, {
    headers: { ...corsHeaders, ...contentHeader },
    status: statusCode || 200,
  });
}

export function OkJson(payload: object, statusCode?: number) {
  return Ok(JSON.stringify(payload), statusCode || 200, 'json');
}

export function Err(
  statusText: string,
  statusCode: number,
) {
  const contentHeader = { 'Content-Type': 'application/json' };
  return new Response(JSON.stringify({ error: statusText }), {
    status: statusCode,
    statusText: statusText,
    headers: { ...corsHeaders, ...contentHeader },
  });
}

export async function zip(data: string) {
  const encoderStream = new TextEncoderStream();
  const compressor = new CompressionStream('gzip');
  const textWriter = encoderStream.writable.getWriter();
  const reader = compressor.readable.getReader();
  const p = (async () => {
    const chunks: Uint8Array<ArrayBufferLike>[] = [];
    let finished = false;
    do {
      const { value, done } = await reader.read();
      if (value) chunks.push(value);
      finished = done;
    } while (!finished);
    return chunks;
  })();
  encoderStream.readable.pipeTo(compressor.writable).then();
  await textWriter.ready;
  await textWriter.write(data);
  await textWriter.close();
  const chunks = await p;
  return new Uint8Array(
    Array.prototype.concat(...chunks.map((c) => Array.from(c))),
  );
}

export async function unzip(archive: Uint8Array<ArrayBufferLike>) {
  const decoderStream = new TextDecoderStream();
  const decompressor = new DecompressionStream('gzip');
  const byteWriter = decompressor.writable.getWriter();
  const textReader = decoderStream.readable.getReader();
  const p = (async () => {
    let json = '';
    let finished = false;
    do {
      const { value, done } = await textReader.read();
      if (value) json += value;
      finished = done;
    } while (!finished);
    return json;
  })();

  decompressor.readable.pipeTo(decoderStream.writable).then();
  await byteWriter.ready;
  await byteWriter.write(archive);
  await byteWriter.close();
  return p;
}

export async function hash(data: string) {
  const encoder = new TextEncoder();
  const digestBytes = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(data),
  );
  // Now base64 encode the digest bytes
  return btoa(String.fromCharCode(...new Uint8Array(digestBytes)));
}
