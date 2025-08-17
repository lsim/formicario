import { User } from './auth/tokens.ts';
import { kv } from './kv.ts';
import { broadcast } from './subscription.ts';
import { Err, hash, Ok, OkJson, unzip, zip } from './util.ts';

export class AntPublication {
  public authorName?: string;
  public authorId?: string;
  constructor(
    public name: string,
    public color: string,
    public code: unknown,
    public id: string,
    public timestamp: number,
    public description: string,
    public lamport: number,
    public codeHash: string,
    authorId?: string,
  ) {
    this.authorId = authorId;
  }
}

export async function getPublication(id: string) {
  if (!id) throw Error('No publication id');
  const res = await kv.get<AntPublication>(['publications', id]);

  if (!res.value) throw Error(`No publication found with id ${id}`);

  res.value.code = await unzip(res.value.code as Uint8Array);

  return res.value;
}

// let builtinPublications: AntPublication[] | null = null;
// export async function loadBuiltinPublications() {
//   if (builtinPublications) return builtinPublications;
//   const antFiles = Deno.readDir('../ants');
//
//   const publications: AntPublication[] = [];
//   for await (const file of antFiles) {
//     if (!file.name.endsWith('.js')) continue;
//     const code = await Deno.readTextFile(`../ants/${file.name}`);
//     const id = file.name.replace(/\.js$/, '');
//     publications.push(
//       new AntPublication(
//         id,
//         '',
//         '',
//         id,
//         0,
//         '',
//         0,
//         await hash(code),
//         'built-in',
//       ),
//     );
//   }
//   builtinPublications = publications;
//   return publications;
// }
//
// loadBuiltinPublications();

export async function getPublications(): Promise<AntPublication[]> {
  const publications = kv.list<AntPublication>({ prefix: ['publications'] });
  // Return shallow publication objects
  const result = [];
  for await (const entry of publications) {
    const b = entry.value;
    if (!b.authorId) continue;
    const user = await kv.get<User>(['users-by-id', b.authorId]);
    b.authorName = user.value?.username;
    b.code = null;
    result.push(b);
  }
  return result;
}

async function storePublication(
  name: string,
  color: string,
  code: string,
  timestamp: number,
  description: string,
  id: string | null,
  userId: string,
  lamport: number,
) {
  const publicationId = id || crypto.randomUUID();

  if (!name) return Err('No publication name', 400);
  if (!code) return Err('No publication code', 400);
  if (!timestamp) return Err('No publication timestamp', 400);

  const compressedCode = await zip(code);
  const codeHash = await hash(code);

  const specificPublicationKey = ['publications', publicationId];
  // Increment lamport for the object we save. Compare old lamport with the existing object
  const publication = new AntPublication(
    name,
    color,
    compressedCode,
    publicationId,
    timestamp,
    description,
    lamport + 1,
    codeHash,
    userId,
  );

  const oldPublication = await kv.get<AntPublication>(specificPublicationKey);
  if (oldPublication) {
    // Extract lamport and verify that it matches the submitted lamport
    if (
      oldPublication.value.lamport != null &&
      oldPublication.value.lamport !== lamport
    ) {
      return Err('Lamport mismatch', 409);
    }
  }
  await kv.atomic()
    // Make sure nobody else overwrote with same lamport
    .check(oldPublication)
    .set(specificPublicationKey, publication)
    .commit();
  broadcast({
    type: 'publications-updated',
  });

  return OkJson(
    { id: publicationId, lamport: publication.lamport },
    id ? 200 : 201,
  );
}

async function updatePublicationMeta(
  id: string,
  description: string,
  timestamp: number,
  userId: string,
  lamport: number,
) {
  const specificPublicationKey = ['publications', id];
  const res = await kv.get<AntPublication>(specificPublicationKey);
  if (!res.value) return Err('No publication found', 404);
  if (res.value.authorId !== userId) return Err('Not authorized', 403);
  if (description) res.value.description = description;
  if (timestamp) res.value.timestamp = timestamp;

  // Extract lamport and verify that it matches the submitted lamport
  if (res.value.lamport != null && res.value.lamport !== lamport) {
    return Err('Lamport mismatch', 409);
  }
  res.value.lamport += 1;
  // await kv.set(['publications', id], res.value);
  await kv.atomic()
    // Make sure nobody else overwrote with same lamport
    .check(res)
    .set(specificPublicationKey, res.value)
    .commit();
  broadcast({
    type: 'publications-updated',
  });
  return OkJson({ id: res.value.id, lamport: res.value.lamport }, 200);
}

async function deletePublication(id: string, userId: string) {
  const res = await kv.get<AntPublication>(['publications', id]);
  if (!res.value) return Err('No publication found', 404);
  if (res.value.authorId !== userId) return Err('Not authorized', 403);
  await kv.delete(['publications', id]);
  broadcast({
    type: 'publications-updated',
  });
  return Ok(`${res.value.name} deleted`, 200);
}

export async function handlePublicationRequest(
  request: Request,
  id: string,
  user: User | null,
) {
  if (request.method === 'GET') {
    if (id) {
      if (!user) return Err('Not authorized', 401);
      return OkJson(await getPublication(id));
    } else return OkJson(await getPublications());
  } else if (request.method === 'POST') {
    if (!user) return Err('Not authorized', 401);
    const json = await request.json();
    return storePublication(
      json.name,
      json.color,
      json.code,
      json.timestamp,
      json.description,
      id,
      user.userId,
      json.lamport || 0,
    );
  } else if (request.method === 'PATCH') {
    if (!user) return Err('Not authorized', 401);
    const { description, timestamp, lamport } = await request.json();
    return updatePublicationMeta(
      id,
      description,
      timestamp,
      user.userId,
      lamport || 0,
    );
  } else if (request.method === 'DELETE') {
    if (!user) return Err('Not authorized', 401);
    return deletePublication(id, user.userId);
  }
  return Err('Not found', 404);
}
