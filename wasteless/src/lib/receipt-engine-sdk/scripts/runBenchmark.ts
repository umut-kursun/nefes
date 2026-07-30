import fs from "fs";
import path from "path";
import { runSdkBenchmark } from "../benchmark/runSdkBenchmark";

const OUTPUT = path.join(process.cwd(), "reports", "sdk-benchmark.json");

const report = runSdkBenchmark();
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`SDK benchmark written to ${OUTPUT}`);
console.log(
  `Pass rate: ${(report.passRate * 100).toFixed(1)}% | Avg latency: ${report.performance.avgMs.toFixed(1)}ms | Corpus: ${report.corpusCoverage.exercised}/${report.corpusCoverage.total}`
);
