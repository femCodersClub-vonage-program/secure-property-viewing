/** /visits/room opened without a valid token after `#`, such as from a link cut short. */
function RoomLinkInvalid() {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="font-display text-3xl font-bold text-balance text-brand-dark">
        This room link doesn't work
      </h1>
      <p className="font-body text-text-default">
        Open the full link you got after booking, or ask the person who booked the visit to share it
        again.
      </p>
    </section>
  )
}

export default RoomLinkInvalid
