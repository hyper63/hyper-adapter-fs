// Harness deps
import { default as appExpress } from 'https://raw.githubusercontent.com/hyper63/hyper/hyper-app-express%40v1.2.1/packages/app-express/mod.ts'
import { default as core } from 'https://raw.githubusercontent.com/hyper63/hyper/hyper%40v4.3.1/packages/core/mod.ts'

import fs from '../mod.js'

const hyperConfig = {
  app: appExpress,
  adapters: [
    { port: 'storage', plugins: [fs({ dir: './tmp' })] },
  ],
}

core(hyperConfig)
