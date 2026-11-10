import { request } from '../../lib/http'
import type { Health } from './types'

function parseHealth(data: unknown): Health {
  if (typeof data === 'object' && data !== null && 'database' in data) {
    if (data.database === 'UP' || data.database === 'DOWN') {
      return { database: data.database }
    }
  }
  throw new Error('Unexpected /api/health response')
}

export function getHealth(): Promise<Health> {
  return request('/api/health', parseHealth)
}
