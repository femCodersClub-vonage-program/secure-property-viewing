import type { ReactNode } from 'react'

export type Column<Row> = {
  header: string
  cell: (row: Row) => ReactNode
  align?: 'start' | 'end'
}

type DataTableProps<Row> = {
  caption: string
  columns: Column<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string | number
}

function alignClass(align: Column<unknown>['align']) {
  return align === 'end' ? 'md:text-right tabular-nums' : ''
}

function DataTable<Row>({ caption, columns, rows, getRowKey }: DataTableProps<Row>) {
  return (
    <table className="w-full text-left">
      <caption className="sr-only">{caption}</caption>
      <thead className="hidden md:table-header-group">
        <tr className="border-b border-border">
          {columns.map((column) => (
            <th
              key={column.header}
              scope="col"
              className={`px-4 py-3 text-sm font-bold text-text-muted ${alignClass(column.align)}`}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={getRowKey(row)}
            className="block border-b border-border py-3 md:table-row md:py-0"
          >
            {columns.map((column) => (
              <td
                key={column.header}
                className={`flex justify-between gap-4 px-4 py-1 md:table-cell md:py-3 ${alignClass(column.align)}`}
              >
                <span className="text-sm font-bold text-text-muted md:hidden">{column.header}</span>{' '}
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default DataTable
