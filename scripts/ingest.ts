import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const PDFS_DIR = path.join(process.cwd(), 'pdfs');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks.filter((c) => c.length > 0);
}

async function embedChunks(chunks: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  });
  return response.data.map((d) => d.embedding);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function insertWithRetry(
  rows: object[],
  batchLabel: string
): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { error } = await adminClient.from('documents').insert(rows);
    if (!error) return true;
    if (attempt < MAX_RETRIES) {
      console.error(`  ✗ ${batchLabel} failed (attempt ${attempt}/${MAX_RETRIES}): ${error.message} — retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    } else {
      console.error(`  ✗ ${batchLabel} failed after ${MAX_RETRIES} attempts: ${error.message}`);
    }
  }
  return false;
}

async function ingestFile(filePath: string): Promise<number> {
  const filename = path.basename(filePath);
  console.log(`\nProcessing: ${filename}`);

  let text: string;
  if (filePath.toLowerCase().endsWith('.txt')) {
    text = fs.readFileSync(filePath, 'utf-8');
  } else {
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(buffer);
    text = parsed.text;
  }

  if (!text || text.trim().length === 0) {
    console.log(`  ⚠ No text extracted from ${filename}, skipping.`);
    return 0;
  }

  const chunks = chunkText(text);
  console.log(`  Chunks: ${chunks.length}`);

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await embedChunks(batch);

    const rows = batch.map((content, j) => ({
      content,
      metadata: { filename, chunk_index: i + j },
      embedding: embeddings[j],
    }));

    const batchLabel = `batch ${Math.floor(i / BATCH_SIZE) + 1}`;
    const ok = await insertWithRetry(rows, batchLabel);

    if (ok) {
      inserted += batch.length;
      console.log(`  ✓ Inserted ${batchLabel} (${inserted}/${chunks.length} chunks)`);
    }
  }

  return inserted;
}

async function main() {
  if (!fs.existsSync(PDFS_DIR)) {
    console.log('No /pdfs folder found. Create it and add your PDF files.');
    process.exit(0);
  }

  const files = fs
    .readdirSync(PDFS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf') || f.toLowerCase().endsWith('.txt'))
    .map((f) => path.join(PDFS_DIR, f));

  if (files.length === 0) {
    console.log('No PDF or TXT files found in /pdfs folder. Add your files and run again.');
    process.exit(0);
  }

  console.log(`Found ${files.length} file(s) (PDF + TXT). Starting ingestion...\n`);

  let totalChunks = 0;
  let successCount = 0;
  let failedFiles: string[] = [];

  for (const file of files) {
    try {
      const count = await ingestFile(file);
      totalChunks += count;
      successCount++;
    } catch (err) {
      const name = path.basename(file);
      console.error(`\n✗ Failed to process ${name}:`, err);
      failedFiles.push(name);
    }
  }

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Ingestion complete.`);
  console.log(`  Files processed: ${successCount}/${files.length}`);
  console.log(`  Total chunks inserted: ${totalChunks}`);
  if (failedFiles.length > 0) {
    console.log(`  Files with errors: ${failedFiles.join(', ')}`);
  }
}

main();
