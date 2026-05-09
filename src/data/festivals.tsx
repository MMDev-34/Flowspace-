// International days / observances by month-day (MM-DD)
export const observances: Record<string, string[]> = {
  '01-01': ["🎉 New Year's Day"],
  '01-14': ["🪁 Makar Sankranti / Pongal"],
  '01-26': ["🇮🇳 Republic Day (India)"],
  '02-14': ["💝 Valentine's Day"],
  '03-08': ["👩 International Women's Day"],
  '03-20': ["😊 International Day of Happiness"],
  '04-07': ["🩺 World Health Day"],
  '04-22': ["🌍 Earth Day"],
  '05-01': ["👷 International Workers' Day", "🪔 Maharashtra Day"],
  '05-04': ["👨‍💻 Star Wars Day"],
  '05-13': ["🍹 World Cocktail Day", "🫘 International Hummus Day"],
  '06-05': ["🌿 World Environment Day"],
  '06-21': ["🧘 International Yoga Day"],
  '07-07': ["🍫 World Chocolate Day"],
  '08-15': ["🇮🇳 Independence Day (India)"],
  '09-05': ["👨‍🏫 Teacher's Day (India)"],
  '10-02': ["🇮🇳 Gandhi Jayanti"],
  '10-31': ["🎃 Halloween"],
  '11-01': ["🪔 Diwali (approx)"],
  '11-14': ["👶 Children's Day (India)"],
  '12-25': ["🎄 Christmas"],
  '12-31': ["🎆 New Year's Eve"],
};

// Historical events by month-day (MM-DD)
export const historyEvents: Record<string, string[]> = {
  '01-01': ["1801: United Kingdom formed", "1983: Internet officially born"],
  '01-26': ["1950: India becomes a Republic"],
  '02-14': ["1990: Voyager 1 takes 'Pale Blue Dot' photo"],
  '03-08': ["1917: Russian Revolution begins"],
  '04-22': ["1970: First Earth Day celebrated"],
  '05-01': ["1886: First May Day labor protests"],
  '05-04': ["1979: Margaret Thatcher becomes first female UK PM"],
  '05-05': ["1961: Alan Shepard becomes first American in space"],
  '05-13': ["1984: Apple demonstrates first Macintosh", "1998: Google files for incorporation"],
  '05-15': ["1928: Mickey Mouse first appears", "2005: YouTube first video uploaded"],
  '06-05': ["1977: Apple II computer released"],
  '07-20': ["1969: Apollo 11 lands on the Moon"],
  '08-15': ["1947: India gains independence"],
  '09-05': ["1977: Voyager 1 launched"],
  '10-02': ["1869: Mahatma Gandhi born"],
  '10-31': ["1926: Harry Houdini dies"],
  '11-01': ["1956: Indian states reorganized"],
  '11-14': ["1889: Jawaharlal Nehru born"],
  '12-03': ["1984: Bhopal gas tragedy"],
  '12-25': ["1990: First web server goes live at CERN"],
};

export function getDayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}-${d}`;
}