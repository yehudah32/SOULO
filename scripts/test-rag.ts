import 'dotenv/config';
import { queryKnowledgeBase } from '../lib/rag';

const TEST_QUERIES = [
  'What is the core fear of a Type 4',
  'How does a Type 8 respond under stress',
  'What are the instinctual variants',
];

async function main() {
  console.log('Testing RAG knowledge base...\n');

  for (const query of TEST_QUERIES) {
    console.log(`Query: "${query}"`);
    console.log('─'.repeat(60));

    const result = await queryKnowledgeBase(query);

    if (!result) {
      console.log('(No results returned — knowledge base may be empty or threshold not met)\n');
    } else {
      console.log(result);
      console.log();
    }
  }

  console.log('Done.');
}

main();
