import { crocks, HyperErr, isHyperErr, R } from "./deps.js";

const { Async } = crocks;
const { ifElse, is, always, identity } = R;

export const handleHyperErr = ifElse(
  isHyperErr,
  Async.Resolved,
  Async.Rejected,
);

export const mapBucketDne = ifElse(
  is(Deno.errors.NotFound),
  always(HyperErr({ status: 404, msg: "bucket does not exist" })),
  (err) => {
    console.log(err);
    return err;
  },
);

export const checkDirExists = (path) =>
  Async.of(path)
    .chain(Async.fromPromise(Deno.stat.bind(Deno)))
    .bimap(
      mapBucketDne,
      identity,
    )
    .map(always(path));
