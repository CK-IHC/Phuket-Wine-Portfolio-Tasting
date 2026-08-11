export async function exportRowsToExcel(
  rows: Record<string, string | number>[],
  headers: { key: string; label: string }[],
  filename: string
) {
  const XLSX = await import('xlsx');
  const data = rows.map((row) => {
    const out: Record<string, string | number> = {};
    headers.forEach((h) => { out[h.label] = row[h.key] ?? ''; });
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}
