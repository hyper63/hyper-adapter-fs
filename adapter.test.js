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

Deno.test('adapter', async (t) => {
  await t.step('all', async (t) => {
    await t.step(
      'should return a HyperErr with status 404 if the folder is not found',
      async () => {
        const object = v4() + '.txt'

        // test
        const stream = new Response(new TextEncoder().encode('woop woop')).body

        const result = await adapter.putObject({ bucket: 'dne', object, stream })

        assert(!result.ok)
        assertEquals(result.status, 404)
      },
    )

    await t.step(
      'should return a HyperErr if the bucket name is contains relative parts',
      async () => {
        const bucket = v4()
        const err = await adapter.makeBucket(`../${bucket}`)

        assertObjectMatch(err, {
          ok: false,
          status: 400,
          msg: 'cannot contain relative path parts',
        })
      },
    )

    await t.step(
      'should return a HyperErr with status 400 if the bucket name contains slashes',
      async () => {
        const bucket = v4()
        const err = await adapter.makeBucket(`${bucket}/foo`)

        assertObjectMatch(err, {
          ok: false,
          status: 400,
          msg: 'bucket name cannot contain slashes',
        })

        const backwardsSlash = await adapter.makeBucket(`${bucket}\\foo`)

        assertObjectMatch(backwardsSlash, {
          ok: false,
          status: 400,
          msg: 'bucket name cannot contain slashes',
        })
      },
    )
  })

  await t.step('makeBucket', async (t) => {
    await t.step('should create the folder', async () => {
      const bucket = v4()
      const result = await adapter.makeBucket(bucket)
      assert(result.ok)
      await adapter.removeBucket(bucket)
    })

    await t.step(
      'should return a HyperErr with status 409 if the bucket already exists',
      async () => {
        const bucket = v4()
        await adapter.makeBucket(bucket)
        const result = await adapter.makeBucket(bucket)

        assert(!result.ok)
        assertEquals(result.status, 409)
        await adapter.removeBucket(bucket)
      },
    )
  })

  await t.step('removeBucket', async (t) => {
    await t.step('should remove the folder', async () => {
      const bucket = v4()
      await adapter.makeBucket(bucket)
      const result = await adapter.removeBucket(bucket)
      assert(result.ok)
    })

    await t.step(
      'should return a HyperErr with status 404 if the folder does not exist',
      async () => {
        const bucket = v4()
        const result = await adapter.removeBucket(bucket)
        assertObjectMatch(result, {
          ok: false,
          status: 404,
          msg: 'bucket does not exist',
        })
      },
    )
  })

  await t.step('putObject', async (t) => {
    await t.step('should put the object into the folder', async () => {
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

    await t.step('should put the object into the sub-folder', async () => {
      // setup
      const bucket = v4()
      const object = `foo/${v4() + '.txt'}`
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

    await t.step(
      'should return a HyperErr with a status of 501 when requesting a signed url',
      async () => {
        // setup
        const bucket = v4()
        const object = v4() + '.txt'
        await adapter.makeBucket(bucket)

        // test
        const result = await adapter.putObject({ bucket, object, useSignedUrl: true }).catch((
          err,
        ) => err)

        assertObjectMatch(result, {
          ok: false,
          status: 501,
        })
        // remove Bucket
        await adapter.removeBucket(bucket)
      },
    )
  })

  await t.step('getObject', async (t) => {
    await t.step('should retrieve the object from the folder', async () => {
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

    await t.step(
      'should return a HyperErr with status 404 if the object does not exist',
      async () => {
        const bucket = v4()
        const object = v4() + '.txt'
        await adapter.makeBucket(bucket)

        // test
        const result = await adapter.getObject({ bucket, object })

        assertObjectMatch(result, {
          ok: false,
          status: 404,
          msg: 'object does not exist',
        })
        // remove Bucket
        await adapter.removeBucket(bucket)
      },
    )

    await t.step(
      'should return a HyperErr with a status of 501 when requesting a signed url',
      async () => {
        // setup
        const bucket = v4()
        const object = v4() + '.txt'
        await adapter.makeBucket(bucket)

        // test
        const result = await adapter.getObject({ bucket, object, useSignedUrl: true }).catch((
          err,
        ) => err)
        const getResult = await adapter.getObject({ bucket, object })

        assertObjectMatch(getResult, {
          ok: false,
          status: 404,
          msg: 'object does not exist',
        })

        assertObjectMatch(result, {
          ok: false,
          status: 501,
        })
        // remove Bucket
        await adapter.removeBucket(bucket)
      },
    )
  })

  await t.step('removeObject', async (t) => {
    await t.step('should remove the object', async () => {
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
      const res = await adapter.removeObject({ bucket, object })
      assert(res.ok)

      // cleanup
      // remove Bucket
      await adapter.removeBucket(bucket)
    })

    await t.step(
      'should return a HyperErr with status 404 if the object does not exist',
      async () => {
        const bucket = v4()
        const object = v4() + '.txt'
        await adapter.makeBucket(bucket)

        // test
        const result = await adapter.removeObject({ bucket, object })

        assertObjectMatch(result, {
          ok: false,
          status: 404,
          msg: 'object does not exist',
        })
        // remove Bucket
        await adapter.removeBucket(bucket)
      },
    )
  })

  await t.step('listObjects', async (t) => {
    await t.step('should list the objects in the path', async () => {
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

    await t.step(
      'should return an empty list of objects if the prefix does not exist',
      async () => {
        const bucket = v4()
        const object = v4() + '.tmp'

        // setup
        await adapter.makeBucket(bucket)
        const stream = new Response('woop woop').body
        await adapter.putObject({ bucket, object, stream })

        // test
        const { objects } = await adapter.listObjects({ bucket, prefix: '/foo' })

        assertEquals(objects.length, 0)
        await adapter.removeBucket(bucket)
      },
    )

    await t.step(
      'should return a HyperErr with status 404 if the bucket does not exist',
      async () => {
        const bucket = v4()

        // test
        const result = await adapter.listObjects({ bucket })

        assertObjectMatch(result, {
          ok: false,
          status: 404,
          msg: 'bucket does not exist',
        })
      },
    )
  })
})
