/**
 * Build reproducible corpus artifacts from real receipt OCR fixtures.
 * Usage: npx tsx src/lib/receipt-engine-quality/scripts/buildCorpus.ts
 */
import { buildAllCorpusEntries } from "../corpus/buildCorpusEntry";
import { CORPUS_CATALOG } from "../corpus/corpusRegistry";

buildAllCorpusEntries(CORPUS_CATALOG);
console.log(`Built ${CORPUS_CATALOG.length} corpus entries.`);
