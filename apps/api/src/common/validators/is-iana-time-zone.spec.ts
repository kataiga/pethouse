import { isIanaTimeZone } from './is-iana-time-zone';

describe('isIanaTimeZone', () => {
  it.each(['Europe/Paris', 'America/Montreal', 'Asia/Calcutta', 'UTC'])('accepts %s', (zone) => {
    expect(isIanaTimeZone(zone)).toBe(true);
  });

  it.each(['Mars/Olympus', 'CET+1', '', 42, null, 'a'.repeat(65)])('rejects %p', (value) => {
    expect(isIanaTimeZone(value)).toBe(false);
  });
});
