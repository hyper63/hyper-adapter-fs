import { crocks, HyperErr, isHyperErr, path, R } from './deps.js'

const { Async } = crocks
const { always, is, ifElse } = R

export const handleHyperErr = ifElse(
  isHyperErr,
  Async.Resolved,
  Async.Rejected,
)

/**
 * hyper63 adapter for the storage port
 *
 * This adapter uses the file system
 * as the implementation details for
 * the storage port.
 *
 * @typedef {Object} StorageInfo
 * @property {string} bucket
 * @property {string} object
 *
 * @typedef {Object} StorageObject
 * @property {string} bucket
 * @property {string} object
 * @property {stream} stream
 *
 * @typedef {Object} Response
 * @property {boolean} ok
 * @property {string} [msg] - error message
 */
/**
 * @param {string} path
 * @returns {Object}
 */
export default function (root) {
  if (!root) {
    throw new Error(
      'STORAGE: FS_Adapter: root directory required for this service!',
    )
  }

  const open = Async.fromPromise(Deno.open.bind(Deno))
  const mkdir = Async.fromPromise(Deno.mkdir.bind(Deno))
  const rm = Async.fromPromise(Deno.remove.bind(Deno))
  const rmdir = Async.fromPromise(Deno.remove.bind(Deno))
  const stat = Async.fromPromise(Deno.stat.bind(Deno))

  const resolvePathFromRoot = (...pieces) => path.resolve(path.join(root, ...pieces))

  const checkRelativeParts = (path) =>
    Async.of(path.includes('..'))
      .chain((invalid) =>
        !invalid ? Async.Resolved(path) : Async.Rejected(
          HyperErr({
            status: 400,
            msg: 'cannot contain relative path parts',
          }),
        )
      )

  const checkBucketName = (name) =>
    checkRelativeParts(name)
      /**
       * A bucket name also cannot contain slashes
       */
      .map((name) => name.includes('/') || name.includes('\\'))
      .chain((invalid) =>
        !invalid ? Async.Resolved(name) : Async.Rejected(
          HyperErr({
            status: 400,
            msg: 'bucket name cannot contain slashes',
          }),
        )
      )

  const checkPathExists = (path, resource = 'bucket') =>
    Async.of(path)
      .chain(stat)
      .bimap(
        (err) => {
          if (is(Deno.errors.NotFound)) {
            return HyperErr({ status: 404, msg: `${resource} does not exist` })
          }
          return err
        },
        always(path),
      )

  const checkObjectPath = ({ bucket, object }) =>
    Async.all([
      // Bucket checks
      Async.all([
        checkBucketName(bucket),
        checkPathExists(resolvePathFromRoot(bucket)),
      ]),
      // Object checks
      Async.all([
        checkRelativeParts(object),
        checkPathExists(resolvePathFromRoot(bucket, object), 'object'),
      ]),
    ])
      .map(() => resolvePathFromRoot(bucket, object))

  /**
   * @param {string} name
   * @returns {Promise<Response>}
   */
  function makeBucket(name) {
    return Async.of(name)
      .chain(checkBucketName)
      .map((name) => resolvePathFromRoot(name))
      .chain((path) =>
        checkPathExists(path).bichain(
          () => Async.Resolved(path),
          () =>
            Async.Rejected(
              HyperErr({ status: 409, msg: 'bucket already exists' }),
            ),
        )
      )
      // Make the directory as the new bucket
      .chain((dir) => mkdir(dir, { recursive: true }))
      .map(always({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise()
  }

  /**
   * @param {string} name
   * @returns {Promise<Response>}
   */
  function removeBucket(name) {
    return Async.of(name)
      .chain(checkBucketName)
      .chain((name) => checkPathExists(resolvePathFromRoot(name)))
      // Delete all contents of directory, then directory
      .chain((bucket) => rmdir(bucket, { recursive: true }))
      .map(always({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise()
  }

  /**
   * @param {StorageObject}
   * @returns {Promise<Response>}
   */
  function putObject({ bucket, object, stream, useSignedUrl }) {
    if (useSignedUrl) {
      return Promise.resolve(
        HyperErr({
          status: 501,
          msg: 'Not Implemented',
        }),
      )
    }

    return Async.all([
      // Bucket checks
      Async.all([
        checkBucketName(bucket),
        checkPathExists(resolvePathFromRoot(bucket)),
      ]),
      // Object checks
      Async.all([
        checkRelativeParts(object),
      ]),
    ])
      .map(() => resolvePathFromRoot(bucket, object))
      /**
       * Check if the sub-directory in the bucket exists,
       * and create it if it does not
       */
      .chain((p) =>
        checkPathExists(path.dirname(p))
          .bichain(
            /**
             * The directory does not exist within the bucket, so create it
             */
            () => mkdir(path.dirname(p), { recursive: true }).map(() => p),
            /**
             * The directory does exist with the bucket, so simply noop
             */
            () => Async.Resolved(p),
          )
      )
      .chain((path) => {
        return open(path, { create: true, write: true, truncate: true })
      })
      .chain(Async.fromPromise((file) => {
        return stream.pipeTo(file.writable)
      }))
      .map(always({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      ).toPromise()
  }

  /**
   * @param {StorageInfo}
   * @returns {Promise<Response>}
   */
  function removeObject({ bucket, object }) {
    return checkObjectPath({ bucket, object })
      .map(() => resolvePathFromRoot(bucket, object))
      .chain(rm)
      .map(always({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      ).toPromise()
  }

  /**
   * @param {StorageInfo}
   * @returns {Promise<stream>}
   */
  function getObject({ bucket, object, useSignedUrl }) {
    if (useSignedUrl) {
      return Promise.resolve(
        HyperErr({
          status: 501,
          msg: 'Not Implemented',
        }),
      )
    }

    return checkObjectPath({ bucket, object })
      .chain((p) => open(p, { read: true, write: false }))
      .map((file) => file.readable)
      .bichain(
        handleHyperErr,
        Async.Resolved,
      ).toPromise()
  }

  function listObjects({ bucket, prefix = '' }) {
    return Async.all([
      checkBucketName(bucket),
      checkPathExists(resolvePathFromRoot(bucket)),
    ])
      .chain(() =>
        /**
         * At this point, we know the bucket exists, but the prefix may not,
         * but that shouldn't result in an error
         *
         * So if the prefix does not exist we just return an empty list of objects
         */
        checkPathExists(resolvePathFromRoot(bucket, prefix)).bichain(
          () => Async.Resolved({ ok: true, objects: [] }),
          Async.fromPromise(async (path) => {
            const files = []
            try {
              for await (const dirEntry of Deno.readDir(path)) {
                files.push(dirEntry.name)
              }

              return { ok: true, objects: files }
            } catch (err) {
              if (is(Deno.errors.NotFound)) {
                return HyperErr({ status: 404, msg: `${resource} does not exist` })
              }
              throw err
            }
          }),
        )
      )
      .bichain(
        handleHyperErr,
        Async.Resolved,
      ).toPromise()
  }

  return Object.freeze({
    makeBucket,
    removeBucket,
    listBuckets: () => Promise.resolve(null),
    putObject,
    removeObject,
    getObject,
    listObjects,
  })
}
