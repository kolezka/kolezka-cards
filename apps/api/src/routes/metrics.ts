import { Hono } from 'hono';
import { snapshotMetrics } from '../services/metrics';

export const metrics = new Hono();

metrics.get('/metrics', (c) => c.json(snapshotMetrics()));
