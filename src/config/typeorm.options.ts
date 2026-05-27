import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";

type MysqlEnvMap = {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
};

export function createMysqlTypeOrmOptions(
  config: ConfigService,
  env: MysqlEnvMap,
  connectionName?: string,
): TypeOrmModuleOptions {
  return {
    type: "mysql",
    name: connectionName,
    host: config.get<string>(env.host, "127.0.0.1"),
    port: Number(config.get<string>(env.port, "3306")),
    database: config.get<string>(env.database, ""),
    username: config.get<string>(env.username, "root"),
    password: config.get<string>(env.password, ""),
    synchronize: false,
    autoLoadEntities: true,
    timezone: "Z",
    charset: "utf8mb4",
    logging: config.get<string>("TYPEORM_LOGGING", "false") === "true",
    extra: {
      connectionLimit: 10,
      dateStrings: true,
    },
  };
}
