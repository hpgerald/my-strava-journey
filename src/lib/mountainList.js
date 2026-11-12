// The mountain chapters, in the order they are told. `pin` is the peak
// (latitude, longitude, to two places) and `peak` its name, for the map pins;
// `part` is the part of the story the mountain belongs to; `dark` says the
// chapter opens on a dark ground; `record` is the record it holds, if any.
export const MOUNTAINS = [
  { id: 'kilimanjaro', to: '/kilimanjaro', name: 'Kilimanjaro', line: 'The roof', peak: 'Uhuru Peak', pin: [-3.08, 37.35], country: 'Tanzania', part: 3, dark: true, record: 'The highest point' },
  { id: 'hanang', to: '/hanang', name: 'Hanang', line: 'The long day', peak: 'Mount Hanang', pin: [-4.43, 35.4], country: 'Tanzania', part: 3, dark: false, record: 'The longest day' },
  { id: 'uluguru', to: '/uluguru', name: 'Uluguru', line: 'The mountain I go back to', peak: 'Bondwa Peak', pin: [-6.91, 37.67], country: 'Tanzania', part: 3, dark: true, record: 'The biggest climb' },
  { id: 'ngong', to: '/ngong', name: 'Ngong Hills', line: 'The ridge across the border', peak: 'Ngong Hills', pin: [-1.4, 36.64], country: 'Kenya', part: 5, dark: false },
]
