export default function Table({ columns, rows, onRowClick, emptyMessage = 'No data available', rowClassName }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-bg-elev">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left px-4 py-3 font-medium text-gray-300 ${col.className || ''}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-10 text-gray-500">{emptyMessage}</td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-t border-border transition-colors ${onRowClick ? 'cursor-pointer hover:bg-bg-hover' : ''} ${rowClassName?.(row) || ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-gray-200 ${col.cellClassName || ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
