import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(3000),

  CLIENT_URL: Joi.string().uri().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  //production
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRY: Joi.string().required(),
  JWT_REFRESH_EXPIRY: Joi.string().required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
});
