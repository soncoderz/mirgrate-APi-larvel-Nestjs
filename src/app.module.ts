import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { databaseConfig } from './config/database.config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { GroupsModule } from './modules/groups/groups.module';
import { CdrModule } from './modules/cdr/cdr.module';
import { QueueLogModule } from './modules/queuelog/queuelog.module';
import { IvrInboundModule } from './modules/ivr-inbound/ivr-inbound.module';
import { UserTypeModule } from './modules/user-type/user-type.module';
import { ExportModule } from './modules/export/export.module';
import { ConnectorModule } from './modules/connector/connector.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database connections (mysql / voice_server_1 / pbx01)
    TypeOrmModule.forRootAsync({
      useFactory: () => databaseConfig('default'),
    }),
    TypeOrmModule.forRootAsync({
      name: 'voice_server_1',
      useFactory: () => databaseConfig('voice_server_1'),
    }),
    TypeOrmModule.forRootAsync({
      name: 'pbx01',
      useFactory: () => databaseConfig('pbx01'),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    CustomersModule,
    GroupsModule,
    CdrModule,
    QueueLogModule,
    IvrInboundModule,
    UserTypeModule,
    ExportModule,
    ConnectorModule,
  ],
})
export class AppModule {}
