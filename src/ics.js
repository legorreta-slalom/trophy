// iCalendar generation for scheduled matches (#50). One VEVENT per
// scheduled, unplayed-or-played match; 1 hour default duration.
const dt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function tournamentIcs(tournament) {
  const name = (id) => tournament.players.find(p => p.id === id)?.name ?? '?'
  const events = tournament.matches
    .filter(m => m.scheduledAt && m.player1Id && m.player2Id)
    .map(m => [
      'BEGIN:VEVENT',
      `UID:${m.id}@trophy`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(new Date(m.scheduledAt))}`,
      `DTEND:${dt(new Date(new Date(m.scheduledAt).getTime() + 3600_000))}`,
      `SUMMARY:${tournament.name}: ${name(m.player1Id)} vs ${name(m.player2Id)}`,
      'END:VEVENT',
    ].join('\r\n'))

  if (!events.length) return null
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TROPHY//EN', ...events, 'END:VCALENDAR', ''].join('\r\n')
}
