import { lazy, type ComponentType } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyNamed<TModule extends Record<string, any>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return lazy(async () => {
    try {
      const module = await loader();
      return { default: module[exportName] as ComponentType<any> };
    } catch (error) {
      console.error(`Failed to load chunk for ${String(exportName)}`, error);
      
      // If a chunk fails to load (e.g. after a deployment changed chunk hashes), reload once
      const reloadKey = `iqxo_chunk_error_reload_${String(exportName)}`;
      if (typeof window !== 'undefined' && !sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true');
        window.location.reload();
      }
      
      throw error;
    }
  });
}