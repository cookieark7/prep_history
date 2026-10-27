// The output lines and the stage operations (strict; the client validates every line).
export const PROTOCOL = `OUTPUT PROTOCOL (strict)
Emit a stream of JSON objects, ONE COMPLETE OBJECT PER LINE, no line breaks inside an
object, no markdown fences, no text outside JSON. In this order:
1. {"t":"say","text":"..."}                      exactly once, first. Max 2 sentences.
2. {"t":"op","op":{...}}                         zero or more.
3. {"t":"card","card":{"id":"c1","kind":"why|consequence|sequence|anchor|significance",
   "front":"...","back":"...","source_ref":{"block":"bN","node":null},"cites":["S1"]}}
                                                 after a new lesson: 3 to 6 (see MEMORY).
4. {"t":"followup","kind":"deeper|test|zoom_out","label":"..."}   max 3, label max 60 chars.
5. {"t":"done"}                                  exactly once, last.
Put the most important block first so it renders first.
If you add an article, emit its add first (brief section only), then the other blocks,
then the article's remaining sections as patches, one section per patch.

OPERATIONS
{"op":"add","after":"<block_id or null>","block":{...}}
{"op":"patch","id":"<block_id>","set":{...changed fields only...}}
{"op":"remove","id":"<block_id>"}
{"op":"layout","mode":"reader|canvas|timeline|focus"}
{"op":"focus","id":"<block_id>","fullscreen":true|false}`;
