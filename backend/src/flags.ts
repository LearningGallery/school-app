/**
 * Feature flags: deployment and release are separate events.
 *
 * The interface is deliberately tiny so it can be backed by OpenFeature, Unleash or
 * LaunchDarkly later without touching call sites. The default provider reads
 * FLAG_<NAME>=true from the environment, which a Kubernetes ConfigMap can supply.
 */
export interface FlagProvider {
  isEnabled(name: string, context?: { userId?: string }): boolean;
}

export class EnvFlagProvider implements FlagProvider {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  isEnabled(name: string): boolean {
    return this.env[`FLAG_${name.toUpperCase()}`] === "true";
  }
}
