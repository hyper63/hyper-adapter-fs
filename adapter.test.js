import { assert, assertEquals, assertObjectMatch } from './dev_deps.js'

import createAdapter from './adapter.js'

const v4 = () => crypto.randomUUID()

const adapter = createAdapter('./tmp')

for await (const dirEntry of Deno.readDir('./tmp')) {
  if (dirEntry.isDirectory) {
    console.log('deleting test bucket: ', dirEntry)
    await Deno.remove(`./tmp/${dirEntry.name}`, { recursive: true })
  }
}

Deno.test('fs adapter make bucket', async () => {
  const bucket = v4()
  const result = await adapter.makeBucket(bucket)
  assert(result.ok)
  await adapter.removeBucket(bucket)
})

Deno.test('fs adapter make bucket - invalid name', async () => {
  const bucket = v4()
  const err = await adapter.makeBucket(`../${bucket}`)

  assertObjectMatch(err, {
    ok: false,
    status: 400,
    msg: 'cannot contain relative path parts',
  })
})

Deno.test('fs adapter make bucket - 409 if already exists', async () => {
  const bucket = v4()
  await adapter.makeBucket(bucket)
  const result = await adapter.makeBucket(bucket)

  assert(!result.ok)
  assertEquals(result.status, 409)
  await adapter.removeBucket(bucket)
})

Deno.test('fs adapter remove bucket', async () => {
  const bucket = v4()
  await adapter.makeBucket(bucket)
  const result = await adapter.removeBucket(bucket)
  assert(result.ok)
})

Deno.test('fs adapter remove bucket - 404 if not found', async () => {
  const bucket = v4()
  const result = await adapter.removeBucket(bucket)
  assert(!result.ok)
  assertEquals(result.status, 404)
})

Deno.test('fs adapter all methods 404 - if bucket not found', async () => {
  const object = v4() + '.txt'

  // test
  const stream = new Response(new TextEncoder().encode('woop woop')).body

  const result = await adapter.putObject({ bucket: 'dne', object, stream })

  assert(!result.ok)
  assertEquals(result.status, 404)
})

Deno.test('fs adapter put object', async () => {
  // setup
  const bucket = v4()
  const object = v4() + '.txt'
  await adapter.makeBucket(bucket)

  // test
  const stream = new Response('woop woop').body

  const result = await adapter.putObject({ bucket, object, stream })
  assert(result.ok)

  // clean up

  // remove file
  await adapter.removeObject({ bucket, object })
  // remove Bucket
  await adapter.removeBucket(bucket)
})

Deno.test('fs adapter put object - useSignedUrl', async () => {
  // setup
  const bucket = v4()
  const object = v4() + '.txt'
  await adapter.makeBucket(bucket)

  // test
  const result = await adapter.putObject({ bucket, object, useSignedUrl: true }).catch((err) => err)
  assert(!result.ok)
  assert(result.status === 501)
})

Deno.test('fs adapter get object', async () => {
  const bucket = v4()
  const object = v4() + '.txt'
  await adapter.makeBucket(bucket)

  const stream = new Response('hello world').body

  await adapter.putObject({
    bucket,
    object,
    stream,
  })
  // test
  const s = await adapter.getObject({ bucket, object })

  const result = await new Response(s).text()

  assertEquals(result, 'hello world')

  // cleanup
  // remove file
  await adapter.removeObject({ bucket, object })
  // remove Bucket
  await adapter.removeBucket(bucket)
})

Deno.test('fs adapter get object - useSignedUrl', async () => {
  // setup
  const bucket = v4()
  const object = v4() + '.txt'
  await adapter.makeBucket(bucket)

  // test
  const result = await adapter.getObject({ bucket, object, useSignedUrl: true }).catch((err) => err)
  assert(!result.ok)
  assert(result.status === 501)
})

Deno.test('list files', async () => {
  const bucket = v4()
  const object = v4() + '.tmp'

  // setup
  await adapter.makeBucket(bucket)

  const stream = new Response('woop woop').body

  await adapter.putObject({ bucket, object, stream })

  // test
  const { objects } = await adapter.listObjects({ bucket })

  assert(objects.find((file) => file === object))

  // clean up
  await adapter.removeObject({ bucket, object })
  await adapter.removeBucket(bucket)
})
