import { RoutingProvider } from "./routing.types";
import { StraightLineProvider } from "./straight-line.provider";
import { OpenRouteServiceProvider } from "./ors.provider";

export * from "./routing.types";
export * from "./straight-line.provider";
export * from "./ors.provider";

let instance: RoutingProvider | null = null;

export function getRoutingProvider(): RoutingProvider {
  if (!instance) {
    if (process.env.ORS_API_KEY) {
      instance = new OpenRouteServiceProvider();
    } else {
      instance = new StraightLineProvider();
    }
  }
  return instance;
}

export function resetRoutingProviderInstance(): void {
  instance = null;
}
