import {
  assert,
  assertEquals,
  assertObjectMatch,
  readAll,
  v4 as v4Generator,
} from "./dev_deps.js";

import createAdapter from "./adapter.js";

const v4 = v4Generator.generate.bind(v4Generator);

const adapter = createAdapter("./tmp");

function emptyReader() {
  return {
    read(_) {
      return Promise.resolve(null);
    },
  };
}

/**
 * Given a string, return a Reader that read the encoded string
 * into the provided buffer
 *
 * @param {string} text - the string to stream
 * @returns {Deno.Reader} - a Reader implementation
 */
function textReader(text = "") {
  const encoded = new TextEncoder().encode(text);
  let totalRead = 0;
  let finished = false;

  async function read(buf) {
    if (finished) {
      return null;
    }

    let result;
    const remaining = encoded.length - totalRead;

    // read into the buffer
    buf.set(encoded.subarray(totalRead, buf.byteLength), 0);

    if (remaining >= buf.byteLength) {
      result = buf.byteLength;
    } else {
      result = remaining;
    }

    if (result) {
      totalRead += result;
    }
    finished = totalRead === encoded.length;

    return await result;
  }

  return { read };
}

for await (const dirEntry of Deno.readDir("./tmp")) {
  if (dirEntry.isDirectory) {
    console.log("deleting test bucket: ", dirEntry);
    await Deno.remove(`./tmp/${dirEntry.name}`, { recursive: true });
  }
}

Deno.test("fs adapter make bucket", async () => {
  const bucket = v4();
  const result = await adapter.makeBucket(bucket);
  assert(result.ok);
  await adapter.removeBucket(bucket);
});

Deno.test("fs adapter make bucket - invalid name", async () => {
  const bucket = v4();
  const err = await adapter.makeBucket(`../${bucket}`);

  assertObjectMatch(err, {
    ok: false,
    status: 400,
    msg: "bucket name cannot contain relative path parts",
  });
});

Deno.test("fs adapter remove bucket", async () => {
  const bucket = v4();
  await adapter.makeBucket(bucket);
  const result = await adapter.removeBucket(bucket);
  assert(result.ok);
});

Deno.test("fs adapter remove bucket - 404 if not found", async () => {
  const bucket = v4();
  const result = await adapter.removeBucket(bucket);
  assert(!result.ok);
  assertEquals(result.status, 404);
});

Deno.test("fs adapter all methods 404 - if bucket not found", async () => {
  const object = v4() + ".txt";

  // test
  const stream = textReader("woop woop");

  const result = await adapter.putObject({
    bucket: "dne",
    object,
    stream,
  });

  assert(!result.ok);
  assertEquals(result.status, 404);
});

Deno.test("fs adapter put object", async () => {
  // setup
  const bucket = v4();
  const object = v4() + ".txt";
  await adapter.makeBucket(bucket);

  // test
  const stream = textReader("woop woop");

  const result = await adapter.putObject({
    bucket,
    object,
    stream,
  });
  assert(result.ok);

  // clean up

  // remove file
  await adapter.removeObject({
    bucket,
    object,
  });
  // remove Bucket
  await adapter.removeBucket(bucket).catch((err) => {
    console.log(JSON.stringify(err));
    return { ok: false };
  });
});

Deno.test("fs adapter get object", async () => {
  const bucket = v4();
  const object = v4() + ".txt";
  await adapter.makeBucket(bucket);

  const stream = textReader("hello world");

  await adapter.putObject({
    bucket,
    object,
    stream,
  });
  // test
  const s = await adapter.getObject({
    bucket,
    object,
  });

  const encodedResult = await readAll(s);
  // close the Reader
  s.close();

  assertEquals(new TextDecoder().decode(encodedResult), "hello world");

  // cleanup
  // remove file
  await adapter.removeObject({
    bucket,
    object,
  });
  // remove Bucket
  await adapter.removeBucket(bucket).catch(() => {
    return { ok: false };
  });
});

Deno.test("list files", async () => {
  const bucket = v4();
  const object = v4() + ".tmp";

  // setup
  await adapter.makeBucket(bucket);

  const stream = emptyReader();

  await adapter.putObject({
    bucket,
    object,
    stream,
  });

  // test
  const list = await adapter.listObjects({
    bucket,
  });

  assert(
    list.find((file) => file === object),
  );

  // clean up
  await adapter.removeObject({
    bucket,
    object,
  });
  await adapter.removeBucket(bucket);
});
