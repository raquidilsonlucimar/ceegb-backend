"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = testConnection;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./logger");
dotenv_1.default.config();
const pool = promise_1.default.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'eletroguin',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    waitForConnections: true,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00',
});
async function testConnection() {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    logger_1.logger.info('✅  MySQL conectado com sucesso');
}
exports.default = pool;
//# sourceMappingURL=database.js.map