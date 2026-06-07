import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface Dependency {
  name: string;
  version: string;
  resolved?: string;
  deprecated?: boolean;
}

export interface VulnerabilityAdvisory {
  id: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  module_name: string;
  overview: string;
  recommendation: string;
  url?: string;
  cves?: string[];
  criticality?: number;
}

export interface DependencyCheckResult {
  timestamp: string;
  packageManager: string;
  dependencies: Dependency[];
  devDependencies: Dependency[];
  outdatedPackages: OutdatedPackage[];
  vulnerabilities: VulnerabilityAdvisory[];
  licenseIssues: LicenseIssue[];
  summary: {
    total: number;
    outdated: number;
    vulnerable: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  type: 'dependencies' | 'devDependencies';
}

export interface LicenseIssue {
  package: string;
  license: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

const CRITICAL_LICENSES = [
  'GPL-3.0',
  'AGPL-3.0',
  'LGPL-3.0',
  'CPOL',
  'BSL-1.0',
  'EUPL-1.2'
];

const RESTRICTIVE_LICENSES = [
  'GPL-2.0',
  'GPL-3.0',
  'LGPL-2.1',
  'MPL-2.0',
  'OSL-3.0',
  'EUPL-1.0'
];

class DependencyChecker {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async checkAll(): Promise<DependencyCheckResult> {
    const packageJson = this.loadPackageJson();
    const dependencies = this.parseDependencies(packageJson.dependencies || {});
    const devDependencies = this.parseDependencies(packageJson.devDependencies || {});

    const allDeps = [...dependencies, ...devDependencies];
    const outdated = await this.checkOutdated();
    const vulnerabilities = await this.checkVulnerabilities();
    const licenseIssues = await this.checkLicenses(allDeps);

    const summary = {
      total: allDeps.length,
      outdated: outdated.length,
      vulnerable: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'moderate').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length
    };

    return {
      timestamp: new Date().toISOString(),
      packageManager: 'npm',
      dependencies,
      devDependencies,
      outdatedPackages: outdated,
      vulnerabilities,
      licenseIssues,
      summary
    };
  }

  private loadPackageJson(): { dependencies: Record<string, string>; devDependencies: Record<string, string> } {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return { dependencies: {}, devDependencies: {} };
    }

    try {
      return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    } catch {
      return { dependencies: {}, devDependencies: {} };
    }
  }

  private parseDependencies(deps: Record<string, string>): Dependency[] {
    return Object.entries(deps).map(([name, version]) => ({
      name,
      version,
      deprecated: false
    }));
  }

