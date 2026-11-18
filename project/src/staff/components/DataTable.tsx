import type { ReactNode } from 'react';
import { cn } from '@/staff/utils/cn';
import { EmptyState } from '@/staff/components/ui';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  minWidth?: string;
}

const ALIGN: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function DataTable<T>({ columns, rows, rowKey, empty, minWidth = 'min-w-[760px]' }: DataTableProps<T>) {
  if (rows.length === 0) {
    return empty ?? <EmptyState title="No records found" description="Try changing the search or filters." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-[13px]', minWidth)}>
        <thead>
          <tr className="bg-slate-50">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50/95 px-4 py-3 font-semibold text-ink backdrop-blur first:pl-5 last:pr-5',
                  ALIGN[column.align ?? 'left'],
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border transition-colors odd:bg-white even:bg-slate-50/35 last:border-0 hover:bg-primary-50/60">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('px-4 py-3 align-middle text-ink first:pl-5 last:pr-5', ALIGN[column.align ?? 'left'], column.className)}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
