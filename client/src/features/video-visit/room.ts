// The room opens this long before the visit starts, as RoomWindow decides on the server
export const OPENS_MINUTES_BEFORE = 10

export function roomOpensAt(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() - OPENS_MINUTES_BEFORE * 60_000)
}

/** The link to the room. The token goes after `#`, which browsers never send to a server. */
export function roomLinkUrl(token: string, origin: string = window.location.origin): string {
  return `${origin}/visits/room#${token}`
}

// The token is 32 random bytes in base64url: letters, digits, '-' and '_'
const ROOM_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/

/** Reads the room token from the part of the link after `#`. Pure: it changes nothing. */
export function readRoomToken(hash: string): string | undefined {
  const token = hash.startsWith('#') ? hash.slice(1) : hash // drops the '#'
  // Anything else isn't a room link, so the page shows an error instead of calling the server
  return ROOM_TOKEN_PATTERN.test(token) ? token : undefined
}

/** Removes the token from the address bar without reloading, so it doesn't stay in the history. */
export function removeRoomTokenFromAddressBar(): void {
  const { pathname, search } = window.location
  // Keeps React Router's history state, only the `#...` part goes away
  window.history.replaceState(window.history.state, '', pathname + search)
}
