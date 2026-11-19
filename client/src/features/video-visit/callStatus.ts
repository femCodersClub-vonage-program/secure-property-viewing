import type { CallStatus } from './types'

// The visit times are in Madrid, as in the rest of the app
const opensAtFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Madrid',
})

/** The text of the status line for each state of the call. */
export function statusMessage(status: CallStatus): string {
  switch (status.kind) {
    case 'connecting':
      return 'Joining the visit…'
    case 'waiting':
      return 'You are in the room. Waiting for the others to join.'
    case 'in-call':
      return 'You are in the visit.'
    case 'permissions-denied':
      return 'Your browser blocked the camera or microphone. Allow them from the icon next to the address bar, then reload the page.'
    case 'reconnecting':
      return 'The connection dropped. Reconnecting…'
    case 'hung-up':
      return 'You left the visit.'
    case 'time-over':
      return 'The visit time is over, so the call has ended.'
    case 'not-open':
      return `The room opens on ${opensAtFormat.format(status.opensAt)}. Come back then.`
    case 'error':
      return status.message
    case 'media-failed':
      return "Your camera or microphone couldn't start. Check that they're connected and not in use by another app, then reload the page."
  }
}
