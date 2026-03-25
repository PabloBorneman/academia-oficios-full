"use strict";

const path = require("path");
const fs = require("fs/promises");
const { createJsonStore } = require("../lib/jsonStore");

async function main() {
  // OJO: probamos con un archivo de test, NO con cursos_2026.json
  const testFile = path.join(__dirname, "..", "data", "_store_test.json");

  const store = createJsonStore({
    filePath: testFile,
    defaultValue: [],
    validateRoot: Array.isArray,
  });

  // Generamos muchas updates concurrentes: la cola debe serializarlas sin corromper el JSON
  const N = 25;

  await Promise.all(
    Array.from({ length: N }).map((_, i) =>
      store.update((arr) => {
        arr.push({ id: i + 1, ts: Date.now() });
        return arr;
      })
    )
  );

  const final = await store.read();
  if (!Array.isArray(final) || final.length !== N) {
    throw new Error(`Fallo: esperado ${N}, obtuve ${final.length}`);
  }

  console.log("OK ✅ store queue + atomic write. items =", final.length);

  // limpieza
  await fs.rm(testFile, { force: true });
  console.log("OK ✅ cleanup:", testFile);
}

main().catch((err) => {
  console.error("TEST FAILED ❌", err);
  process.exit(1);
});
