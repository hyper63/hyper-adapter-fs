# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [3.0.2](https://github.com/hyper63/hyper-adapter-fs/compare/v3.0.1...v3.0.2) (2023-11-28)

## [3.0.1](https://github.com/hyper63/hyper-adapter-fs/compare/v3.0.0...v3.0.1) (2023-05-23)

## [3.0.0](https://github.com/hyper63/hyper-adapter-fs/compare/v2.1.0...v3.0.0) (2023-05-17)


### ⚠ BREAKING CHANGES

* putObject accepts a ReadableStream and getObject
returns a ReadableStream.

### Features

* beef up coverage and address issues [#10](https://github.com/hyper63/hyper-adapter-fs/issues/10) ([06b3e16](https://github.com/hyper63/hyper-adapter-fs/commit/06b3e16ff33770491db53d429e08d544e6b3b129))
* getObject and putObject return and accept a ReadableStream [#10](https://github.com/hyper63/hyper-adapter-fs/issues/10) ([a16e53d](https://github.com/hyper63/hyper-adapter-fs/commit/a16e53d34397248cbbd40225b881f5919ae4e516))

## [2.1.0](https://github.com/hyper63/hyper-adapter-fs/compare/v2.0.3...v2.1.0) (2022-08-30)


### Features

* useSignedUrl returns 501 for getObject and putObject [#7](https://github.com/hyper63/hyper-adapter-fs/issues/7) [#8](https://github.com/hyper63/hyper-adapter-fs/issues/8) ([c3f4ece](https://github.com/hyper63/hyper-adapter-fs/commit/c3f4ece16684e74dc5a067d6a08b6b077c62b734))

### [2.0.3](https://github.com/hyper63/hyper-adapter-fs/compare/v2.0.2...v2.0.3) (2022-04-20)


### Bug Fixes

* 404 if bucket not found [#5](https://github.com/hyper63/hyper-adapter-fs/issues/5) ([68c7c10](https://github.com/hyper63/hyper-adapter-fs/commit/68c7c105f6751a97943685b8b4c854e53dacbfa7))
* 409 on makeBucket if already exists ([5561537](https://github.com/hyper63/hyper-adapter-fs/commit/55615377494e56ecc386764a3ed0f7fca6e97141))
