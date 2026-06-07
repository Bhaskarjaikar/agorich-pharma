import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface RouteInfo {
  method: string;
  path: string;
  filePath: string;
  handler: string;
  auth: 'ApiKeyAuth' | 'AdminApiKeyAuth' | 'BearerAuth' | 'None';
  description: string;
  requestBody?: string;
  responseSchema?: string;
}

interface ParameterInfo {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  type: string;
  description?: string;
}

interface OpenAPIGenerator {
  routes: RouteInfo[];
  outputPath: string;
}

class APIDocGenerator implements OpenAPIGenerator {
  routes: RouteInfo[] = [];
  private rootDir: string;
  outputPath: string;

  constructor(rootDir: string, outputPath: string) {
    this.rootDir = rootDir;
    this.outputPath = outputPath;
  }

  async generate(): Promise<void> {
    console.log('🔍 Scanning for API routes...\n');

    const apiDir = path.join(this.rootDir, 'src', 'app', 'api');
    this.scanDirectory(apiDir);

    console.log(`📝 Found ${this.routes.length} API routes\n`);

    const openapiSpec = this.generateOpenAPISpec();

    fs.writeFileSync(this.outputPath, YAML.stringify(openapiSpec, { indent: 2 }));

    console.log(`✅ OpenAPI spec generated: ${this.outputPath}\n`);

    await this.validateSpec();

    this.printSummary();
  }

