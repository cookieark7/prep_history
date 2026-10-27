import type { Beat } from "@/lib/landing/types";

// Verbatim from docs/chronicle-landing-build-prompt.md, section 8.1. Edit the prompt's
// content there first; this file must match it ("use the content exactly").
// `t` is years ago in Act I and a calendar year in Acts II and III. Array order is play order.

export const BEATS: Beat[] = [
  // Act I: deep time (log ticker)
  { id:"B01", act:1, title:"The Big Bang", label:"13.8 billion years ago", t:13.8e9, bg:"#0B0714", accent:"#FF7A3D", glyph:"point", anchor:"Point of light", dwell:true,  caption:"Everything begins as a point, hot and dense. As it cools, matter gathers." },
  { id:"B02", act:1, title:"First stars", label:"13.5 billion years ago", t:13.5e9, bg:"#101436", accent:null, glyph:"star", anchor:"Blue-white star", dwell:false, caption:"The first stars burn and explode, forging heavier elements." },
  { id:"B03", act:1, title:"Sun and planets form", label:"4.6 billion years ago", t:4.6e9, bg:"#3A1E10", accent:"#E8A33A", glyph:"disc", anchor:"Young sun disc", dwell:false, caption:"From the debris of earlier stars, the Sun and its planets form." },
  { id:"B04", act:1, title:"Earth and the Moon", label:"4.5 billion years ago", t:4.5e9, bg:"#4A1A10", accent:"#FF5A2A", glyph:"disc", anchor:"Molten sphere", dwell:false, caption:"A giant collision likely gives Earth its Moon, and with it, strong tides." },
  { id:"B05", act:1, title:"First life", label:"3.8 to 3.5 billion years ago", t:3.8e9, bg:"#0E3A3F", accent:null, glyph:"cell", anchor:"Round cell", dwell:false, caption:"In warm water, chemistry starts copying itself. Life begins." },
  { id:"B06", act:1, title:"Oxygen and the complex cell", label:"2.4 to 2.0 billion years ago", t:2.4e9, bg:"#5A2A1E", accent:"#1F4D3A", glyph:"cell", anchor:"Cell with nucleus", dwell:false, caption:"Microbes fill the air with oxygen. One cell swallows another and keeps it." },
  { id:"B07", act:1, title:"The Cambrian explosion", label:"540 million years ago", t:540e6, bg:"#0B3C4F", accent:null, glyph:"spiral", anchor:"Coiled shell", dwell:false, caption:"With oxygen and complex cells, bodies, eyes and shells appear in a rush." },
  { id:"B08", act:1, title:"Life reaches land", label:"470 to 375 million years ago", t:470e6, bg:"#1F4A2E", accent:null, glyph:"spiral", anchor:"Fern spiral", dwell:false, caption:"Plants move onto land first. Animals follow the food." },
  { id:"B09", act:1, title:"The coal forests", label:"300 million years ago", t:300e6, bg:"#17391F", accent:null, glyph:"concentric", anchor:"Tree rings", dwell:false, caption:"Swamp forests are buried before they can rot. Their carbon becomes coal." },
  { id:"B10", act:1, title:"Age of dinosaurs", label:"70 million years ago", t:70e6, bg:"#5C3B14", accent:null, glyph:"disc", anchor:"Pale sun disc", dwell:false, caption:"Dinosaurs rule for over 150 million years. Mammals stay small." },
  { id:"B11", act:1, title:"The impact", label:"66 million years ago", t:66e6, bg:"#1A0A08", accent:"#FF4A1C", glyph:"star", anchor:"Fireball", dwell:true,  caption:"An asteroid ends the age of dinosaurs. Small mammals inherit the Earth." },
  { id:"B12", act:1, title:"Upright walkers and the first tools", label:"6 to 2.6 million years ago", t:6e6, bg:"#6B4A24", accent:null, glyph:"disc", anchor:"Hammerstone", dwell:false, caption:"Our ancestors stand upright. Free hands begin shaping stone." },
  { id:"B13", act:1, title:"Homo sapiens", label:"c. 300,000 years ago", t:300000, bg:"#5A3C22", accent:null, glyph:"ring", anchor:"Campfire ring", dwell:false, caption:"Our species appears in Africa and, over time, spreads across the world." },
  { id:"B14", act:1, title:"Cave art", label:"c. 40,000 years ago", t:40000, bg:"#6E3A22", accent:null, glyph:"ring", anchor:"Handprint ring", dwell:false, caption:"People paint what they see and believe. Ideas begin to outlive their makers." },
  { id:"B15", act:1, title:"Farming", label:"c. 11,000 years ago", t:11000, bg:"#8A6A2B", accent:null, glyph:"wheel", anchor:"Millstone", dwell:false, caption:"Farming begins. Surpluses let people settle, store food and multiply." },
  // Act II: recorded history (linear ticker). The B15 -> B16 transition is the page turn.
  { id:"B16", act:2, title:"The first cities", label:"c. 3500 BCE", t:-3500, bg:"#8A4B2E", accent:null, glyph:"concentric", anchor:"Circular plaza", dwell:false, caption:"Surpluses feed cities. Cities need rulers, priests and records." },
  { id:"B17", act:2, title:"Writing", label:"c. 3200 BCE", t:-3200, bg:"#7A4A30", accent:null, glyph:"disc", anchor:"Clay disc", dwell:true,  caption:"To track grain and debts, people invent writing. Recorded history begins." },
  { id:"B18", act:2, title:"Pyramids and Indus cities", label:"c. 2600 BCE", t:-2600, bg:"#B07A3A", accent:"#2F4B8C", glyph:"disc", anchor:"Sun between two worlds", dwell:false, caption:"Egypt raises pyramids for its kings. Indus cities lay out streets and drains." },
  { id:"B19", act:2, title:"The age of thinkers", label:"c. 500 BCE", t:-500, bg:"#2F4B8C", accent:null, glyph:"disc", anchor:"Oil lamp", dwell:false, caption:"Across Greece, India and China, thinkers ask how to live and how to rule." },
  { id:"B20", act:2, title:"Silk Road empires", label:"c. 100 BCE", t:-100, bg:"#8C2F2B", accent:"#C9A24A", glyph:"ring", anchor:"Coin", dwell:false, caption:"Rome and Han China trade across Asia. Goods, ideas and germs travel together." },
  { id:"B21", act:2, title:"The fall of Western Rome", label:"476 CE", t:476, bg:"#6B645A", accent:null, glyph:"disc", anchor:"Cracked shield", dwell:false, caption:"Western Rome falls, and why is still debated. Its learning survives in the East." },
  { id:"B22", act:2, title:"House of Wisdom", label:"c. 830 CE", t:830, bg:"#1F5C5C", accent:"#C9A24A", glyph:"rose", anchor:"Astrolabe", dwell:false, caption:"In Baghdad, scholars translate and extend Greek, Persian and Indian knowledge." },
  { id:"B23", act:2, title:"The Mongol empire", label:"1206 to 1260", t:1206, bg:"#6A5A3A", accent:null, glyph:"wheel", anchor:"Yurt", dwell:false, caption:"The Mongols build the largest land empire yet and reconnect Asia's trade routes." },
  { id:"B24", act:2, title:"The Black Death", label:"1347", t:1347, bg:"#2E2B2A", accent:null, glyph:"ring", anchor:"Bell", dwell:true,  caption:"Along those routes, plague reaches Europe and kills a third or more." },
  { id:"B35", act:2, title:"Mali, the Aztec and the Inca", label:"c. 1325 to 1450", t:1400, bg:"#4E5A2C", accent:"#D4A03A", glyph:"concentric", anchor:"Ringed terraces", dwell:false, caption:"Meanwhile, Mali grows rich on Saharan gold, and the Aztec and Inca build empires." },
  { id:"B25", act:2, title:"The printing press", label:"c. 1450", t:1450, bg:"#3B2F20", accent:null, glyph:"spiral", anchor:"Screw platen", dwell:false, caption:"Gutenberg's press makes books cheap in Europe. Ideas start outrunning censors." },
  { id:"B26", act:2, title:"The oceans open", label:"1492 to 1498", t:1492, bg:"#1F4F73", accent:null, glyph:"rose", anchor:"Compass rose", dwell:false, caption:"Ocean routes join the continents. Trade, conquest and disease follow the ships." },
  { id:"B27", act:2, title:"The scientific revolution", label:"1543 to 1687", t:1543, bg:"#D8CBA8", accent:"#3B4A8C", glyph:"orbits", anchor:"Orbits around the sun", dwell:false, caption:"From Copernicus to Newton, printed ideas build on each other. Nature gets laws." },
  { id:"B28", act:2, title:"Revolutions", label:"1776 to 1789", t:1776, bg:"#7A2530", accent:null, glyph:"concentric", anchor:"Cockade", dwell:false, caption:"If nature follows laws, why not politics? America and France reject rule by kings." },
  { id:"B29", act:2, title:"The Industrial Revolution", label:"c. 1760 to 1840", t:1790, bg:"#3A3F44", accent:"#E2742B", glyph:"wheel", anchor:"Flywheel", dwell:true,  caption:"Coal from those ancient forests now drives machines. Work moves into factories." },
  { id:"B30", act:2, title:"The World Wars", label:"1914 to 1945", t:1914, bg:"#4A4A44", accent:null, glyph:"dial", anchor:"Stopped pocket watch", dwell:false, caption:"Industrial power turns to war. Two world wars kill tens of millions." },
  { id:"B31", act:2, title:"Independence and decolonization", label:"1947", t:1947, bg:"#D98A3D", accent:null, glyph:"wheel", anchor:"Spinning wheel", dwell:true,  caption:"Exhausted by war, empires retreat. India and Pakistan lead a wave of new nations." },
  { id:"B32", act:2, title:"The space age", label:"1969", t:1969, bg:"#0E1220", accent:"#E9E3D8", glyph:"disc", anchor:"Moon disc", dwell:false, caption:"People walk on the Moon and look back at Earth, small and whole." },
  { id:"B33", act:2, title:"The internet", label:"1990s", t:1995, bg:"#12202E", accent:"#5FB3C2", glyph:"globe", anchor:"Glass globe", dwell:true,  caption:"Computers link up worldwide. Anyone can publish; anyone can look things up." },
  // Act III
  { id:"B34", act:3, title:"Now", label:"Now", t:2026, bg:"#FAF7F2", accent:null, glyph:"ring", anchor:"Empty ring", dwell:false, caption:"Everything you just saw had causes." },
];
