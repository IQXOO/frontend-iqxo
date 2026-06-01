import { lazy, type ComponentType } from "react";

export function lazyNamed<TModule extends Record<string, any>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as ComponentType<any> };
  });
}