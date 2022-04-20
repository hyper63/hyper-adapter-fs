import { crocks, HyperErr, isHyperErr, path, R } from "./deps.js";
import { handleHyperErr, mapBucketDne } from "./utils.js";

const { Async } = crocks;
const { always, identity } = R;

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
      "STORAGE: FS_Adapter: root directory required for this service!",
    );
  }

  const open = Async.fromPromise(Deno.open.bind(Deno));
  const mkdir = Async.fromPromise(Deno.mkdir.bind(Deno));
  const rm = Async.fromPromise(Deno.remove.bind(Deno));
  const rmdir = Async.fromPromise(Deno.remove.bind(Deno));
  const create = Async.fromPromise(Deno.create.bind(Deno));
  const copy = Async.fromPromise(Deno.copy.bind(Deno));

  const resolvePath = (...pieces) => path.resolve(path.join(root, ...pieces));

  /**
   * @param {string} name
   * @returns {Promise<Response>}
   */
  function makeBucket(name) {
    return Async.of(name.includes(".."))
      .chain((invalid) =>
        !invalid ? Async.Resolved(resolvePath(name)) : Async.Rejected(
          HyperErr({
            status: 400,
            msg: "bucket name cannot contain relative path parts",
          }),
        )
      )
      // see https://doc.deno.land/deno/stable/~/Deno.mkdir
      .chain((dir) =>
        mkdir(dir, { recursive: true }).bimap(
          (err) => HyperErr({ msg: err.message }),
          always({ ok: true }),
        )
      )
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise();
  }

  /**
   * @param {string} name
   * @returns {Promise<Response>}
   */
  function removeBucket(name) {
    return Async.of(resolvePath(name))
      // deletes all contents of directory, then directory
      .chain((bucket) => rmdir(bucket, { recursive: true }))
      .bimap(
        mapBucketDne,
        identity,
      )
      .map(always({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise();
  }

  /**
   * @param {StorageObject}
   * @returns {Promise<Response>}
   */
  function putObject({ bucket, object, stream }) {
    // Create Writer
    return Async.of(resolvePath(bucket, object))
      .chain(create)
      .bimap(
        mapBucketDne,
        identity,
      )
      // Copy Reader into Writer
      .chain((file) => {
        const close = Async.fromPromise(() => Promise.resolve(file.close()));

        return copy(stream, file)
          .bichain(
            (err) => close().map(always(err)),
            (res) => close().map(always(res)),
          );
      })
      .map(always({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      ).toPromise();
  }

  /**
   * @param {StorageInfo}
   * @returns {Promise<Response>}
   */
  function removeObject({ bucket, object }) {
    return Async.of(resolvePath(bucket, object))
      .chain(rm)
      .bimap(
        mapBucketDne,
        identity,
      )
      .map(always({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      ).toPromise();
  }

  /**
   * @param {StorageInfo}
   * @returns {Promise<stream>}
   */
  function getObject({ bucket, object }) {
    return Async.of(resolvePath(bucket, object))
      .chain((p) => open(p, { read: true, write: false }))
      .bimap(
        mapBucketDne,
        identity,
      )
      .bichain(
        handleHyperErr,
        Async.Resolved,
      ).toPromise();
  }

  async function listObjects({ bucket, prefix = "" }) {
    const files = [];
    try {
      for await (
        const dirEntry of Deno.readDir(
          resolvePath(bucket, prefix),
        )
      ) {
        files.push(dirEntry.name);
      }

      return files;
    } catch (err) {
      // deno-lint-ignore no-ex-assign
      err = mapBucketDne(err);
      if (isHyperErr(err)) {
        return err;
      }
      throw err;
    }
  }

  return Object.freeze({
    makeBucket,
    removeBucket,
    listBuckets: () => Promise.resolve(null),
    putObject,
    removeObject,
    getObject,
    listObjects,
  });
}
