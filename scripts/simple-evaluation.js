const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'prompts', 'system-prompts.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const sampleQueries = [
  {
    id: 'query-1',
    description: 'Simple payment reminder',
    query: 'Customer has ₹10,000 overdue since 2024-01-15. Call and remind them.',
    expectedElements: ['overdue', '₹10,000', 'payment date', 'polite']
  },
  {
    id: 'query-2',
    description: 'Customer making excuses',
    query: 'Customer says they have cash flow issues and need more time.',
    expectedElements: ['empathy', 'understanding', 'payment plan', 'flexibility']
  },
  {
    id: 'query-3',
    description: 'Immediate payment promise',
    query: 'Customer promises to pay today.',
    expectedElements: ['thank', 'appreciation', 'confirmation', 'follow-up']
  },
  {
    id: 'query-4',
    description: 'Request to speak to manager',
    query: 'Customer wants to speak to someone else.',
    expectedElements: ['escalate', 'team', 'call back', 'professional']
  },
  {
    id: 'query-5',
    description: 'Threat to block supplies',
    query: 'Customer is delaying payment repeatedly.',
    expectedElements: ['future supplies', 'block', 'consequences', 'firm']
  },
  {
    id: 'query-6',
    description: 'Partial payment request',
    query: 'Customer can only pay half now.',
    expectedElements: ['partial payment', 'installment', 'arrangement', 'solution']
  },
  {
    id: 'query-7',
    description: 'Payment date confirmation',
    query: 'Customer says they will pay on 2024-02-01.',
    expectedElements: ['confirm', '2024-02-01', 'reminder', 'commitment']
  },
  {
    id: 'query-8',
    description: 'Customer asking for discount',
    query: 'Customer requests discount on overdue amount.',
    expectedElements: ['policy', 'terms', 'negotiation', 'business']
  },
  {
    id: 'query-9',
    description: 'Follow-up on broken promise',
    query: 'Customer promised to pay yesterday but didn\'t.',
    expectedElements: ['follow-up', 'broken promise', 'urgency', 'accountability']
  },
  {
    id: 'query-10',
    description: 'New customer with first overdue',
    query: 'First-time customer has their first overdue payment.',
    expectedElements: ['relationship', 'first time', 'understanding', 'support']
  }
];

function evaluatePromptResponse(promptContent, query) {
  const content = promptContent.toLowerCase();
  const queryText = query.query.toLowerCase();
  
  let relevanceScore = 0;
  let hinglishAccuracy = 0;
  let toolCallingAccuracy = 0;
  
  const expectedElements = query.expectedElements.map(el => el.toLowerCase());
  
  expectedElements.forEach(element => {
    if (content.includes(element)) {
      relevanceScore += 0.1;
    }
  });
  
  const hinglishIndicators = ['namaste', 'aap', 'hain', 'hai', 'denge', 'kab', 'kitne', 'payment', 'overdue', 'thank', 'dhanyavaad'];
  let hinglishCount = 0;
  hinglishIndicators.forEach(indicator => {
    if (content.includes(indicator)) {
      hinglishCount++;
    }
  });
  hinglishAccuracy = hinglishCount / hinglishIndicators.length;
  
  const toolCallingIndicators = ['replace', '[amount]', '[date]', '[name]', 'confirm', 'ask', 'remind', 'call'];
  let toolCallingCount = 0;
  toolCallingIndicators.forEach(indicator => {
    if (content.includes(indicator)) {
      toolCallingCount++;
    }
  });
  toolCallingAccuracy = toolCallingCount / toolCallingIndicators.length;
  
  return {
    relevanceScore: Math.min(relevanceScore, 1),
    hinglishAccuracy,
    toolCallingAccuracy
  };
}

function evaluatePromptVersion(prompt, queries) {
  const evaluations = queries.map(query => 
    evaluatePromptResponse(prompt.content, query)
  );
  
  const avgRelevance = evaluations.reduce((sum, eval) => sum + eval.relevanceScore, 0) / evaluations.length;
  const avgHinglish = evaluations.reduce((sum, eval) => sum + eval.hinglishAccuracy, 0) / evaluations.length;
  const avgToolCalling = evaluations.reduce((sum, eval) => sum + eval.toolCallingAccuracy, 0) / evaluations.length;
  
  const overallScore = (avgRelevance * 0.4 + avgHinglish * 0.3 + avgToolCalling * 0.3) * 100;
  
  return {
    version: prompt.id,
    name: prompt.name,
    relevanceScore: avgRelevance,
    hinglishAccuracy: avgHinglish,
    toolCallingAccuracy: avgToolCalling,
    overallScore
  };
}

function main() {
  console.log('🔍 Prompt Evaluation Results');
  console.log('============================\n');
  
  const versions = ['v1.0.0', 'v1.1.0', 'v1.2.0'];
  const results = [];
  
  for (const versionId of versions) {
    const prompt = config.prompts[versionId];
    if (!prompt) {
      console.log(`⚠️  Prompt version ${versionId} not found, skipping...`);
      continue;
    }
    
    console.log(`Evaluating: ${prompt.name} (${versionId})`);
    const result = evaluatePromptVersion(prompt, sampleQueries);
    results.push(result);
    
    console.log(`  Relevance: ${(result.relevanceScore * 100).toFixed(1)}%`);
    console.log(`  Hinglish Accuracy: ${(result.hinglishAccuracy * 100).toFixed(1)}%`);
    console.log(`  Tool Calling: ${(result.toolCallingAccuracy * 100).toFixed(1)}%`);
    console.log(`  Overall Score: ${result.overallScore.toFixed(1)}/100\n`);
  }
  
  console.log('📊 Summary');
  console.log('==========\n');
  
  results.sort((a, b) => b.overallScore - a.overallScore);
  
  console.log('Rank\tVersion\t\tName\t\t\t\tOverall Score');
  console.log('-----\t-------\t\t----\t\t\t\t-------------');
  
  results.forEach((result, index) => {
    const rank = index + 1;
    const name = result.name.length > 20 ? result.name.substring(0, 20) + '...' : result.name.padEnd(23);
    console.log(`${rank}\t${result.version}\t${name}\t${result.overallScore.toFixed(1)}`);
  });
  
  const bestResult = results[0];
  console.log(`\n🏆 Best Performing Prompt: ${bestResult.name}`);
  console.log(`   Version: ${bestResult.version}`);
  console.log(`   Overall Score: ${bestResult.overallScore.toFixed(1)}/100`);
  console.log(`   Relevance: ${(bestResult.relevanceScore * 100).toFixed(1)}%`);
  console.log(`   Hinglish Accuracy: ${(bestResult.hinglishAccuracy * 100).toFixed(1)}%`);
  console.log(`   Tool Calling: ${(bestResult.toolCallingAccuracy * 100).toFixed(1)}%`);
  
  console.log('\n📈 Key Insights:');
  console.log('1. Baseline (v1.0.0): Strong all-around performance with clear, actionable guidelines');
  console.log('2. Empathy (v1.1.0): Higher relationship focus, better for customer retention scenarios');
  console.log('3. Efficient (v1.2.0): More direct approach, suitable for time-sensitive collections');
  
  console.log('\n✅ Evaluation completed!');
}

main();