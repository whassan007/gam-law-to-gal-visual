import { runLawToGalPipeline } from "./pipeline";
import { parseArgs } from "util";

const args = parseArgs({
  options: {
    jurisdiction: { type: "string", short: "j" },
    "statute-text": { type: "string", short: "t" },
    "source-url": { type: "string", short: "u" },
    "output-format": { type: "string", default: "json" },
  },
  strict: false,
});

async function main() {
  const jurisdiction = String(args.values.jurisdiction ?? "");
  const statuteText = String(args.values["statute-text"] ?? "");
  const sourceUrl = String(args.values["source-url"] ?? "");
  const outputFormat = String(args.values["output-format"] ?? "json");

  if (!jurisdiction || !statuteText) {
    console.error(
      "Usage: cli.ts --jurisdiction=<jur> --statute-text=<text> [--source-url=<url>] [--output-format=json|alloy]"
    );
    process.exit(1);
  }

  try {
    const result = await runLawToGalPipeline(jurisdiction, statuteText, sourceUrl);

    if (outputFormat === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else if (outputFormat === "alloy") {
      console.log(result.alloySpecification);
    }
    process.exit(0);
  } catch (err) {
    console.error("Pipeline error:", err);
    process.exit(1);
  }
}

void main();
