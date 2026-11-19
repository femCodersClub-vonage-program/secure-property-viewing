import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DataTable, { type Column } from './DataTable'

type Visit = { id: number; visitor: string; time: string }

const columns: Column<Visit>[] = [
  { header: 'Visitor', cell: (visit) => visit.visitor },
  { header: 'Time', cell: (visit) => visit.time, align: 'end' },
]

const rows: Visit[] = [
  { id: 1, visitor: 'Laura', time: '11:00' },
  { id: 2, visitor: 'Joan', time: '12:30' },
]

describe('DataTable', () => {
  it('shows a named table with one header row and one row per item', () => {
    render(
      <DataTable caption="Next visits" columns={columns} rows={rows} getRowKey={(v) => v.id} />,
    )

    const table = screen.getByRole('table', { name: 'Next visits' })
    const headers = within(table).getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual(['Visitor', 'Time'])
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByRole('cell', { name: 'Visitor Laura' })).toBeInTheDocument()
  })
})
