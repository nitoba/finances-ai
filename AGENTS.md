# Agent Development Guide

## Build/Test/Lint Commands
- `pnpm build` - Compile TypeScript to dist/
- `pnpm dev` - Run Mastra development mode
- No tests configured yet
- Use Biome for linting/formatting (run via editor or manually with `npx @biomejs/biome`)

## Code Style & Conventions
- **Formatting**: Tabs for indentation, single quotes, semicolons as needed
- **Imports**: Use ES modules, organize imports automatically via Biome
- **Types**: Use TypeScript strict mode, prefer `type` over `interface`, use Zod v4 for schemas
- **Naming**: camelCase for variables/functions, PascalCase for types/components, kebab-case for files
- **Database**: Use Drizzle ORM with LibSQL, always use parameterized queries with placeholders (?)
- **Error Handling**: Robust error handling with custom AppError class, integrated with Fastify
- **Architecture**: SOLID principles, Dependency Injection with Inversify, Use Cases/Services pattern

## Project Structure
- `src/core/` - Core architecture (container, types, errors)
  - `container/module.ts` - NestJS-style module system
- `src/modules/` - Feature modules with DI
  - `auth/` - Authentication services and repositories
    - `models/` - Domain models (User)
    - `repositories/` - Data access layer
    - `services/` - Business logic
  - `database/` - Database services
  - `expense/` - Expense management (repositories, services, use-cases)
    - `models/` - Domain models (Expense)
    - `repositories/` - Data access layer
    - `services/` - Business logic
    - `use-cases/` - Application use cases
  - `logger/` - Logging services
  - `shared/` - Shared services (HTTP, Discord, MCP, etc.)
    - `persistence/` - Repository patterns and types
    - `core/` - Base models and utilities
  - `app.module.ts` - Main application module
- `src/lib/` - Legacy utilities (being refactored)
- `src/mastra/` - AI agents, MCP servers, and tools
- `src/*.ts` - Main application entry points

## Architecture Patterns

### NestJS-Style Module System
- **@Module decorator**: Defines modules with providers, imports, and exports
- **Providers**: Services registered in modules with dependency injection
- **Imports**: Module dependencies (automatically registers imported modules)
- **Exports**: Services exposed to other modules

```typescript
@Module({
  imports: [DatabaseModule, LoggerModule],
  providers: [
    { provide: TYPES.AuthService, useClass: AuthService },
    AuthRepository,
  ],
  exports: [TYPES.AuthService, AuthService],
})
export class AuthModule {}
```

### Dependency Injection
- **Container**: Inversify-based IoC container with NestJS-style API
- **Services**: All services are injectable with `@injectable()` decorator
- **Modules**: Organized by feature with clear separation of concerns
- **getService()**: Helper function to retrieve services from container

### Use Cases & Services Pattern
- **Use Cases**: Business logic orchestration in `src/modules/*/use-cases/`
- **Services**: Domain services in `src/modules/*/services/`
- **Repositories**: Data access layer in `src/modules/*/repositories/`

### Error Handling
- **AppError**: Custom error class with status codes and details
- **ErrorHandler**: Fastify-integrated error handler
- **Validation**: Zod v4 schemas for runtime validation

### Database
- **Drizzle ORM**: Type-safe SQL queries with LibSQL
- **Parameterized Queries**: Always use placeholders (?) for security
- **Transactions**: Use when needed for data consistency

### Repository Pattern
- **DrizzleDefaultRepository**: Base repository with common CRUD operations
- **Domain Models**: Extend DefaultModel for type safety
- **Soft Delete Support**: Optional deletedAt field handling
- **Transaction Support**: Built-in transaction management

```typescript
// Extendendo o repositório base
export class ExpenseRepository extends DrizzleDefaultRepository<
  Expense,
  typeof expenses,
  typeof import('../../../lib/db/schemas')
> {
  constructor(database: DatabaseService, logger: IAppLogger) {
    super(database.getConnection(), expenses)
  }

  // Implementar método abstrato
  protected mapToModel(data: any): Expense {
    return new Expense({
      id: data.id,
      date: data.date,
      description: data.description,
      amount: data.amount,
      category: data.category,
      isRecurring: Boolean(data.isRecurring),
      userId: data.userId,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
    })
  }

  // Métodos específicos
  async findByUserId(userId: string, options?: Filters): Promise<Expense[]> {
    // Implementação específica
  }
}
```

## Dependencies
- **Runtime**: Node.js >=20.9.0, ESM modules, pnpm package manager
- **Core**: Mastra framework, Discord.js, Fastify, Better Auth, Drizzle ORM
- **Architecture**: Inversify (DI), Zod v4 (validation), reflect-metadata
- **AI**: Google AI SDK, Groq SDK for LLM models

## Development Workflow
1. **New Features**: Create use case → service → repository pattern
2. **Database Changes**: Update schemas, run migrations
3. **Error Handling**: Use AppError for business errors
4. **Validation**: Use Zod v4 schemas for input validation
5. **Testing**: Write tests for use cases and services

## Module System Usage

### Creating a New Module
```typescript
@Module({
  imports: [DatabaseModule, LoggerModule],
  providers: [
    { provide: TYPES.MyService, useClass: MyService },
    MyRepository,
  ],
  exports: [TYPES.MyService, MyService],
})
export class MyFeatureModule {}
```

### Using Services in Controllers
```typescript
// Get service from DI container
const myService = getService<MyService>(TYPES.MyService)

// Use the service
const result = await myService.doSomething()
```

### Module Registration
```typescript
// In app.module.ts
@Module({
  imports: [MyFeatureModule], // Automatically registers dependencies
  providers: [...],
})
export class AppModule {}

// Initialize in main app
new AppModule() // Registers all dependencies
```

### Provider Types
- **Class Provider**: `{ provide: TYPES.Service, useClass: ServiceClass }`
- **Singleton**: `{ provide: TYPES.Service, useClass: ServiceClass, scope: 'singleton' }`
- **Factory**: `{ provide: TYPES.Service, useFactory: () => new ServiceClass() }`

### Benefits
- **Automatic Dependency Resolution**: No manual wiring required
- **Modular Architecture**: Clear separation of concerns
- **Type Safety**: Full TypeScript support with dependency injection
- **Testability**: Easy to mock and test individual modules
- **Scalability**: Add new modules without affecting existing code

Run applications: `pnpm app:dev`, `pnpm discord-bot:dev`, `pnpm web-server:dev`
