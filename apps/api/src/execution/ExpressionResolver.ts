/**
 * Expression Resolver
 *
 * Desteklenen sözdizimi:
 *   {{ $prev }}                          → önceki node'un tüm çıktısı
 *   {{ $prev.website }}                  → önceki node çıktısından alan
 *   {{ $prev.businesses.0.website }}     → dizi erişimi (index ile)
 *   {{ input }}                          → trigger'ın inputData'sı
 *   {{ input.formData.email }}           → inputData'dan alan
 *   {{ $node["Google Places"].website }} → belirli bir node'un çıktısından alan
 *   {{ $node["Ara ve Detayları Getir"].businesses.0.phone }}
 */

export interface ResolverContext {
  inputData: unknown;
  nodeOutputs: Map<string, { data: unknown }>;          // rfId → output
  nodeOutputsByLabel: Map<string, { data: unknown }>;   // label → output
  previousOutput: unknown;
}

function getNestedValue(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split(".").reduce((acc: any, key: string) => {
    if (acc === undefined || acc === null) return undefined;
    // Dizi index erişimi
    const index = parseInt(key, 10);
    if (!isNaN(index) && Array.isArray(acc)) return acc[index];
    return acc[key];
  }, obj);
}

function resolveExpression(expr: string, ctx: ResolverContext): unknown {
  const trimmed = expr.trim();

  // {{ $node["Label"].path }}
  const nodeMatch = trimmed.match(/^\$node\["([^"]+)"\](?:\.(.+))?$/);
  if (nodeMatch) {
    const label = nodeMatch[1];
    const path = nodeMatch[2] ?? "";
    const nodeOutput = ctx.nodeOutputsByLabel.get(label);
    if (!nodeOutput) return undefined;
    return getNestedValue(nodeOutput.data, path);
  }

  // {{ $prev.path }} veya {{ $prev }}
  if (trimmed.startsWith("$prev")) {
    const path = trimmed.slice(5).replace(/^\./, "");
    return getNestedValue(ctx.previousOutput, path);
  }

  // {{ input.path }} veya {{ input }}
  if (trimmed.startsWith("input")) {
    const path = trimmed.slice(5).replace(/^\./, "");
    return getNestedValue(ctx.inputData, path);
  }

  return undefined;
}

/**
 * Bir string değer içindeki {{ ... }} ifadelerini çözümler.
 * Tüm değer tek bir expression ise (örn: "{{ $prev }}") ham değer döner.
 * Karışık string ise (örn: "Merhaba {{ $prev.name }}") string interpolasyon yapar.
 */
export function resolveValue(value: unknown, ctx: ResolverContext): unknown {
  if (typeof value !== "string") return value;

  // Tek expression: {{ ... }} → ham değer döndür
  const singleExpr = value.match(/^\{\{\s*(.+?)\s*\}\}$/);
  if (singleExpr) {
    const resolved = resolveExpression(singleExpr[1], ctx);
    return resolved !== undefined ? resolved : value;
  }

  // Karışık string: birden fazla {{ }} veya metin+expression
  const hasExpr = /\{\{.+?\}\}/.test(value);
  if (!hasExpr) return value;

  return value.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
    const resolved = resolveExpression(expr, ctx);
    if (resolved === undefined) return _;
    if (typeof resolved === "object") return JSON.stringify(resolved);
    return String(resolved);
  });
}

/**
 * Bir parameters objesinin tüm değerlerini recursive olarak resolve eder.
 */
export function resolveParameters(
  parameters: Record<string, unknown>,
  ctx: ResolverContext
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(parameters)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      resolved[key] = resolveParameters(value as Record<string, unknown>, ctx);
    } else if (Array.isArray(value)) {
      resolved[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? resolveParameters(item as Record<string, unknown>, ctx)
          : resolveValue(item, ctx)
      );
    } else {
      resolved[key] = resolveValue(value, ctx);
    }
  }

  return resolved;
}
