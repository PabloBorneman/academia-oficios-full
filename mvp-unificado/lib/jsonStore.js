"use strict";

const path = require("path");
const fsSync = require("fs");
const fs = require("fs/promises");

/**
 * JSON Store con:
 * - Lectura consistente (espera escrituras en cola)
 * - Escritura atómica (tmp -> rename) con backup .bak (compatible Windows)
 * - Cola de escrituras (evita corrupción por writes concurrentes)
 */
function createJsonStore({
  filePath,
  defaultValue = [],
  validateRoot = (v) => Array.isArray(v),
} = {}) {
  if (!filePath) throw new Error("createJsonStore: filePath requerido");

  const abs = path.resolve(filePath);
  const dir = path.dirname(abs);
  const bak = abs + ".bak";

  // Cola: garantiza escrituras secuenciales (aunque una falle, la cola sigue)
  let writeChain = Promise.resolve();
  const enqueue = (op) => {
    writeChain = writeChain.then(op, op);
    return writeChain;
  };

  async function ensureFile() {
    await fs.mkdir(dir, { recursive: true });

    // Recuperación simple: si falta el file principal pero existe .bak, lo restaura
    const existsMain = fsSync.existsSync(abs);
    const existsBak = fsSync.existsSync(bak);
    if (!existsMain && existsBak) {
      await fs.rename(bak, abs);
      return;
    }

    if (!existsMain) {
      await fs.writeFile(abs, JSON.stringify(defaultValue, null, 2), "utf-8");
    }
  }

  async function readUnsafe() {
    await ensureFile();
    const raw = await fs.readFile(abs, "utf-8");
    const text = raw.replace(/^\uFEFF/, "").trim(); // quita BOM si existe
    const parsed = text ? JSON.parse(text) : defaultValue;

    if (!validateRoot(parsed)) throw new Error("JSON raíz inválido");
    return parsed;
  }

  async function atomicWriteUnsafe(nextValue) {
    await ensureFile();

    const tmp = `${abs}.tmp-${process.pid}-${Date.now()}`;
    const payload = JSON.stringify(nextValue, null, 2);

    // 1) escribir tmp
    await fs.writeFile(tmp, payload, "utf-8");

    // 2) mover actual a .bak (si existe)
    if (fsSync.existsSync(abs)) {
      // si ya existe bak, lo borra para poder renombrar
      if (fsSync.existsSync(bak)) await fs.rm(bak, { force: true });
      await fs.rename(abs, bak);
    }

    // 3) tmp -> main
    await fs.rename(tmp, abs);

    // 4) borrar backup
    if (fsSync.existsSync(bak)) await fs.rm(bak, { force: true });
  }

  return {
    filePath: abs,

    // Lectura consistente: espera a que terminen escrituras en cola
    async read() {
      await writeChain;
      return readUnsafe();
    },

    // Escritura en cola + atómica
    async write(nextValue) {
      return enqueue(async () => {
        if (!validateRoot(nextValue))
          throw new Error("write: JSON raíz inválido");
        await atomicWriteUnsafe(nextValue);
        return true;
      });
    },

    // Update atómico: read -> mutar -> write, todo dentro de la cola
    async update(mutatorFn) {
      return enqueue(async () => {
        const current = await readUnsafe();
        const nextValue = await mutatorFn(current);
        if (!validateRoot(nextValue))
          throw new Error("update: JSON raíz inválido");
        await atomicWriteUnsafe(nextValue);
        return nextValue;
      });
    },
  };
}

module.exports = { createJsonStore };
