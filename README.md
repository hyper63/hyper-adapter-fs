<h1 align="center">hyper-adapter-fs</h1>
<p align="center">A Storage port adapter that uses the local file system for object storage in the <a href="https://hyper.io/">hyper</a>  service framework</p>
</p>
<p align="center">
  <a href="https://nest.land/package/hyper-adapter-fs"><img src="https://nest.land/badge.svg" alt="Nest Badge" /></a>
  <a href="https://github.com/hyper63/hyper-adapter-fs/actions/workflows/test-and-publish.yml"><img src="https://github.com/hyper63/hyper-adapter-fs/actions/workflows/test-and-publish.yml/badge.svg" alt="Test" /></a>
  <a href="https://github.com/hyper63/hyper-adapter-fs/tags/"><img src="https://img.shields.io/github/tag/hyper63/hyper-adapter-fs" alt="Current Version" /></a>
</p>

---

## Table of Contents

- [Getting Started](#getting-started)
- [Installation](#installation)
- [Features](#features)
- [Methods](#methods)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

`hyper.config.js`

```js
import { default as fs } from 'https://x.nest.land/hyper-adapter-fs@2.0.3/mod.js'

export default {
  app,
  adapter: [{ port: 'storage', plugins: [fs({ dir: './data' })] }],
}
```

## Installation

This is a Deno module available to import from
[nest.land](https://nest.land/package/hyper-adapter-fs)

deps.js

```js
export { default as fs } from 'https://x.nest.land/hyper-adapter-fs@2.0.3/mod.js'
```

## Features

- Create an bucket as a directory
- Remove an bucket as a directory
- List buckets as directories
- Put an object into a bucket as a directory
- Remove an object from a bucket as a directory
- Get an object from a bucket as a directory
- List objects in a bucket as a directory

## Methods

This adapter fully implements the Storage port and can be used as the
[hyper Storage service](https://docs.hyper.io/storage-api) adapter

See the full port [here](https://nest.land/package/hyper-port-storage)

## Contributing

Contributions are welcome! See the hyper
[contribution guide](https://docs.hyper.io/contributing-to-hyper)

## Testing

```
deno task test
```

To lint, check formatting, and run unit tests

## License

Apache-2.0
