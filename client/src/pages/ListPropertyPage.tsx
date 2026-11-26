import { ListPropertyIntro } from '../features/owner-listing'

// B1: the page only places the intro
function ListPropertyPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-12 sm:px-10">
      <title>List my property · Peephole</title>
      <ListPropertyIntro />
    </main>
  )
}

export default ListPropertyPage
