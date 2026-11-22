import { readFileSync } from "node:fs";
import process from "node:process";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const lockfile = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const exactVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;

for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
  for (const [name, version] of Object.entries(manifest[section] ?? {})) {
    if (!exactVersion.test(version) || lockfile.packages[`node_modules/${name}`]?.version !== version) {
      console.error(`${section}.${name} must specify the exact version in package-lock.json (found ${version}).`);
      process.exitCode = 1;
    }
  }
}