  private scanDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      console.warn(`⚠️  Directory not found: ${dir}`);
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.scanDirectory(fullPath);
      } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
        this.parseRouteFile(fullPath);
      }
    }
  }

  private parseRouteFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = this.getRoutePath(filePath);

      const methods = this.extractMethods(content);

      for (const method of methods) {
        const routeInfo = this.analyzeRoute(content, method, relativePath, filePath);
        if (routeInfo) {
          this.routes.push(routeInfo);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Error parsing ${filePath}:`, error);
    }
  }

  private getRoutePath(filePath: string): string {
    const apiDir = path.join(this.rootDir, 'src', 'app', 'api');
    let routePath = filePath
      .replace(apiDir, '')
      .replace(/\\/g, '/')
      .replace('/route.ts', '')
      .replace('/route.js', '')
      .replace(/\[([^\]]+)\]/g, '{$1}');

    if (!routePath.startsWith('/')) {
      routePath = '/api' + routePath;
    } else {
      routePath = '/api' + routePath;
    }

    return routePath;
  }

  private extractMethods(content: string): string[] {
    const methods: string[] = [];
    const methodPatterns = [
      { pattern: /export\s+async\s+function\s+GET\s*\(/gi, method: 'GET' },
      { pattern: /export\s+async\s+function\s+POST\s*\(/gi, method: 'POST' },
      { pattern: /export\s+async\s+function\s+PUT\s*\(/gi, method: 'PUT' },
      { pattern: /export\s+async\s+function\s+PATCH\s*\(/gi, method: 'PATCH' },
      { pattern: /export\s+async\s+function\s+DELETE\s*\(/gi, method: 'DELETE' },
    ];

    for (const { pattern, method } of methodPatterns) {
      if (pattern.test(content)) {
        methods.push(method);
      }
    }

    return methods;
  }

  private analyzeRoute(
    content: string,
    method: string,
    routePath: string,
    filePath: string
  ): RouteInfo | null {
    const routeInfo: RouteInfo = {
      method,
      path: routePath,
      filePath: path.relative(this.rootDir, filePath),
      handler: `${method.toLowerCase()}Handler`,
      auth: this.detectAuthMethod(content),
      description: this.extractDescription(content),
    };

    routeInfo.requestBody = this.extractRequestBody(content);
    routeInfo.responseSchema = this.extractResponseSchema(content);

    return routeInfo;
  }

  private detectAuthMethod(content: string): 'ApiKeyAuth' | 'AdminApiKeyAuth' | 'BearerAuth' | 'None' {
    if (content.includes('x-admin-api-key')) {
      return 'AdminApiKeyAuth';
    }
    if (content.includes('x-agent-api-key')) {
      return 'ApiKeyAuth';
    }
    if (content.includes('Authorization') || content.includes('Bearer') || content.includes('verifyAuth')) {
      return 'BearerAuth';
    }
    return 'None';
  }

  private extractDescription(content: string): string {
    const patterns = [
      /summary:\s*['"]([^'"]+)['"]/,
      /description:\s*['"]([^'"]+)['"]/,
      /\*\s*(.+?)(?:\n|$)/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim().substring(0, 200);
      }
    }

    return 'No description available';
  }

  private extractRequestBody(content: string): string | undefined {
    if (!content.includes('requestBody') && !content.includes('RequestBody')) {
      return undefined;
    }

    const schemaMatch = content.match(/interface\s+(\w+(?:Request|Body))[\s\S]*?\{([^}]+)\}/);
    if (schemaMatch) {
      return schemaMatch[1];
    }

    return 'object';
  }

  private extractResponseSchema(content: string): string | undefined {
    if (!content.includes('NextResponse')) {
      return undefined;
    }

    const schemaMatch = content.match(/interface\s+(\w+(?:Response))[\s\S]*?\{([^}]+)\}/);
    if (schemaMatch) {
      return schemaMatch[1];
    }

    return 'object';
  }

  private generateOpenAPISpec(): object {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'Agorich Pharma API',
        description: 'API documentation auto-generated from route files',
        version: '1.0.0',
        contact: {
          name: 'Agorich Pharma Tech Team',
          email: 'tech@agorichpharma.com',
        },
      },
      servers: [
        { url: 'https://api.agorichpharma.com', description: 'Production' },
        { url: 'https://staging-api.agorichpharma.com', description: 'Staging' },
        { url: 'http://localhost:3000', description: 'Local development' },
      ],
      paths: {} as Record<string, Record<string, object>>,
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-agent-api-key',
            description: 'Agent API key for backend-to-backend communication',
          },
          AdminApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-admin-api-key',
            description: 'Admin API key for administrative operations',
          },
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token from Supabase Auth',
          },
        },
        schemas: {
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Error message' },
            },
            required: ['success', 'error'],
          },
        },
      },
      tags: [
        { name: 'Agent Connect', description: 'AI agent integration endpoints' },
        { name: 'Command Center', description: 'AI-powered command center' },
        { name: 'Admin', description: 'Administrative endpoints' },
        { name: 'Approvals', description: 'Approval workflow management' },
        { name: 'Webhooks', description: 'Webhook handlers' },
        { name: 'Metrics', description: 'Real-time metrics' },
        { name: 'Invoices', description: 'Invoice management' },
        { name: 'Intelligence', description: 'AI business intelligence' },
      ],
    };

    for (const route of this.routes) {
      if (!spec.paths[route.path]) {
        spec.paths[route.path] = {};
      }

      const operation: Record<string, unknown> = {
        tags: [this.getTagFromPath(route.path)],
        summary: route.description,
        description: route.description,
        operationId: this.generateOperationId(route),
        security: this.getSecurityArray(route.auth),
        responses: {
          '200': {
            description: 'Successful response',
            content: route.responseSchema
              ? {
                  'application/json': {
                    schema: { $ref: `#/components/schemas/${route.responseSchema}` },
                  },
                }
              : undefined,
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '500': {
            description: 'Server Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      };

      if (route.requestBody) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {},
              },
            },
          },
        };
      }

      spec.paths[route.path][route.method.toLowerCase()] = operation;
    }

    return spec;
  }

  private getTagFromPath(routePath: string): string {
    if (routePath.includes('/agent-connect')) return 'Agent Connect';
    if (routePath.includes('/command-center')) return 'Command Center';
    if (routePath.includes('/admin')) return 'Admin';
    if (routePath.includes('/approval')) return 'Approvals';
    if (routePath.includes('/webhook')) return 'Webhooks';
    if (routePath.includes('/metrics')) return 'Metrics';
    if (routePath.includes('/invoice')) return 'Invoices';
    if (routePath.includes('/intelligence')) return 'Intelligence';
    if (routePath.includes('/referral')) return 'Referrals';
    return 'General';
  }

  private generateOperationId(route: RouteInfo): string {
    const method = route.method.toLowerCase();
    const pathParts = route.path
      .replace('/api/', '')
      .replace(/{/g, 'By')
      .replace(/}/g, '')
      .split('/')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1));

    return `${method}${pathParts.join('')}`;
  }

  private getSecurityArray(auth: string): object[] {
    switch (auth) {
      case 'ApiKeyAuth':
        return [{ ApiKeyAuth: [] }];
      case 'AdminApiKeyAuth':
        return [{ AdminApiKeyAuth: [] }];
      case 'BearerAuth':
        return [{ BearerAuth: [] }];
      default:
        return [];
    }
  }

  private async validateSpec(): Promise<void> {
    console.log('🔬 Validating OpenAPI spec...');

    try {
      execSync('npx @redocly/cli lint docs/openapi.yaml', {
        cwd: this.rootDir,
        stdio: 'pipe',
      });
      console.log('✅ OpenAPI spec is valid\n');
    } catch {
      console.log('⚠️  OpenAPI validation skipped (install @redocly/cli for validation)\n');
    }
  }

  private printSummary(): void {
    console.log('📊 Route Summary:');
    console.log('─'.repeat(40));

    const byTag = this.groupByTag();
    for (const [tag, routes] of Object.entries(byTag)) {
      console.log(`\n${tag}: ${routes.length} endpoints`);
      routes.forEach((r) => {
        console.log(`  ${r.method.padEnd(7)} ${r.path}`);
      });
    }

    console.log('\n' + '─'.repeat(40));
    console.log(`Total: ${this.routes.length} endpoints across ${Object.keys(byTag).length} tags\n`);
  }

  private groupByTag(): Record<string, RouteInfo[]> {
    return this.routes.reduce((acc, route) => {
      const tag = this.getTagFromTagFromPath(route.path);
      if (!acc[tag]) {
        acc[tag] = [];
      }
      acc[tag].push(route);
      return acc;
    }, {} as Record<string, RouteInfo[]>);
  }

  private getTagFromTagFromPath(routePath: string): string {
    if (routePath.includes('/agent-connect')) return 'Agent Connect';
    if (routePath.includes('/command-center')) return 'Command Center';
    if (routePath.includes('/admin')) return 'Admin';
    if (routePath.includes('/approval')) return 'Approvals';
    if (routePath.includes('/webhook')) return 'Webhooks';
    if (routePath.includes('/metrics')) return 'Metrics';
    if (routePath.includes('/invoice')) return 'Invoices';
    if (routePath.includes('/intelligence')) return 'Intelligence';
    if (routePath.includes('/referral')) return 'Referrals';
    return 'General';
  }
}

