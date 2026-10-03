import * as jwt from 'jsonwebtoken';
import { Injectable, Optional, Inject } from '@nestjs/common';

export const JWT_MODULE_OPTIONS = 'JWT_MODULE_OPTIONS';

export interface JwtModuleOptions {
  secret?: string;
  signOptions?: jwt.SignOptions;
  verifyOptions?: jwt.VerifyOptions;
}

@Injectable()
export class JwtService {
  constructor(
    @Optional()
    @Inject(JWT_MODULE_OPTIONS)
    private readonly options: JwtModuleOptions = {}
  ) {}

  sign(payload: string | Buffer | object, options?: any): string {
    const secret =
      options?.secret ||
      this.options.secret ||
      'super-secret-jwt-token-replace-in-production';
    const opts = { ...this.options.signOptions, ...options };
    delete opts.secret;
    return jwt.sign(payload as any, secret, opts);
  }

  async signAsync(payload: string | Buffer | object, options?: any): Promise<string> {
    return this.sign(payload, options);
  }

  verify<T extends object = any>(token: string, options?: any): T {
    const secret =
      options?.secret ||
      this.options.secret ||
      'super-secret-jwt-token-replace-in-production';
    const opts = { ...this.options.verifyOptions, ...options };
    delete opts.secret;
    return jwt.verify(token, secret, opts) as T;
  }

  async verifyAsync<T extends object = any>(token: string, options?: any): Promise<T> {
    return this.verify<T>(token, options);
  }

  decode(token: string, options?: jwt.DecodeOptions): null | { [key: string]: any } | string {
    return jwt.decode(token, options);
  }
}

export class JwtModule {
  static register(options: JwtModuleOptions = {}) {
    return {
      module: JwtModule,
      providers: [
        {
          provide: JWT_MODULE_OPTIONS,
          useValue: options,
        },
        JwtService,
      ],
      exports: [JwtService],
    };
  }

  static registerAsync(options: any) {
    return {
      module: JwtModule,
      imports: options.imports || [],
      providers: [
        {
          provide: JWT_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        JwtService,
      ],
      exports: [JwtService],
    };
  }
}
