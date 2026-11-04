// Each station as a short series of lessons, each one sitting (docs/MODES_PLAN.md, section 5.2).
// A part is read when its lesson has been read to the end; the syllabus shows parts read per
// station. Like the starter questions these are study prompts, not claims: edit freely.

import type { Station } from "./syllabus";

export interface SeriesPart {
  /** unique within its station */
  id: string;
  title: string;
  /** how the dates read, as on the station board */
  dates: string;
}

export const SERIES: Record<string, SeriesPart[]> = {
  // Ancient India
  "stone-age": [
    { id: "palaeolithic", title: "The Palaeolithic and Mesolithic", dates: "to c. 8000 BCE" },
    { id: "neolithic", title: "Neolithic farmers and Mehrgarh", dates: "c. 7000 – 3300 BCE" },
  ],
  harappan: [
    { id: "cities", title: "Cities, drains and seals", dates: "c. 2600 – 1900 BCE" },
    { id: "trade", title: "Trade, script and religion", dates: "c. 2600 – 1900 BCE" },
    { id: "decline", title: "The decline and after", dates: "c. 1900 – 1300 BCE" },
  ],
  vedic: [
    { id: "early", title: "The early Vedic age", dates: "c. 1500 – 1000 BCE" },
    { id: "later", title: "The later Vedic age", dates: "c. 1000 – 600 BCE" },
  ],
  magadha: [
    { id: "janapadas", title: "The sixteen Mahajanapadas", dates: "c. 600 – 450 BCE" },
    { id: "faiths", title: "The Buddha, Mahavira and the new faiths", dates: "6th – 5th century BCE" },
    { id: "rise", title: "The rise of Magadha", dates: "c. 544 – 321 BCE" },
  ],
  mauryan: [
    { id: "chandragupta", title: "Chandragupta and the Mauryan state", dates: "322 – 297 BCE" },
    { id: "ashoka", title: "Ashoka and dhamma", dates: "268 – 232 BCE" },
    { id: "decline", title: "Administration and the decline", dates: "232 – 185 BCE" },
  ],
  "post-mauryan": [
    { id: "north", title: "The Shungas, Indo-Greeks and Shakas", dates: "c. 185 BCE – 1st century CE" },
    { id: "kushanas", title: "The Kushanas and Kanishka", dates: "c. 30 – 375 CE" },
    { id: "south", title: "The Satavahanas and the Sangam age", dates: "c. 1st century BCE – 3rd century CE" },
  ],
  gupta: [
    { id: "kings", title: "The Gupta kings", dates: "c. 320 – 467 CE" },
    { id: "culture", title: "Science, art and literature", dates: "c. 320 – 550 CE" },
    { id: "decline", title: "The decline and the Huns", dates: "c. 467 – 550 CE" },
  ],

  // Medieval India
  "early-medieval": [
    { id: "harsha", title: "Harsha and Xuanzang", dates: "606 – 647" },
    { id: "tripartite", title: "The tripartite struggle for Kannauj", dates: "c. 750 – 1000" },
    { id: "cholas", title: "The Cholas", dates: "c. 850 – 1279" },
    { id: "raids", title: "The Ghaznavid and Ghurid invasions", dates: "c. 1000 – 1206" },
  ],
  sultanate: [
    { id: "mamluks", title: "The Mamluks", dates: "1206 – 1290" },
    { id: "khaljis", title: "The Khaljis", dates: "1290 – 1320" },
    { id: "tughlaqs", title: "The Tughlaqs", dates: "1320 – 1414" },
    { id: "lodis", title: "The Sayyids and the Lodis", dates: "1414 – 1526" },
  ],
  vijayanagara: [
    { id: "rise", title: "The rise of Vijayanagara and the Bahmanis", dates: "1336 – 1509" },
    { id: "krishnadevaraya", title: "Krishnadevaraya and Hampi", dates: "1509 – 1529" },
    { id: "talikota", title: "Talikota and after", dates: "1529 – 1565" },
  ],
  "bhakti-sufi": [
    { id: "south", title: "The Alvars and the Nayanars", dates: "6th – 9th century" },
    { id: "north", title: "Kabir, Guru Nanak and the northern saints", dates: "15th – 16th century" },
    { id: "sufis", title: "The Sufi orders in India", dates: "12th – 16th century" },
  ],
  mughal: [
    { id: "babur", title: "Babur and Humayun", dates: "1526 – 1556" },
    { id: "akbar", title: "Akbar", dates: "1556 – 1605" },
    { id: "jahangir", title: "Jahangir and Shah Jahan", dates: "1605 – 1658" },
    { id: "aurangzeb", title: "Aurangzeb and the decline", dates: "1658 – 1707" },
  ],
  marathas: [
    { id: "shivaji", title: "Shivaji and the Maratha state", dates: "1630 – 1680" },
    { id: "peshwas", title: "The Peshwas and expansion", dates: "1713 – 1761" },
    { id: "panipat", title: "The Third Battle of Panipat", dates: "1761" },
    { id: "anglo-maratha", title: "The Anglo-Maratha wars and the end of Maratha power", dates: "1775 – 1818" },
  ],

  // Modern India
  company: [
    { id: "plassey", title: "Plassey and Buxar", dates: "1757 – 1765" },
    { id: "expansion", title: "Mysore, the Marathas and the subsidiary alliance", dates: "1767 – 1818" },
    { id: "revenue", title: "Land revenue: the Permanent Settlement and after", dates: "1793 – 1833" },
    { id: "dalhousie", title: "Dalhousie and the doctrine of lapse", dates: "1848 – 1856" },
  ],
  "revolt-1857": [
    { id: "causes", title: "The causes and the outbreak at Meerut", dates: "1857" },
    { id: "centres", title: "The centres, the leaders and the end", dates: "1857 – 1858" },
    { id: "after", title: "After the revolt: the Crown takes over", dates: "1858" },
  ],
  "early-nationalism": [
    { id: "reform", title: "Social and religious reform", dates: "1828 – 1875" },
    { id: "congress", title: "The founding of the Congress", dates: "1885" },
    { id: "moderates", title: "The moderates and the drain of wealth", dates: "1885 – 1905" },
  ],
  swadeshi: [
    { id: "bengal", title: "The partition of Bengal and Swadeshi", dates: "1905 – 1911" },
    { id: "surat", title: "The Surat split and the Morley–Minto reforms", dates: "1907 – 1909" },
    { id: "home-rule", title: "Home Rule and the Lucknow Pact", dates: "1916 – 1918" },
  ],
  gandhian: [
    { id: "champaran", title: "Champaran to the Rowlatt Act", dates: "1917 – 1919" },
    { id: "non-cooperation", title: "Non-cooperation and Khilafat", dates: "1920 – 1922" },
    { id: "salt", title: "Civil disobedience and the Salt March", dates: "1930 – 1934" },
    { id: "quit-india", title: "The 1935 Act to Quit India", dates: "1935 – 1942" },
  ],
  independence: [
    { id: "ina", title: "From Quit India to the INA trials", dates: "1942 – 1946" },
    { id: "cabinet-mission", title: "The Cabinet Mission and Direct Action Day", dates: "1946" },
    { id: "partition", title: "Partition and the princely states", dates: "1947 – 1949" },
  ],

  // World history
  industrial: [
    { id: "britain", title: "Why Britain first", dates: "c. 1760 – 1800" },
    { id: "factories", title: "Factories, cities and workers", dates: "c. 1800 – 1840" },
    { id: "india", title: "Industry and Indian textiles", dates: "c. 1780 – 1850" },
  ],
  revolutions: [
    { id: "american", title: "The American Revolution", dates: "1765 – 1783" },
    { id: "french", title: "The French Revolution", dates: "1789 – 1799" },
    { id: "napoleon", title: "Napoleon", dates: "1799 – 1815" },
  ],
  imperialism: [
    { id: "why", title: "Why industrial powers wanted colonies", dates: "c. 1870 – 1914" },
    { id: "africa", title: "The scramble for Africa", dates: "1881 – 1914" },
    { id: "japan", title: "Meiji Japan", dates: "1868 – 1912" },
  ],
  "world-war-1": [
    { id: "causes", title: "The causes and the July Crisis", dates: "1871 – 1914" },
    { id: "war", title: "The war", dates: "1914 – 1918" },
    { id: "versailles", title: "Versailles and India's part", dates: "1918 – 1919" },
  ],
  interwar: [
    { id: "russia", title: "The Russian Revolution", dates: "1917 – 1924" },
    { id: "depression", title: "The Great Depression", dates: "1929 – 1933" },
    { id: "fascism", title: "Fascism in Italy and Germany", dates: "1922 – 1939" },
  ],
  "world-war-2": [
    { id: "road", title: "The road to war", dates: "1933 – 1939" },
    { id: "war", title: "The war, and why the Allies won", dates: "1939 – 1945" },
    { id: "empires", title: "The war and the end of empires", dates: "1941 – 1947" },
  ],
  decolonisation: [
    { id: "empires", title: "The end of the European empires", dates: "1945 – 1975" },
    { id: "nam", title: "The Cold War and the Non-Aligned Movement", dates: "1947 – 1962" },
    { id: "end", title: "How the Cold War ended", dates: "1985 – 1991" },
  ],
};

export const seriesOf = (stationId: string): SeriesPart[] => SERIES[stationId] ?? [];

/** What a part's lesson asks, and the topic it is saved under. */
export function partAsk(s: Station, p: SeriesPart): { message: string; topic: string } {
  const parts = seriesOf(s.id);
  const n = parts.findIndex((x) => x.id === p.id) + 1;
  return {
    message: `${s.name}, part ${n} of ${parts.length}: ${p.title} (${p.dates})`,
    topic: `${s.name}, part ${n}: ${p.title}`,
  };
}

/** How many of a station's parts have been read. */
export const partsRead = (stationId: string, read: Record<string, true>) => seriesOf(stationId).filter((p) => read[`${stationId}/${p.id}`]).length;
