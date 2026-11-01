import {
  DynamicModule, Global, Inject, Module, OnApplicationBootstrap,
} from '@nestjs/common';
import { StorageService } from './storage.service';

export interface StorageModuleOptions {
  /** Create the bucket and apply its policy at boot. Off for tooling that never touches S3. */
  ensureBucket: boolean;
}

export const STORAGE_MODULE_OPTIONS = Symbol('STORAGE_MODULE_OPTIONS');

@Global()
@Module({})
export class StorageModule implements OnApplicationBootstrap {
  constructor (
    private readonly storage: StorageService,
    @Inject(STORAGE_MODULE_OPTIONS)
    private readonly options: StorageModuleOptions,
  ) {}

  static forRoot (options: StorageModuleOptions): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        StorageService,
        {
          provide: STORAGE_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [StorageService],
    };
  }

  async onApplicationBootstrap (): Promise<void> {
    if (this.options.ensureBucket) {
      await this.storage.ensureBucket();
    }
  }
}
