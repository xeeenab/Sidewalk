import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../../modules/auth/auth.jwt';
import { logger } from '../logging/logger';

type RateLimitDecision = {
  key: string;
  limit: number;
  windowMs: number;
};

type SlidingWindowResult = {
  count: number;
  retryAfterSeconds: number;
};

type SlidingWindowOptions = {
  namespace: string;
  resolve: (req: Request) => Promise<RateLimitDecision> | RateLimitDecision;
};

const redisUrl = process.env.REDIS_URL;
type RedisLike = {
  status?: string;
  connect: () => Promise<void>;
  eval: (
    script: string,
    numKeys: number,
    key: string,
    nowMs: string,
    windowMs: string,
    member: string,
  ) => Promise<unknown>;
};

const loadRedisClient = (): RedisLike | null => {
  if (!redisUrl) {
    return null;
  }

  try {
    const req = eval('require') as (name: string) => unknown;
    const RedisCtor = req('ioredis') as new (
      url: string,
      options: { lazyConnect: boolean },
    ) => RedisLike;
    return new RedisCtor(redisUrl, { lazyConnect: true });
  } catch {
    logger.warn('ioredis package not found, using in-memory rate limiter fallback');
    return null;
  }
};

const redis = loadRedisClient();

const memoryStore = new Map<string, number[]>();

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local member = ARGV[3]
local startTime = now - windowMs

redis.call('ZREMRANGEBYSCORE', key, '-inf', startTime)
redis.call('ZADD', key, now, member)
local count = redis.call('ZCARD', key)
redis.call('PEXPIRE', key, windowMs)

local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local oldestScore = 0
if oldest[2] then
  oldestScore = tonumber(oldest[2])
end

return { count, oldestScore }
`;

const runMemorySlidingWindow = (key: string, nowMs: number, windowMs: number): SlidingWindowResult => {
  const start = nowMs - windowMs;
  const values = (memoryStore.get(key) ?? []).filter((timestamp) => timestamp > start);
  values.push(nowMs);
  memoryStore.set(key, values);

  const oldest = values[0] ?? nowMs;
  const retryAfterMs = Math.max(0, windowMs - (nowMs - oldest));
  return {
    count: values.length,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
  };
};

const runRedisSlidingWindow = async (
  key: string,
  nowMs: number,
  windowMs: number,
): Promise<SlidingWindowResult> => {
  if (redis?.status === 'wait') {
    await redis.connect();
  }

  const member = `${nowMs}:${crypto.randomBytes(6).toString('hex')}`;
  const raw = (await redis!.eval(
    SLIDING_WINDOW_LUA,
    1,
    key,
    String(nowMs),
    String(windowMs),
    member,
  )) as [number, number];

  const count = Number(raw?.[0] ?? 0);
  const oldest = Number(raw?.[1] ?? nowMs);
  const retryAfterMs = Math.max(0, windowMs - (nowMs - oldest));

  return {
    count,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
  };
};

const applyHeaders = (res: Response, limit: number, remaining: number, retryAfterSeconds?: number) => {
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  if (retryAfterSeconds !== undefined) {
    res.setHeader('Retry-After', String(Math.max(0, retryAfterSeconds)));
  }
};

export const createSlidingWindowRateLimiter = (options: SlidingWindowOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const decision = await options.resolve(req);
      const rateKey = `rate_limit:${options.namespace}:${decision.key}`;
      const nowMs = Date.now();

      let result: SlidingWindowResult;
      try {
        result = redis
          ? await runRedisSlidingWindow(rateKey, nowMs, decision.windowMs)
          : runMemorySlidingWindow(rateKey, nowMs, decision.windowMs);
      } catch (error) {
        logger.warn('Redis rate-limit failure, falling back to in-memory limiter', {
          namespace: options.namespace,
          error: error instanceof Error ? error.message : String(error),
        });
        result = runMemorySlidingWindow(rateKey, nowMs, decision.windowMs);
      }

      const remaining = decision.limit - result.count;
      if (result.count > decision.limit) {
        applyHeaders(res, decision.limit, 0, result.retryAfterSeconds);
        res.status(429).json({ error: 'too_many_requests' });
        return;
      }

      applyHeaders(res, decision.limit, remaining);
      next();
    } catch (error) {
      next(error);
    }
  };
};

const parseIp = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown';

const parseToken = (authorization?: string) => {
  if (!authorization) {
    return null;
  }
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
};

export const tieredApiRateLimiter = createSlidingWindowRateLimiter({
  namespace: 'api',
  resolve: async (req) => {
    const windowMs = 60 * 1000;
    const token = parseToken(req.headers.authorization);

    if (token) {
      try {
        const decoded = verifyJwt(token);
        if (typeof decoded !== 'string' && decoded.tokenType === 'access') {
          const userId = typeof decoded.sub === 'string' ? decoded.sub : 'unknown';
          const role = decoded.role;

          if (role === 'AGENCY_ADMIN') {
            return {
              key: `user:${userId}:role:AGENCY_ADMIN`,
              limit: 500,
              windowMs,
            };
          }

          if (role === 'CITIZEN') {
            return {
              key: `user:${userId}:role:CITIZEN`,
              limit: 100,
              windowMs,
            };
          }
        }
      } catch {
        // Ignore invalid auth header for limiter key selection; auth middleware handles authorization.
      }
    }

    return {
      key: `ip:${parseIp(req)}`,
      limit: 20,
      windowMs,
    };
  },
});

export const stellarAnchoringRateLimiter = createSlidingWindowRateLimiter({
  namespace: 'stellar_anchoring',
  resolve: (req) => {
    const userId = req.user?.id ?? `ip:${parseIp(req)}`;
    return {
      key: `user:${userId}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    };
  },
});