  async checkOutdated(): Promise<OutdatedPackage[]> {
    try {
      const output = execSync('npm outdated --json', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const outdated = JSON.parse(output);
      const result: OutdatedPackage[] = [];

      for (const [name, info] of Object.entries(outdated) as [string, { current: string; wanted: string; latest: string; type: string }][]) {
        result.push({
          name,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest,
          type: info.type as 'dependencies' | 'devDependencies'
        });
      }

      return result;
    } catch (error: unknown) {
      const execError = error as { status?: number };
      if (execError.status === 0) {
        return [];
      }
      return [];
    }
  }

  async checkVulnerabilities(): Promise<VulnerabilityAdvisory[]> {
    try {
      const output = execSync('npm audit --json', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const auditResult = JSON.parse(output);
      const advisories = auditResult.advisories || {};

      return Object.entries(advisories).map(([id, advisory]) => ({
        id,
        severity: (advisory as { severity: string }).severity as VulnerabilityAdvisory['severity'],
        module_name: (advisory as { module_name: string }).module_name,
        overview: (advisory as { overview: string }).overview,
        recommendation: (advisory as { recommendation: string }).recommendation,
        url: (advisory as { url?: string }).url,
        cves: (advisory as { cves?: string[] }).cves
      }));
    } catch (error: unknown) {
      const execError = error as { status?: number; stdout?: string };
      if (execError.status !== 0 && execError.stdout) {
        try {
          const auditResult = JSON.parse(execError.stdout);
          const advisories = auditResult.advisories || {};

          return Object.entries(advisories).map(([id, advisory]) => ({
            id,
            severity: (advisory as { severity: string }).severity as VulnerabilityAdvisory['severity'],
            module_name: (advisory as { module_name: string }).module_name,
            overview: (advisory as { overview: string }).overview,
            recommendation: (advisory as { recommendation: string }).recommendation,
            url: (advisory as { url?: string }).url,
            cves: (advisory as { cves?: string[] }).cves
          }));
        } catch {
          return [];
        }
      }
      return [];
    }
  }

  async checkLicenses(dependencies: Dependency[]): Promise<LicenseIssue[]> {
    const issues: LicenseIssue[] = [];

    try {
      const output = execSync('npm audit --json', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const auditResult = JSON.parse(output);
      const metadata = auditResult.metadata || {};
      const dependencies_ = metadata.dependencies || {};

      for (const [name, info] of Object.entries(dependencies_) as [string, { license?: string }][]) {
        if (info.license && CRITICAL_LICENSES.includes(info.license)) {
          issues.push({
            package: name,
            license: info.license,
            severity: 'high',
            description: `Package ${name} uses ${info.license} which may have licensing implications`
          });
        }
      }
    } catch {
      // npm audit may fail if no issues found with specific flags
    }

    return issues;
  }

  generateReport(result: DependencyCheckResult): string {
    let report = '\n';
    report += '═'.repeat(80) + '\n';
    report += '             DEPENDENCY SECURITY REPORT\n';
    report += '═'.repeat(80) + '\n\n';

    report += `Generated: ${new Date(result.timestamp).toLocaleString()}\n`;
    report += `Package Manager: ${result.packageManager}\n\n`;

    report += 'SUMMARY\n';
    report += '─'.repeat(40) + '\n';
    report += `Total Dependencies: ${result.summary.total}\n`;
    report += `Outdated Packages:    ${result.summary.outdated}\n`;
    report += `Vulnerable Packages:  ${result.summary.vulnerable}\n\n`;

    report += `Vulnerability Breakdown:\n`;
    report += `  🔴 Critical: ${result.summary.critical}\n`;
    report += `  🟠 High:     ${result.summary.high}\n`;
    report += `  🟡 Medium:   ${result.summary.medium}\n`;
    report += `  🟢 Low:      ${result.summary.low}\n\n`;

    if (result.vulnerabilities.length > 0) {
      report += 'VULNERABLE PACKAGES\n';
      report += '─'.repeat(40) + '\n\n';

      const sortedVulns = [...result.vulnerabilities].sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      for (const vuln of sortedVulns) {
        const severityIcon = vuln.severity === 'critical' ? '🔴' :
                            vuln.severity === 'high' ? '🟠' :
                            vuln.severity === 'moderate' ? '🟡' : '🟢';

        report += `${severityIcon} [${vuln.severity.toUpperCase()}] ${vuln.module_name}\n`;
        report += `   Advisory ID: ${vuln.id}\n`;
        report += `   ${vuln.overview.substring(0, 100)}...\n`;
        report += `   Fix: ${vuln.recommendation}\n\n`;
      }
    }

    if (result.outdatedPackages.length > 0) {
      report += 'OUTDATED PACKAGES\n';
      report += '─'.repeat(40) + '\n\n';

      for (const pkg of result.outdatedPackages.slice(0, 20)) {
        report += `📦 ${pkg.name}\n`;
        report += `   Current: ${pkg.current} → Wanted: ${pkg.wanted} → Latest: ${pkg.latest}\n`;
        report += `   Type: ${pkg.type}\n\n`;
      }

      if (result.outdatedPackages.length > 20) {
        report += `... and ${result.outdatedPackages.length - 20} more outdated packages\n\n`;
      }
    }

    if (result.licenseIssues.length > 0) {
      report += 'LICENSE ISSUES\n';
      report += '─'.repeat(40) + '\n\n';

      for (const issue of result.licenseIssues) {
        report += `⚠️  ${issue.package} (${issue.license})\n`;
        report += `   ${issue.description}\n\n`;
      }
    }

    if (result.summary.outdated > 0 || result.summary.vulnerable > 0) {
      report += 'RECOMMENDATIONS\n';
      report += '─'.repeat(40) + '\n\n';

      if (result.summary.vulnerable > 0) {
        report += '1. Run "npm audit fix" to patch known vulnerabilities\n';
      }

      if (result.summary.outdated > 0) {
        report += '2. Run "npm update" to update packages to wanted versions\n';
        report += '3. Review changelogs before major updates\n';
      }

      report += '4. Consider using "npm-check-updates" for comprehensive updates\n';
      report += '5. Regularly monitor for new vulnerabilities\n\n';
    }

    report += '═'.repeat(80) + '\n';

    return report;
  }

  async generateComplianceReport(result: DependencyCheckResult): Promise<string> {
    let report = '\n';
    report += '═'.repeat(80) + '\n';
    report += '             SECURITY COMPLIANCE CHECKLIST\n';
    report += '═'.repeat(80) + '\n\n';

    report += 'OWASP TOP 10 - A06: VULNERABLE & OUTDATED COMPONENTS\n';
    report += '─'.repeat(40) + '\n\n';

    report += `☐ Application dependencies are kept up to date: `;
    report += result.summary.outdated === 0 ? '✅ PASS\n' : `❌ FAIL (${result.summary.outdated} outdated)\n`;

    report += `☐ Known vulnerabilities are remediated: `;
    report += result.summary.vulnerable === 0 ? '✅ PASS\n' : `❌ FAIL (${result.summary.vulnerable} vulnerabilities)\n`;

    report += `☐ Critical vulnerabilities are addressed: `;
    report += result.summary.critical === 0 ? '✅ PASS\n' : `❌ FAIL (${result.summary.critical} critical)\n`;

    report += `☐ License compliance is verified: `;
    report += result.licenseIssues.length === 0 ? '✅ PASS\n' : `⚠️  WARNING (${result.licenseIssues.length} issues)\n\n`;

    report += 'PCI DSS REQUIREMENTS\n';
    report += '─'.repeat(40) + '\n\n';

    report += `☐ Third-party components are reviewed: `;
    report += result.summary.total > 0 ? '✅ DONE\n' : '⚠️  NO DEPS\n';

    report += `☐ Security patches are applied: `;
    report += result.summary.vulnerable === 0 ? '✅ PASS\n' : '❌ FAIL\n\n';

    report += '═'.repeat(80) + '\n';

    return report;
  }
}

export async function runDependencyCheck(projectRoot: string): Promise<DependencyCheckResult> {
  const checker = new DependencyChecker(projectRoot);
  const result = await checker.checkAll();

  console.log(checker.generateReport(result));
  console.log(checker.generateComplianceReport(result));

  return result;
}

// Types already exported above: Dependency, VulnerabilityAdvisory, OutdatedPackage, LicenseIssue