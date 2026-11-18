// The room opens this long before the visit starts, as RoomWindow decides on the server
export const OPENS_MINUTES_BEFORE = 10

export function roomOpensAt(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() - OPENS_MINUTES_BEFORE * 60_000)
}

/** The link to the room. The token goes after `#`, which browsers never send to a server. */
export function roomLinkUrl(token: string, origin: string = window.location.origin): string {
  return `${origin}/visits/room#${token}`
}
