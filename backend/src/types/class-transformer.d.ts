declare module "class-transformer" {
  export function Type(
    typeFunction?: (...args: unknown[]) => unknown,
    options?: Record<string, unknown>
  ): PropertyDecorator;
}
