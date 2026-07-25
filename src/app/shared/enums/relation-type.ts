// FIX: Program.cs has a global JsonStringEnumConverter() registered, so the API
// serializes ALL enums (including this one) as their NAME string (e.g. "Father"),
// never as a number. Gender already worked because it was already a string enum.
// RelationType was numeric, so nothing sent by the backend ever matched an option
// value, and the dropdown always looked empty on load — even after the [ngValue] fix.
export enum RelationType {
  Father = 'Father',
  Mother = 'Mother',
  Brother = 'Brother',
  Sister = 'Sister',
  Friend = 'Friend',
  Other = 'Other',
}