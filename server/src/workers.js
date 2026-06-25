export const BASE_WORKERS = [
  { id: "khaled", name: "خالد", envKey: "WORKER_PIN_KHALED" },
  { id: "abu-taher", name: "أبو طاهر", envKey: "WORKER_PIN_ABU_TAHER" },
  { id: "dalor", name: "دلور", envKey: "WORKER_PIN_DALOR" },
  { id: "shakir-ali", name: "شاكر علي", envKey: "WORKER_PIN_SHAKIR_ALI" },
  { id: "abu-bakr", name: "أبو بكر", envKey: "WORKER_PIN_ABU_BAKR" },
  { id: "kawthar", name: "كوثر", envKey: "WORKER_PIN_KAWTHAR" },
  { id: "yaseen", name: "ياسين", envKey: "WORKER_PIN_YASEEN" },
  { id: "riyadh", name: "رياض", envKey: "WORKER_PIN_RIYADH" }
];

export function publicWorkers() {
  return BASE_WORKERS.map(({ id, name }) => ({ id, name }));
}

export function configuredWorkers() {
  return BASE_WORKERS.map((worker) => ({
    id: worker.id,
    name: worker.name,
    pin: String(process.env[worker.envKey] ?? "").trim()
  }));
}
