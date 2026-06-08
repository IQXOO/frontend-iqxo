import { lazy, type ComponentType } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyNamed<TModule extends Record<string, any>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return lazy(async () => {
    const module = await loader();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { default: module[exportName] as ComponentType<any> };
  });
}