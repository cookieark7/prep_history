// The history half of UPSC GS Paper I as one route: four parts, each a line of stations in
// time order. A station is a syllabus unit with its dates, an opening plate where one fits
// (public/opening), and three starter questions. Years are calendar years, negative for BCE.
// Edit freely: these are study prompts, not claims.

export type PartId = "ancient" | "medieval" | "modern" | "world";

export interface Station {
  id: string;
  part: PartId;
  /** the full name, set on the station board */
  name: string;
  /** under the dot on the line */
  short: string;
  from: number;
  to: number;
  /** how the dates read on the board */
  dates: string;
  /** the date under the dot, when the start year alone would mislead */
  mark?: string;
  /** an opening plate (content/landing/beats.ts) that shows this period */
  plate?: string;
  questions: [string, string, string];
}

export const PARTS: { id: PartId; label: string }[] = [
  { id: "ancient", label: "Ancient India" },
  { id: "medieval", label: "Medieval India" },
  { id: "modern", label: "Modern India" },
  { id: "world", label: "World history" },
];

export const STATIONS: Station[] = [
  // Ancient India
  { id: "stone-age", part: "ancient", name: "Stone Age India", short: "Stone Age", from: -10000, to: -3300, dates: "to c. 3300 BCE", mark: "to 3300 BCE", plate: "B15",
    questions: ["What changed in India between the Palaeolithic and the Neolithic?", "What do the rock paintings at Bhimbetka show?", "Why does Mehrgarh matter for the story of farming?"] },
  { id: "harappan", part: "ancient", name: "Harappan civilisation", short: "Harappan", from: -2600, to: -1900, dates: "c. 2600 – 1900 BCE", plate: "B16",
    questions: ["How were Harappan towns planned, and why the drains?", "What do Harappan seals tell us about trade with Mesopotamia?", "Why did the Harappan cities decline after 1900 BCE?"] },
  { id: "vedic", part: "ancient", name: "Vedic age", short: "Vedic age", from: -1500, to: -600, dates: "c. 1500 – 600 BCE",
    questions: ["How did society change from the early to the later Vedic age?", "What were the sabha and the samiti?", "Where did the varna order come from?"] },
  { id: "magadha", part: "ancient", name: "Mahajanapadas and Magadha", short: "Magadha", from: -600, to: -321, dates: "c. 600 – 321 BCE", plate: "B19",
    questions: ["Why did Magadha become the strongest of the Mahajanapadas?", "What did the Buddha and Mahavira teach, and why did it spread?", "What were the sixteen Mahajanapadas?"] },
  { id: "mauryan", part: "ancient", name: "Mauryan empire", short: "Mauryan", from: -322, to: -185, dates: "322 – 185 BCE",
    questions: ["Why did Ashoka turn to dhamma after Kalinga?", "How was the Mauryan state run?", "Where are Ashoka's edicts found, and what do they say?"] },
  { id: "post-mauryan", part: "ancient", name: "After the Mauryas", short: "Post-Mauryan", from: -185, to: 320, dates: "c. 185 BCE – 320 CE", plate: "B20",
    questions: ["Who were the Kushanas, and why does Kanishka matter?", "What do the Sangam poems tell us about the south?", "How did trade with Rome shape south India?"] },
  { id: "gupta", part: "ancient", name: "Gupta age", short: "Gupta", from: 320, to: 550, dates: "c. 320 – 550 CE",
    questions: ["Why is the Gupta period called a golden age, and is that fair?", "What did Aryabhata work out?", "Why did the Gupta empire decline?"] },

  // Medieval India
  { id: "early-medieval", part: "medieval", name: "Early medieval kingdoms", short: "Early medieval", from: 550, to: 1200, dates: "c. 550 – 1200 CE",
    questions: ["What was the tripartite struggle over Kannauj?", "How did the Cholas build a navy and reach Southeast Asia?", "Who was Harsha, and what did Xuanzang record?"] },
  { id: "sultanate", part: "medieval", name: "Delhi Sultanate", short: "Sultanate", from: 1206, to: 1526, dates: "1206 – 1526",
    questions: ["How did Alauddin Khalji control the markets?", "Why did Muhammad bin Tughlaq move the capital to Daulatabad?", "How did the Sultanate hold off the Mongols?"] },
  { id: "vijayanagara", part: "medieval", name: "Vijayanagara and the Bahmanis", short: "Vijayanagara", from: 1336, to: 1565, dates: "1336 – 1565",
    questions: ["How was Hampi laid out?", "Why did Vijayanagara and the Bahmanis fight over the Raichur doab?", "What happened at Talikota in 1565?"] },
  { id: "bhakti-sufi", part: "medieval", name: "Bhakti and Sufi movements", short: "Bhakti and Sufi", from: 1400, to: 1600, dates: "c. 1400 – 1600",
    questions: ["What did Kabir and Guru Nanak teach?", "How did the Chishti Sufis spread in India?", "How were the bhakti saints of the south different from those of the north?"] },
  { id: "mughal", part: "medieval", name: "Mughal empire", short: "Mughal", from: 1526, to: 1707, dates: "1526 – 1707",
    questions: ["How did Akbar's mansabdari system work?", "What was Akbar's policy of sulh-i kul?", "Why did the empire weaken after Aurangzeb?"] },
  { id: "marathas", part: "medieval", name: "The Marathas", short: "Marathas", from: 1674, to: 1818, dates: "1674 – 1818",
    questions: ["How did Shivaji organise his state?", "What were chauth and sardeshmukhi?", "Why did the Marathas lose at Panipat in 1761?"] },

  // Modern India
  { id: "company", part: "modern", name: "Company rule", short: "Company rule", from: 1757, to: 1857, dates: "1757 – 1857",
    questions: ["Why did the Company win at Plassey and Buxar?", "What was the subsidiary alliance?", "How did the Permanent Settlement work, and who lost by it?"] },
  { id: "revolt-1857", part: "modern", name: "Revolt of 1857", short: "1857", from: 1857, to: 1858, dates: "1857 – 1858",
    questions: ["Why did the revolt begin at Meerut?", "Who led the revolt, and where?", "Why did the revolt fail?"] },
  { id: "early-nationalism", part: "modern", name: "Reform and early nationalism", short: "Early nationalism", from: 1858, to: 1905, dates: "1858 – 1905",
    questions: ["Why was the Indian National Congress founded in 1885?", "What did the moderates ask for, and how?", "What did the Brahmo Samaj and the Arya Samaj want to change?"] },
  { id: "swadeshi", part: "modern", name: "Swadeshi and the extremists", short: "Swadeshi", from: 1905, to: 1918, dates: "1905 – 1918",
    questions: ["Why was Bengal partitioned in 1905?", "What did the Swadeshi movement do?", "Why did the Congress split at Surat in 1907?"] },
  { id: "gandhian", part: "modern", name: "Gandhi and the mass movements", short: "Gandhian era", from: 1919, to: 1942, dates: "1919 – 1942",
    questions: ["Why did Gandhi call off Non-cooperation in 1922?", "What was the Salt March meant to achieve?", "What happened in the Quit India movement?"] },
  { id: "independence", part: "modern", name: "Independence and Partition", short: "Independence", from: 1942, to: 1947, dates: "1942 – 1947", plate: "B31",
    questions: ["Why was India partitioned?", "What did the Cabinet Mission propose?", "How did the princely states join India?"] },

  // World history
  { id: "industrial", part: "world", name: "Industrial Revolution", short: "Industry", from: 1760, to: 1840, dates: "c. 1760 – 1840", plate: "B29",
    questions: ["Why did the Industrial Revolution start in Britain?", "How did it change work and cities?", "What did it mean for Indian textiles?"] },
  { id: "revolutions", part: "world", name: "Age of revolutions", short: "Revolutions", from: 1776, to: 1815, dates: "1776 – 1815", plate: "B28",
    questions: ["What caused the French Revolution?", "What did the American Revolution change?", "What did Napoleon keep from the Revolution?"] },
  { id: "imperialism", part: "world", name: "Colonialism and imperialism", short: "Imperialism", from: 1870, to: 1914, dates: "c. 1870 – 1914",
    questions: ["What was the scramble for Africa?", "Why did industrial powers want colonies?", "How did Japan modernise after 1868?"] },
  { id: "world-war-1", part: "world", name: "First World War", short: "World War I", from: 1914, to: 1918, dates: "1914 – 1918", plate: "B30",
    questions: ["What caused the First World War?", "What did the Treaty of Versailles decide?", "How did the war affect India?"] },
  { id: "interwar", part: "world", name: "Between the wars", short: "Interwar", from: 1917, to: 1939, dates: "1917 – 1939",
    questions: ["What happened in the Russian Revolution of 1917?", "Why did fascism rise in Italy and Germany?", "What was the Great Depression, and how did it spread?"] },
  { id: "world-war-2", part: "world", name: "Second World War", short: "World War II", from: 1939, to: 1945, dates: "1939 – 1945",
    questions: ["Why did the Second World War begin in 1939?", "Why did the Allies win?", "How did the war speed up the end of empires?"] },
  { id: "decolonisation", part: "world", name: "Decolonisation and the Cold War", short: "Decolonisation", from: 1945, to: 1991, dates: "1945 – 1991",
    questions: ["Why did the European empires end after 1945?", "What was the Non-Aligned Movement?", "How did the Cold War end?"] },
];

export const stationsOf = (part: PartId) => STATIONS.filter((s) => s.part === part);
export const stationById = (id: string | null | undefined) => STATIONS.find((s) => s.id === id) ?? null;
