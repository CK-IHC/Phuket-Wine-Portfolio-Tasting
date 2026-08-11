import { usePrint } from '../context/PrintContext';

export function PrintReport() {
  const { payload } = usePrint();
  return (
    <div id="print-report">
      {payload && (
        <>
          <h2 style={{ marginBottom: 4 }}>{payload.title}</h2>
          {payload.subtitle && <p style={{ color: '#555', margin: '0 0 20px' }}>{payload.subtitle}</p>}
          <table>
            <thead>
              <tr>
                {payload.columns.map((c) => <th key={c.key}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {payload.rows.map((row, i) => (
                <tr key={i}>
                  {payload.columns.map((c) => <td key={c.key}>{row[c.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
