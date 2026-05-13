import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import pino, { type TransportMultiOptions, type TransportSingleOptions } from 'pino';
import { env } from './env';

const isProd = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

const logLevel = Bun.env.LOG_LEVEL ?? (isTest ? 'silent' : isProd ? 'info' : 'debug');

const logDir = Bun.env.LOG_DIR ?? (isProd ? '/data/logs' : join(process.cwd(), 'logs'));

function buildTransport(): TransportMultiOptions | TransportSingleOptions | undefined {
  if (isTest) return undefined;

  if (!isProd) {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname,service',
        singleLine: false,
      },
    };
  }

  let canWriteFile = true;
  try {
    mkdirSync(logDir, { recursive: true });
  } catch {
    canWriteFile = false;
  }

  const targets: Array<{ target: string; options: Record<string, unknown>; level: string }> = [
    { target: 'pino/file', options: { destination: 1 }, level: logLevel },
  ];

  if (canWriteFile) {
    targets.push({
      target: 'pino-roll',
      options: {
        file: join(logDir, 'kc-api'),
        frequency: 'daily',
        size: '50m',
        limit: { count: 14 },
        mkdir: true,
        extension: '.log',
      },
      level: logLevel,
    });
  }

  return { targets } as TransportMultiOptions;
}

const transport = buildTransport();

export const logger = pino({
  level: logLevel,
  base: { service: 'kc-api' },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(transport ? { transport } : {}),
});

if (isProd) {
  logger.info(
    { event: 'logger.init', logLevel, logDir, fileLogging: transport !== undefined },
    'logger initialized',
  );
}

export function hashForLog(value: string | undefined | null): string {
  if (!value) return 'none';
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}
