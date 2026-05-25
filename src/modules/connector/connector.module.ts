import { Module } from '@nestjs/common';
import { ConnectorController } from './connector.controller';

/**
 * ConnectorModule - tương đương Route::prefix('connector') trong Laravel
 * Route prefix: /connector/
 * Auth: jwt.or.header (JWT hoặc X-Custom-Token header)
 */
@Module({
  controllers: [ConnectorController],
})
export class ConnectorModule {}
