import type { NightDigest } from '../digest/types.js';

const MISSING = '—';
const RETRY_WARN_THRESHOLD = 3;

export function DigestPage({ digest }: { digest: NightDigest }) {
  return (
    <>
      <h1>digest {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr>
                <td>{row.job}</td>
                <td>{row.owner ?? MISSING}</td>
                <td>{row.runs}</td>
                <td class={row.retries >= RETRY_WARN_THRESHOLD ? 'warn' : undefined}>
                  {row.retries >= RETRY_WARN_THRESHOLD ? `${row.retries} (many)` : row.retries}
                </td>
                <td class={row.lastStatus === 'fail' ? 'warn' : undefined}>
                  {row.lastStatus === 'fail' ? 'fail (!)' : row.lastStatus}
                </td>
                <td>{row.lastError ?? MISSING}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 ? <p class="mute">{digest.badLines} lines did not parse</p> : null}
    </>
  );
}
