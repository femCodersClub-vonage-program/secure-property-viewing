// TEMPORARY, development only: answers the property, its slots, POST /api/visits and the room links
// until #52 and #73 are in dev. Then delete this file, its test, its export in index.ts and its two
// lines in main.tsx. Every other call still reaches the real server.
import { addDays, BOOKING_WINDOW_DAYS, madridDay, TIME_ZONE } from './calendar'

const TIMES = ['10:00', '10:30', '11:00', '11:30', '12:30', '16:00', '16:30', '17:00']
// Booking a slot at this time always answers 409, so the "just taken" path can be tried by hand
const TAKEN_BY_SOMEONE_ELSE = '11:30'
const EXISTING_PROPERTY_IDS = { from: 1, to: 20 }

const bookedSlotIds = new Set<number>()
// The real server keeps up to 4 guest links per visit
const GUEST_LINK_LIMIT = 4
const guestLinksByVisit = new Map<number, number>()

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status < 400 ? 'application/json' : 'application/problem+json' },
  })

const problem = (status: number, title: string, code: string, detail: string) =>
  json({ title, status, detail, code }, status)

function madridOffset(day: string): string {
  const zone = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' })
    .formatToParts(new Date(`${day}T12:00:00Z`))
    .find((part) => part.type === 'timeZoneName')?.value
  return zone?.replace('GMT', '') ?? '+01:00'
}

function addHalfHour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const total = hours * 60 + minutes + 30
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function slotId(day: string, timeIndex: number): number {
  return Number(day.replaceAll('-', '')) * 100 + timeIndex
}

function freeSlots(now: Date) {
  const today = madridDay(now)
  const slots: { id: number; startsAt: string; endsAt: string }[] = []
  for (let offset = 0; offset <= BOOKING_WINDOW_DAYS; offset++) {
    const day = addDays(today, offset)
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay()
    // No visits at weekends, and one weekday without free times, as real agendas have
    if (weekday === 0 || weekday === 6 || offset === 5) continue
    const offsetText = madridOffset(day)
    TIMES.forEach((time, index) => {
      const startsAt = `${day}T${time}:00${offsetText}`
      const id = slotId(day, index)
      if (new Date(startsAt) > now && !bookedSlotIds.has(id)) {
        slots.push({ id, startsAt, endsAt: `${day}T${addHalfHour(time)}:00${offsetText}` })
      }
    })
  }
  return slots
}

function property(id: number) {
  return {
    id,
    title: 'Bright apartment in Gràcia',
    operation: 'RENT',
    propertyType: 'APARTMENT',
    priceEuros: 950,
    area: 'Gràcia',
    bedrooms: 2,
    sizeM2: 70,
    floor: 2,
    description: 'Demo property from the fake API.',
    videoVisitAvailable: true,
    agency: { name: 'Demo agency', verified: true },
    images: [],
  }
}

function readVisitRequest(body: unknown): { slotId: number; visitorName: string } | undefined {
  if (typeof body !== 'string') return undefined
  const data: unknown = JSON.parse(body)
  if (
    typeof data === 'object' &&
    data !== null &&
    'slotId' in data &&
    typeof data.slotId === 'number' &&
    'visitorName' in data &&
    typeof data.visitorName === 'string'
  ) {
    return { slotId: data.slotId, visitorName: data.visitorName }
  }
  return undefined
}

function bookVisit(body: unknown, now: Date): Response {
  const visit = readVisitRequest(body)
  if (!visit) {
    return problem(400, 'Bad Request', 'VALIDATION_FAILED', 'The booking is not valid.')
  }
  const slot = freeSlots(now).find((free) => free.id === visit.slotId)
  if (!slot || slot.startsAt.slice(11, 16) === TAKEN_BY_SOMEONE_ELSE) {
    bookedSlotIds.add(visit.slotId)
    return problem(409, 'Conflict', 'SLOT_UNAVAILABLE', 'This time has just been booked.')
  }
  bookedSlotIds.add(slot.id)
  return json(
    {
      visitId: slot.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      visitorName: visit.visitorName,
      property: {
        title: 'Bright apartment in Gràcia',
        area: 'Gràcia',
        address: 'Fictional demo address 01, Barcelona',
      },
    },
    201,
  )
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

// Unlike the real server, it answers for any visit id, so A6 can be reloaded by hand
function createRoomLink(visitId: number, body: unknown): Response {
  const data: unknown = typeof body === 'string' ? JSON.parse(body) : undefined
  const role = typeof data === 'object' && data !== null && 'role' in data ? data.role : undefined
  if (role !== 'VISITOR' && role !== 'GUEST') {
    return problem(400, 'Bad Request', 'VALIDATION_FAILED', 'One or more fields are invalid.')
  }
  if (role === 'GUEST') {
    const guestLinks = guestLinksByVisit.get(visitId) ?? 0
    if (guestLinks >= GUEST_LINK_LIMIT) {
      return problem(
        409,
        'Conflict',
        'VIDEO_INVITE_LIMIT_REACHED',
        `This visit already has ${GUEST_LINK_LIMIT} guest links, the most it can have.`,
      )
    }
    guestLinksByVisit.set(visitId, guestLinks + 1)
  }
  return json({ role, token: randomToken() }, 201)
}

/** The fake answer for a call, or undefined when the real server should answer it. */
export function fakeVisitBookingAnswer(
  path: string,
  method: string,
  body: unknown,
  now = new Date(),
): Response | undefined {
  const propertyMatch = /^\/api\/properties\/(\d+)(\/slots)?$/.exec(path)
  if (propertyMatch && method === 'GET') {
    const id = Number(propertyMatch[1])
    if (id < EXISTING_PROPERTY_IDS.from || id > EXISTING_PROPERTY_IDS.to) {
      return problem(404, 'Not Found', 'NOT_FOUND', 'This property was not found.')
    }
    return propertyMatch[2] ? json(freeSlots(now), 200) : json(property(id), 200)
  }
  if (path === '/api/visits' && method === 'POST') {
    return bookVisit(body, now)
  }
  const roomLinksMatch = /^\/api\/visits\/(\d+)\/room-links$/.exec(path)
  if (roomLinksMatch && method === 'POST') {
    return createRoomLink(Number(roomLinksMatch[1]), body)
  }
  return undefined
}

export function startFakeVisitBookingApi() {
  const realFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(href, window.location.origin)
    const answer = fakeVisitBookingAnswer(
      url.pathname,
      (init?.method ?? 'GET').toUpperCase(),
      init?.body,
    )
    if (!answer) {
      return realFetch(input, init)
    }
    // A short wait, so the loading states can be seen
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    return answer
  }
}
