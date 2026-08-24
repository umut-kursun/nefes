import fs from "node:fs";
import path from "node:path";
import { formatBenchmarkMarkdown } from "../formatMarkdownReport";
import { runBenchmark } from "../runBenchmark";

const OUTPUT = path.join(process.cwd(), "reports", "v1-v2-benchmark.md");
const JSON_OUTPUT = path.join(process.cwd(), "reports", "v1-v2-benchmark.json");

const report = runBenchmark();
const markdown = formatBenchmarkMarkdown(report);

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${markdown}\n`, "utf8");
fs.writeFileSync(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Benchmark markdown written to ${OUTPUT}`);
console.log(`Benchmark JSON written to ${JSON_OUTPUT}`);
console.log(`Overall: V1 ${report.v1OverallScore}% · V2 ${report.v2OverallScore}%`);
