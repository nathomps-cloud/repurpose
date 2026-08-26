// lib/db.js
// Minimal persistence for REPURPOSE user access, backed by Upstash Redis
// (Vercel's current recommended KV option — @vercel/kv is deprecated).

import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function isConfigured() {
  return Boolean(url && token);
}

function client() {
  return new Redis({ url, token });
}

export async function upsertUser({ email, token: accessToken, plan, subscriptionId = null, activeUntil = null }) {
  const redis = client();
  const existing = (await redis.get(`user:email:${email}`)) || {};
  const user = {
    ...existing,
    email,
    plan,
    subscriptionId,
    activeUntil,
    active: true,
    generationsUsed: existing.generationsUsed || 0,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await redis.set(`user:email:${email}`, user);
  if (accessToken) {
    await redis.set(`user:token:${accessToken}`, email);
  }
  return user;
}

export async function findUserByToken(accessToken) {
  const redis = client();
  const email = await redis.get(`user:token:${accessToken}`);
  if (!email) return null;
  return redis.get(`user:email:${email}`);
}

export async function revokeUser({ email, reason }) {
  const redis = client();
  const existing = await redis.get(`user:email:${email}`);
  if (!existing) return null;
  const updated = {
    ...existing,
    active: false,
    revokedAt: new Date().toISOString(),
    revokeReason: reason,
  };
  await redis.set(`user:email:${email}`, updated);
  return updated;
}
