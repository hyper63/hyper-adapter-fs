// Harness deps
import { default as appOpine } from "https://x.nest.land/hyper-app-opine@2.0.0/mod.js";
import { default as core } from "https://x.nest.land/hyper@3.0.0/mod.js";

import fs from "../mod.js";

const hyperConfig = {
  app: appOpine,
  adapters: [
    { port: "storage", plugins: [fs({ dir: './tmp' })] },
  ],
};

core(hyperConfig);