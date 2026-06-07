const http = require('http');

console.log('🧪 Testing AI Agent Health Monitoring API...\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/health/agents',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}\n`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      console.log('✅ Health API Response:');
      console.log(`  Overall Status: ${response.overallStatus}`);
      console.log(`  Total Agents: ${response.totalAgents}`);
      console.log(`  Healthy Agents: ${response.healthyAgents}`);
      console.log(`  Timestamp: ${response.timestamp}`);
      
      console.log('\n📊 Agent Details:');
      response.agents.forEach(agent => {
        console.log(`  ${agent.agentName}:`);
        console.log(`    Status: ${agent.currentStatus}`);
        console.log(`    Uptime: ${agent.uptimePercentage.toFixed(2)}%`);
        console.log(`    Avg Response Time: ${agent.avgResponseTimeMs}ms`);
        if (agent.lastErrorMessage) {
          console.log(`    Last Error: ${agent.lastErrorMessage}`);
        }
        console.log('');
      });
      
      console.log('===========================================');
      console.log('✅ AI Agent Health Monitoring System: WORKING');
      console.log('===========================================\n');
      
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ API Request failed:', error.message);
  console.log('\n⚠️  Note: Make sure the dev server is running (npm run dev)');
  console.log('   Or the API endpoint may not be accessible yet.');
});

req.end();