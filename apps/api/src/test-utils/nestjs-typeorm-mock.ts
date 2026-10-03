import { Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';

export function getRepositoryToken(entity: any): string {
  return typeof entity === 'function' ? `${entity.name}Repository` : `${entity}Repository`;
}

export function getDataSourceToken(): typeof DataSource {
  return DataSource;
}

export function InjectRepository(entity: any): ParameterDecorator {
  return Inject(getRepositoryToken(entity));
}

export function InjectDataSource(): ParameterDecorator {
  return Inject(getDataSourceToken());
}

export class TypeOrmModule {
  static forRoot = jest.fn(() => ({ module: TypeOrmModule }));
  static forRootAsync = jest.fn(() => ({ module: TypeOrmModule }));
  static forFeature = jest.fn(() => ({ module: TypeOrmModule, providers: [], exports: [] }));
}
