import { Container } from 'inversify'
import 'reflect-metadata'

// Define interfaces locally
export namespace interfaces {
	export type ServiceIdentifier<T = unknown> =
		| string
		| symbol
		| (abstract new (
				...args: any[]
		  ) => T)
	export type Newable<T = unknown> = new (...args: any[]) => T
}

// Initialize container globally and ensure it's ready
export const diContainer = new Container({ defaultScope: 'Singleton' })

export type ProviderWithConfig = {
	provide: interfaces.ServiceIdentifier
	useClass: interfaces.Newable
	scope?: 'singleton' | 'transient' | 'request'
}

export type Provider = ProviderWithConfig | interfaces.ServiceIdentifier

export type ModuleOptions = {
	providers?: Provider[]
	imports?: any[]
	exports?: interfaces.ServiceIdentifier[]
}

function isProviderWithConfig(
	provider: Provider,
): provider is ProviderWithConfig {
	return (provider as ProviderWithConfig).provide !== undefined
}

export function Module(options?: ModuleOptions) {
	return (target: any) => {
		const providers = options?.providers ?? []
		const imports = options?.imports ?? []
		const exports = options?.exports ?? []

		// Process imports first
		for (const importedModule of imports) {
			if (typeof importedModule === 'function') {
				// If it's a class, instantiate it to trigger its decorators
				new importedModule()
			}
		}

		// Process providers
		for (const provider of providers) {
			if (isProviderWithConfig(provider)) {
				const binding = diContainer.bind(provider.provide).to(provider.useClass)

				switch (provider.scope) {
					case 'singleton':
						binding.inSingletonScope()
						break
					case 'transient':
						binding.inTransientScope()
						break
					case 'request':
						binding.inRequestScope()
						break
					default:
						break
				}
			} else {
				diContainer.bind(provider).toSelf()
			}
		}

		// Store exports for potential use by parent modules
		target.exports = exports

		return target
	}
}

// Helper function to get services from container
export function getService<T>(
	serviceIdentifier: interfaces.ServiceIdentifier<T>,
): T {
	return diContainer.get<T>(serviceIdentifier)
}

// Helper function to check if service is bound
export function isServiceBound(
	serviceIdentifier: interfaces.ServiceIdentifier,
): boolean {
	return diContainer.isBound(serviceIdentifier)
}

// Helper function to rebind services (useful for testing)
export function rebindService<T>(
	serviceIdentifier: interfaces.ServiceIdentifier<T>,
	newImplementation: interfaces.Newable<T>,
): void {
	diContainer.unbind(serviceIdentifier)
	diContainer.bind<T>(serviceIdentifier).to(newImplementation)
}
