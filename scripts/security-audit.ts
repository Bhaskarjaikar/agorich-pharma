import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface Vulnerability {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  file: string;
  line?: number;
  description: string;
  remediation: string;
}

interface SecurityReport {
  timestamp: string;
  totalVulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  vulnerabilities: Vulnerability[];
  owaspCompliance: Record<string, { status: string; details: string }>;
}

class SecurityAuditor {
  private rootDir: string;
  private vulnerabilities: Vulnerability[] = [];
  private report: SecurityReport;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.report = {
      timestamp: new Date().toISOString(),
      totalVulnerabilities: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      vulnerabilities: [],
      owaspCompliance: {}
    };
  }

  async runFullAudit(): Promise<SecurityReport> {
    console.log('🔍 Starting Comprehensive Security Audit...\n');

    await this.checkEnvironmentExposure();
    await this.checkSQLInjection();
    await this.checkXSSVulnerabilities();
    await this.checkAuthentication();
    await this.checkAuthorization();
    await this.checkAPISecurity();
    await this.checkAISpecificSecurity();
    await this.checkDependencyVulnerabilities();
    this.checkOWASPCompliance();

    this.report.totalVulnerabilities = this.vulnerabilities.length;
    this.report.critical = this.vulnerabilities.filter(v => v.severity === 'Critical').length;
    this.report.high = this.vulnerabilities.filter(v => v.severity === 'High').length;
    this.report.medium = this.vulnerabilities.filter(v => v.severity === 'Medium').length;
    this.report.low = this.vulnerabilities.filter(v => v.severity === 'Low').length;
    this.report.vulnerabilities = this.vulnerabilities;

    return this.report;
  }

  private async checkEnvironmentExposure(): Promise<void> {
    console.log('📋 Checking Environment Variables Exposure...');

    const envPatterns = [
      /(?:password|secret|api[_-]?key|token|credential)\s*[=:]\s*['"][^'"]+['"]/gi,
      /process\.env\.[A-Z_]+/g,
      /\.env(?:\.[a-z]+)?/gi
    ];

    const dangerousPatterns = [
      /['"]sk[-_][a-zA-Z0-9]{20,}['"]/g,
      /['"]pk_[a-zA-Z0-9]{20,}['"]/g,
      /['"][a-f0-9]{32,}['"]/g
    ];

    const files = this.getAllFiles(['.ts', '.tsx', '.js', '.jsx', '.json']);

    for (const file of files) {
      if (file.includes('node_modules') || file.includes('.next')) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.rootDir, file);

      for (const pattern of dangerousPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          this.vulnerabilities.push({
            severity: 'Critical',
            category: 'Environment Exposure',
            file: relativePath,
            description: `Potential hardcoded secret detected: ${matches[0].substring(0, 20)}...`,
            remediation: 'Use environment variables instead of hardcoded secrets. Move sensitive values to .env file.'
          });
        }
      }

      if (file.includes('.env')) {
        const gitignorePath = path.join(this.rootDir, '.gitignore');
        const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';

        if (!gitignore.includes('.env') && !gitignore.includes('.env*')) {
          this.vulnerabilities.push({
            severity: 'High',
            category: 'Environment Exposure',
            file: '.gitignore',
            description: '.env file found but not excluded in .gitignore',
            remediation: 'Add ".env" or ".env*" to .gitignore to prevent accidental commits.'
          });
        }
      }
    }

    console.log(`   ✓ Checked ${files.length} files for environment exposure\n`);
  }

  private async checkSQLInjection(): Promise<void> {
    console.log('🔍 Checking SQL Injection Vulnerabilities...');

    const sqlPatterns = [
      { pattern: /\$queryRaw`.*\+/g, type: 'Template literal with concatenation' },
      { pattern: /sequelize\.query\([^)]+\+/g, type: 'Dynamic SQL with concatenation' },
      { pattern: /prisma\.\$queryRaw`.*\+\s*\w+/g, type: 'Prisma raw query with interpolation' },
      { pattern: /db\.sql`.*\+\s*\w+/g, type: 'SQL template with user input' },
      { pattern: /SELECT.*FROM.*\+\s*\w+/gi, type: 'SELECT statement with concatenation' },
      { pattern: /INSERT.*INTO.*\+\s*\w+/gi, type: 'INSERT statement with concatenation' },
      { pattern: /UPDATE.*SET.*\+\s*\w+/gi, type: 'UPDATE statement with concatenation' },
      { pattern: /DELETE.*FROM.*\+\s*\w+/gi, type: 'DELETE statement with concatenation' }
    ];

    const files = this.getAllFiles(['.ts', '.tsx', '.js', '.jsx']);

    for (const file of files) {
      if (file.includes('node_modules') || file.includes('.next')) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.rootDir, file);

      for (const { pattern, type } of sqlPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          this.vulnerabilities.push({
            severity: 'Critical',
            category: 'SQL Injection',
            file: relativePath,
            description: `Potential SQL injection: ${type}. User input may be concatenated directly into SQL query.`,
            remediation: 'Use parameterized queries or an ORM like Prisma with proper query builders. Never concatenate user input into SQL strings.'
          });
        }
      }
    }

    console.log(`   ✓ Checked ${files.length} files for SQL injection\n`);
  }

  private async checkXSSVulnerabilities(): Promise<void> {
    console.log('🔍 Checking XSS Vulnerabilities...');

    const xssPatterns = [
      { pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{/g, type: 'dangerouslySetInnerHTML with object interpolation' },
      { pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*[^}]*\+\s*/g, type: 'dangerouslySetInnerHTML with concatenation' },
      { pattern: /innerHTML\s*=\s*[^;]*\+/g, type: 'Direct innerHTML assignment with concatenation' },
      { pattern: /document\.write\(/g, type: 'document.write usage' },
      { pattern: /eval\s*\(/g, type: 'eval() usage' },
      { pattern: /\<\s*script[^\>]*\>[^\<]*innerHTML/g, type: 'Script tag with innerHTML' }
    ];

    const files = this.getAllFiles(['.tsx', '.ts', '.jsx', '.js']);

    for (const file of files) {
      if (file.includes('node_modules') || file.includes('.next')) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const relativePath = path.relative(this.rootDir, file);

      for (const { pattern, type } of xssPatterns) {
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            this.vulnerabilities.push({
              severity: 'High',
              category: 'XSS',
              file: relativePath,
              line: index + 1,
              description: `Potential XSS vulnerability: ${type}. User-controlled data may be rendered without sanitization.`,
              remediation: 'Use React\'s default escaping, sanitize user input with DOMPurify, or use textContent instead of innerHTML.'
            });
          }
        });
      }
    }

    console.log(`   ✓ Checked ${files.length} files for XSS vulnerabilities\n`);
  }

  private async checkAuthentication(): Promise<void> {
    console.log('🔍 Checking Authentication Issues...');

    const files = this.getAllFiles(['.ts', '.tsx']);

    for (const file of files) {
      if (file.includes('node_modules') || file.includes('.next')) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.rootDir, file);

      if (file.includes('/api/') && !content.includes('verifyAuth') && !content.includes('auth') && !content.includes('session')) {
        this.vulnerabilities.push({
          severity: 'Medium',
          category: 'Authentication',
          file: relativePath,
          description: 'API route may not have authentication check',
          remediation: 'Add authentication middleware to verify user session on all protected API routes.'
        });
      }

      if (content.includes('bcrypt') && !content.includes('saltRounds')) {
        this.vulnerabilities.push({
          severity: 'Medium',
          category: 'Authentication',
          file: relativePath,
          description: 'bcrypt usage without explicit salt rounds',
          remediation: 'Use bcrypt.hash(password, 12) with a minimum of 12 salt rounds.'
        });
      }

      if (content.includes('jwt.sign') && !content.includes('expiresIn')) {
        this.vulnerabilities.push({
          severity: 'Medium',
          category: 'Authentication',
          file: relativePath,
          description: 'JWT token issued without expiration',
          remediation: 'Always set token expiration: jwt.sign(payload, secret, { expiresIn: "1h" })'
        });
      }
    }

    console.log(`   ✓ Checked ${files.length} files for authentication issues\n`);
  }

  private async checkAuthorization(): Promise<void> {
    console.log('🔍 Checking Authorization Gaps...');

    const adminRoutes = this.getAllFiles(['.ts', '.tsx']).filter(f =>
      f.includes('/api/admin/') || f.includes('/admin/')
    );

    for (const file of adminRoutes) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.rootDir, file);

      if (!content.includes('role') && !content.includes('admin') && !content.includes('RETAILER') && !content.includes('DISTRIBUTOR')) {
        this.vulnerabilities.push({
          severity: 'High',
          category: 'Authorization',
          file: relativePath,
          description: 'Admin route without role-based access control',
          remediation: 'Implement role-based authorization checks to ensure only authorized users can access admin functionality.'
        });
      }
    }

    console.log(`   ✓ Checked ${adminRoutes.length} admin routes for authorization\n`);
  }

  private async checkAPISecurity(): Promise<void> {
    console.log('🔍 Checking API Security...');

    const apiFiles = this.getAllFiles(['.ts', '.tsx']).filter(f => f.includes('/api/'));

    for (const file of apiFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.rootDir, file);

      if (!content.includes('rateLimit') && !content.includes('rate-limiter') && !content.includes('RateLimiter')) {
        this.vulnerabilities.push({
          severity: 'Medium',
          category: 'API Security',
          file: relativePath,
          description: 'API endpoint may lack rate limiting',
          remediation: 'Implement rate limiting middleware to prevent brute force and abuse attacks.'
        });
      }

      if (content.includes('CORS') && content.includes('*')) {
        this.vulnerabilities.push({
          severity: 'Medium',
          category: 'API Security',
          file: relativePath,
          description: 'CORS configured with wildcard origin',
          remediation: 'Restrict CORS to specific trusted origins instead of using "*".'
        });
      }
    }

    console.log(`   ✓ Checked ${apiFiles.length} API endpoints for security\n`);
  }

  private async checkAISpecificSecurity(): Promise<void> {
    console.log('🔍 Checking AI-Specific Security...');

    const aiFiles = this.getAllFiles(['.ts', '.tsx']).filter(f =>
      f.includes('vapi') || f.includes('prompt') || f.includes('orchestrator') || f.includes('ai')
    );

    const promptInjectionPatterns = [
      /system.*prompt/gi,
      /user.*input.*concat/gi,
      /template.*literal.*user/gi
    ];

    for (const file of aiFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.rootDir, file);

      for (const pattern of promptInjectionPatterns) {
        if (pattern.test(content)) {
          this.vulnerabilities.push({
            severity: 'High',
            category: 'AI Security',
            file: relativePath,
            description: 'Potential prompt injection vulnerability - user input may be directly concatenated into system prompts',
            remediation: 'Implement strict input validation and sanitization for AI prompts. Use separate parameter passing instead of string concatenation.'
          });
        }
      }

      if (content.includes('spending') && !content.includes('limit')) {
        this.vulnerabilities.push({
          severity: 'Medium',
          category: 'AI Security',
          file: relativePath,
          description: 'AI spending controls may not have proper limits',
          remediation: 'Implement spending limits and monitoring for AI API calls.'
        });
      }
    }

    console.log(`   ✓ Checked ${aiFiles.length} AI-related files for security\n`);
  }

  private async checkDependencyVulnerabilities(): Promise<void> {
    console.log('🔍 Checking Dependency Vulnerabilities...');

    try {
      execSync('npm audit --json', { cwd: this.rootDir, encoding: 'utf-8' });
    } catch (error: unknown) {
      const execError = error as { status?: number; stdout?: string };
      if (execError.status !== 0 && execError.stdout) {
        try {
          const auditResult = JSON.parse(execError.stdout);
          const advisories = auditResult.advisories || {};

          for (const [id, advisory] of Object.entries(advisories) as [string, { severity: string; module_name: string; overview: string; recommendation: string }][]) {
            const severity = advisory.severity === 'critical' ? 'Critical' :
                           advisory.severity === 'high' ? 'High' :
                           advisory.severity === 'moderate' ? 'Medium' : 'Low';

            this.vulnerabilities.push({
              severity: severity as Vulnerability['severity'],
              category: 'Dependency Vulnerability',
              file: 'package.json',
              description: `Vulnerable dependency: ${advisory.module_name} - ${advisory.overview.substring(0, 100)}`,
              remediation: advisory.recommendation || 'Update the affected package to the latest secure version.'
            });
          }
        } catch {
          // JSON parse failed, skip dependency check
        }
      }
    }

    console.log('   ✓ Checked dependencies for known vulnerabilities\n');
  }

  private checkOWASPCompliance(): void {
    console.log('📋 Checking OWASP Top 10 Compliance...\n');

    this.report.owaspCompliance = {
      'A01 - Broken Access Control': {
        status: this.vulnerabilities.some(v => v.category === 'Authorization') ? 'FAIL' : 'PASS',
        details: this.vulnerabilities.filter(v => v.category === 'Authorization').length === 0
          ? 'No authorization gaps detected'
          : `${this.vulnerabilities.filter(v => v.category === 'Authorization').length} authorization issues found`
      },
      'A02 - Cryptographic Failures': {
        status: this.vulnerabilities.some(v => v.category === 'Environment Exposure') ? 'FAIL' : 'PASS',
        details: this.vulnerabilities.filter(v => v.category === 'Environment Exposure').length === 0
          ? 'No exposed secrets or weak crypto detected'
          : `${this.vulnerabilities.filter(v => v.category === 'Environment Exposure').length} cryptographic failures found`
      },
      'A03 - Injection': {
        status: this.vulnerabilities.some(v => v.category === 'SQL Injection' || v.category === 'XSS') ? 'FAIL' : 'PASS',
        details: this.vulnerabilities.filter(v => v.category === 'SQL Injection' || v.category === 'XSS').length === 0
          ? 'No injection vulnerabilities detected'
          : `${this.vulnerabilities.filter(v => v.category === 'SQL Injection' || v.category === 'XSS').length} injection issues found`
      },
      'A04 - Insecure Design': {
        status: this.vulnerabilities.some(v => v.category === 'Authentication') ? 'WARNING' : 'PASS',
        details: this.vulnerabilities.filter(v => v.category === 'Authentication').length === 0
          ? 'No insecure design patterns detected'
          : `${this.vulnerabilities.filter(v => v.category === 'Authentication').length} authentication issues found`
      },
      'A05 - Security Misconfiguration': {
        status: this.vulnerabilities.some(v => v.category === 'API Security') ? 'FAIL' : 'PASS',
        details: this.vulnerabilities.filter(v => v.category === 'API Security').length === 0
          ? 'No security misconfiguration detected'
          : `${this.vulnerabilities.filter(v => v.category === 'API Security').length} misconfigurations found`
      },
      'A06 - Vulnerable Components': {
        status: this.vulnerabilities.some(v => v.category === 'Dependency Vulnerability') ? 'FAIL' : 'PASS',
        details: this.vulnerabilities.filter(v => v.category === 'Dependency Vulnerability').length === 0
          ? 'No vulnerable components detected'
          : `${this.vulnerabilities.filter(v => v.category === 'Dependency Vulnerability').length} vulnerable dependencies found`
      },
      'A07 - Auth & Auth Failures': {
        status: this.vulnerabilities.some(v => v.category === 'Authentication') ? 'WARNING' : 'PASS',
        details: this.vulnerabilities.filter(v => v.category === 'Authentication').length === 0
          ? 'Authentication properly implemented'
          : `${this.vulnerabilities.filter(v => v.category === 'Authentication').length} auth issues found`
      },
      'A08 - Data Integrity': {
        status: this.vulnerabilities.some(v => v.category === 'SQL Injection') ? 'FAIL' : 'PASS',
        details: 'Checking for proper data validation and integrity controls'
      },
      'A09 - Logging & Monitoring': {
        status: 'INFO',
        details: 'Ensure proper logging and monitoring is in place for security incidents'
      },
      'A10 - SSRF': {
        status: 'INFO',
        details: 'Check for server-side request forgery vulnerabilities in file fetching operations'
      }
    };
  }

  private shouldExcludeDirectory(name: string): boolean {
    const excluded = [
      'node_modules',
      '.next',
      '.git',
      'dist',
      'build',
      '.nuxt',
      '.cache',
      'coverage',
      '__pycache__',
      'security'
    ];
    return excluded.includes(name);
  }

  private getAllFiles(extensions: string[]): string[] {
    const files: string[] = [];

    const scanDir = (dir: string) => {
      if (dir.includes('node_modules') || dir.includes('.next') || dir.includes('.git')) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (this.shouldExcludeDirectory(entry.name)) {
            continue;
          }
          scanDir(fullPath);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    scanDir(this.rootDir);
    return files;
  }

  printReport(report: SecurityReport): void {
    console.log('═'.repeat(80));
    console.log('                    SECURITY AUDIT REPORT');
    console.log('═'.repeat(80));
    console.log(`\n📅 Generated: ${new Date(report.timestamp).toLocaleString()}\n`);

    console.log('📊 VULNERABILITY SUMMARY');
    console.log('─'.repeat(40));
    console.log(`   Total Vulnerabilities: ${report.totalVulnerabilities}`);
    console.log(`   🔴 Critical: ${report.critical}`);
    console.log(`   🟠 High:     ${report.high}`);
    console.log(`   🟡 Medium:   ${report.medium}`);
    console.log(`   🟢 Low:      ${report.low}`);
    console.log('');

    if (report.vulnerabilities.length > 0) {
      console.log('📋 DETAILED FINDINGS');
      console.log('─'.repeat(40));

      const sortedVulns = [...report.vulnerabilities].sort((a, b) => {
        const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      for (const vuln of sortedVulns) {
        const severityIcon = vuln.severity === 'Critical' ? '🔴' :
                             vuln.severity === 'High' ? '🟠' :
                             vuln.severity === 'Medium' ? '🟡' : '🟢';

        console.log(`\n${severityIcon} [${vuln.severity}] ${vuln.category}`);
        console.log(`   📁 File: ${vuln.file}${vuln.line ? `:${vuln.line}` : ''}`);
        console.log(`   📝 ${vuln.description}`);
        console.log(`   🔧 Fix: ${vuln.remediation}`);
      }
    }

    console.log('\n\n📜 OWASP TOP 10 COMPLIANCE');
    console.log('─'.repeat(40));

    for (const [category, info] of Object.entries(report.owaspCompliance)) {
      const statusIcon = info.status === 'PASS' ? '✅' :
                        info.status === 'FAIL' ? '❌' :
                        info.status === 'WARNING' ? '⚠️' : 'ℹ️';
      console.log(`   ${statusIcon} ${category}`);
      console.log(`      Status: ${info.status}`);
      console.log(`      ${info.details}`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('                    END OF SECURITY REPORT');
    console.log('═'.repeat(80) + '\n');
  }
}

async function main() {
  const rootDir = process.cwd();
  const auditor = new SecurityAuditor(rootDir);

  try {
    const report = await auditor.runFullAudit();
    auditor.printReport(report);

    if (report.critical > 0) {
      console.log(`\n⚠️  WARNING: ${report.critical} CRITICAL vulnerabilities found!`);
      console.log('   Please address these immediately.\n');
      process.exit(1);
    } else if (report.high > 0) {
      console.log(`\n⚠️  CAUTION: ${report.high} HIGH severity vulnerabilities found.`);
      console.log('   These should be addressed soon.\n');
    } else {
      console.log('\n✅ No critical or high severity vulnerabilities found!\n');
    }
  } catch (error) {
    console.error('Security audit failed:', error);
    process.exit(1);
  }
}

main();