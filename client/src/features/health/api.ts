import { request } from '../../lib/http'
import type { Health } from './types'

function parseHealth(data: unknown): Health {
  if (typeof data === 'object' && data !== null && 'status' in data) {
    if (data.status === 'UP' || data.status === 'DOWN') {
      return { status: data.status }
    }
  }
  throw new Error('Unexpected /api/health response')
}

export function getHealth(): Promise<Health> {
  return request('/api/health', parseHealth)
}
