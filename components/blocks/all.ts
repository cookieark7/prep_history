// Registers every block renderer with the registry. Imported once by the workspace.
import { registerBlock } from "./registry";
import { CauseGraphBlock } from "./CauseGraphBlock";
import { TimelineBlock } from "./TimelineBlock";
import { LineageBlock } from "./LineageBlock";

registerBlock("cause_graph", CauseGraphBlock);
registerBlock("timeline", TimelineBlock);
registerBlock("lineage", LineageBlock);
import { PredictGateBlock } from "./PredictGateBlock";
import { QuizBlock } from "./QuizBlock";

registerBlock("predict_gate", PredictGateBlock);
registerBlock("quiz", QuizBlock);