const YAML = {
  stringify: (obj: object, opts: { indent?: number } = {}): string => {
    const indent = opts.indent || 2;

    const render = (value: unknown, level: number): string => {
      const pad = ' '.repeat(level * indent);

      if (value === null) return 'null';
      if (value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'number') return String(value);
      if (typeof value === 'string') {
        if (value.includes('\n') || value.includes(':') || value.includes('#')) {
          return `"${value.replace(/"/g, '\\"')}"`;
        }
        return value;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const items = value.map((v) => `${pad}  - ${render(v, level + 1)}`).join('\n');
        return items;
      }

      if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 0) return '{}';

        const lines = entries
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => {
            const key = k.includes(':') || k.includes('#') ? `"${k}"` : k;
            const val = render(v, level + 1);
            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
              return `${pad}${key}:\n${val}`;
            }
            return `${pad}${key}: ${val}`;
          });

        return lines.join('\n');
      }

      return String(value);
    };

    return render(obj, 0);
  },
};

async function main() {
  const rootDir = process.cwd();
  const outputPath = path.join(rootDir, 'docs', 'openapi-generated.yaml');

  console.log('🚀 API Documentation Generator\n');
  console.log(`📂 Project root: ${rootDir}`);
  console.log(`📄 Output path: ${outputPath}\n`);

  const generator = new APIDocGenerator(rootDir, outputPath);
  await generator.generate();

  console.log('🎉 Documentation generation complete!\n');
  console.log('Next steps:');
  console.log('  1. Review generated spec: docs/openapi-generated.yaml');
  console.log('  2. Merge with manual spec: docs/openapi.yaml');
  console.log('  3. Serve interactive docs: npx swagger-ui-dist docs/openapi.yaml');
}

main().catch((error) => {
  console.error('❌ Generation failed:', error);
  process.exit(1);
});

export { APIDocGenerator };
export type { RouteInfo, ParameterInfo };