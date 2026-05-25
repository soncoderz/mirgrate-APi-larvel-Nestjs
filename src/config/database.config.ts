import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Cấu hình database tương ứng với config/database.php của Laravel
 * 3 kết nối: default (mysql/pgsql chính), voice_server_1, pbx01
 */
export function databaseConfig(connection: 'default' | 'voice_server_1' | 'pbx01'): TypeOrmModuleOptions {
  switch (connection) {
    case 'voice_server_1':
      return {
        type: (process.env.DB_CONNECTION_VOICE || 'mysql') as 'mysql' | 'postgres',
        host: process.env.DB_HOST_VOICE || '127.0.0.1',
        port: parseInt(process.env.DB_PORT_VOICE || '3306'),
        database: process.env.DB_DATABASE_VOICE || process.env.DB_NAME_VOICE || '',
        username: process.env.DB_USERNAME_VOICE || '',
        password: process.env.DB_PASSWORD_VOICE || '',
        entities: [__dirname + '/../modules/**/entities/voice/*.entity{.ts,.js}'],
        synchronize: false, // KHÔNG bật synchronize trên production
        name: 'voice_server_1',
        logging: process.env.NODE_ENV === 'development',
      };

    case 'pbx01':
      return {
        type: (process.env.DB_CONNECTION_PBX || 'mysql') as 'mysql' | 'postgres',
        host: process.env.DB_HOST_PBX || '127.0.0.1',
        port: parseInt(process.env.DB_PORT_PBX || '3306'),
        database: process.env.DB_DATABASE_PBX || process.env.DB_NAME_PBX || '',
        username: process.env.DB_USERNAME_PBX || '',
        password: process.env.DB_PASSWORD_PBX || '',
        entities: [__dirname + '/../modules/**/entities/pbx/*.entity{.ts,.js}'],
        synchronize: false,
        name: 'pbx01',
        logging: process.env.NODE_ENV === 'development',
      };

    default:
      // Kết nối chính - tương đương DB_CONNECTION trong Laravel
      const rawType = process.env.DB_CONNECTION || 'mysql';
      // Laravel dùng 'pgsql' nhưng TypeORM dùng 'postgres'
      const dbType = rawType === 'pgsql' ? 'postgres' : rawType;
      return {
        type: dbType as 'mysql' | 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_DATABASE || '',
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        entities: [__dirname + '/../modules/**/entities/*.entity{.ts,.js}'],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
      };
  }
}
