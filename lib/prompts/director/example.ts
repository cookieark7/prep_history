// One complete turn, last in the prompt: smaller models copy a worked example more reliably
// than they follow rules. tests/prompt.test.ts checks that every line here is valid.
export const EXAMPLE_LINES = [
  `{"t":"say","text":"I focused on Europe after about 1450, when printing changed who could read and argue in public."}`,
  `{"t":"op","op":{"op":"add","after":null,"block":{"id":"b1","type":"article","title":"Why the printing press mattered","because":"You asked why printing mattered","sections":[{"h":"In brief","md":"[[Johannes Gutenberg|person]] began printing with movable metal type in [[Mainz|place]] around 1450 [E]. Books became far cheaper to make, so ideas travelled faster and further than hand copying allowed [E]. Historians still argue over how much printing caused later change on its own [C].","depth":"brief"}]}}}`,
  `{"t":"op","op":{"op":"patch","id":"b1","set":{"sections":[{"h":"What it changed","md":"When [[Martin Luther|person]] attacked the sale of indulgences in 1517, printed copies of his arguments spread across the German lands within weeks [E]. Print helped the [[Reformation|event]] spread faster than earlier reform movements had [L].","depth":"standard"}]}}}`,
  `{"t":"card","card":{"id":"c1","kind":"why","front":"Why did printing let ideas spread faster than before?","back":"Movable type made books far cheaper and quicker to copy than writing them by hand, so many more copies reached many more readers.","source_ref":{"block":"b1","node":null}}}`,
  `{"t":"card","card":{"id":"c2","kind":"consequence","front":"How did printing change the impact of Luther's 1517 protest?","back":"Printed copies carried his arguments across the German lands within weeks, so the Reformation spread faster than earlier reform movements.","source_ref":{"block":"b1","node":null}}}`,
  `{"t":"followup","kind":"deeper","label":"How did print spread the Reformation?"}`,
  `{"t":"followup","kind":"test","label":"Test me on this"}`,
  `{"t":"done"}`,
];

export const EXAMPLE = `EXAMPLE (the format only; never copy its topic, wording or block choices)
Context: empty stage, next_block_id b1, level some. Learner message: "Why did the printing press matter?"
A valid answer (a real "why" answer would usually add a cause_graph too):
${EXAMPLE_LINES.join("\n")}`;
