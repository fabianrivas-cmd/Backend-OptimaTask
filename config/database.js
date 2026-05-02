import { Sequelize } from 'sequelize';
import 'dotenv/config';

const logging = process.env.DB_LOGGING === 'true' ? console.log : false;
const pool = { max: 5, min: 0, acquire: 30000, idle: 10000 };

function sslOption(connectionUrl = '') {
  if (process.env.DB_SSL === 'false') return false;
  if (process.env.DB_SSL === 'true') return { require: true, rejectUnauthorized: false };
  const url =
    connectionUrl ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    '';
  if (/supabase\.(co|com)/i.test(url)) {
    return { require: true, rejectUnauthorized: false };
  }
  return false;
}

function createSequelize() {
  const databaseUrl =
    process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();

  if (databaseUrl) {
    return new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging,
      dialectOptions: {
        ssl: sslOption(databaseUrl),
      },
      pool,
    });
  }

  const dialect = (process.env.DB_DIALECT || 'mysql').toLowerCase();

  if (dialect === 'postgres') {
    return new Sequelize(
      process.env.DB_NAME || 'postgres',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging,
        dialectOptions: {
          ssl: sslOption(),
        },
        pool,
      }
    );
  }

  return new Sequelize(
    process.env.DB_NAME || 'optimatask',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      dialect: 'mysql',
      dialectOptions: {
        decimalNumbers: true,
      },
      pool,
    }
  );
}

const sequelize = createSequelize();

export { sequelize };
