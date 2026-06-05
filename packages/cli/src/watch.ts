import fs from "node:fs";
import path from "node:path";

export interface WatchOptions {
  dir: string;
  extensions?: string[];
  debounceMs?: number;
  onChange: () => void;
}

export function watchDir(options: WatchOptions): { close: () => void } {
  const extensions = options.extensions ?? [".agent", ".json", ".yaml", ".yml"];
  const debounceMs = options.debounceMs ?? 300;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const watcher = fs.watch(options.dir, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const ext = path.extname(filename).toLowerCase();
    if (!extensions.includes(ext)) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      options.onChange();
    }, debounceMs);
  });

  return {
    close() {
      if (timer) clearTimeout(timer);
      watcher.close();
    },
  };
}
