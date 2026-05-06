import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { tenantRlsStorage } from "../common/tenancy/tenant-rls.storage";

function extendWithTenantRls(base: PrismaClient) {
  return base.$extends({
    name: "tenant-rls-batch-tx",
    query: {
      $allModels: {
        async $allOperations(ctx) {
          const { model, args, query } = ctx as {
            model?: string;
            args: unknown;
            query: (a: unknown) => Prisma.PrismaPromise<unknown>;
          };
          if (!model) {
            return query(args);
          }
          const tenantId = tenantRlsStorage.getStore()?.tenantId;
          if (!tenantId) {
            return query(args);
          }
          const [, result] = await base.$transaction([
            base.$executeRawUnsafe(`SELECT set_config('app.current_tenant', $1, true)`, tenantId),
            query(args) as Prisma.PrismaPromise<unknown>
          ]);
          return result;
        }
      }
    }
  });
}

export type ExtendedPrismaClient = ReturnType<typeof extendWithTenantRls>;

/** Typage Nest : l’instance réelle est un Proxy vers `ExtendedPrismaClient` + hooks cycle de vie. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface PrismaService extends ExtendedPrismaClient {}

@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly _delegate: ExtendedPrismaClient;

  constructor() {
    const delegate = extendWithTenantRls(new PrismaClient());
    this._delegate = delegate;
    const lifecycleHost = this;

    return new Proxy(lifecycleHost, {
      get(_target, prop: string | symbol, receiver) {
        if (prop === "_delegate") {
          return delegate;
        }
        if (prop === "constructor") {
          return Object.getPrototypeOf(lifecycleHost).constructor;
        }
        if (typeof prop === "string" && (prop === "onModuleInit" || prop === "onModuleDestroy")) {
          const descriptor = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(lifecycleHost),
            prop
          );
          const fn = descriptor?.value as (() => Promise<void>) | undefined;
          return fn?.bind(lifecycleHost);
        }
        const value = (delegate as Record<string | symbol, unknown>)[prop];
        if (typeof value === "function") {
          return (value as (...args: unknown[]) => unknown).bind(delegate);
        }
        return value;
      }
    }) as unknown as PrismaService;
  }

  async onModuleInit(): Promise<void> {
    await this._delegate.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this._delegate.$disconnect();
  }
}
