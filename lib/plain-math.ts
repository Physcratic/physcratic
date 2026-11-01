import { parse, symbolicEqual, type MathNode } from "mathjs";

const functions = new Set(["sqrt", "sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "exp", "log", "abs"]);
const operators = new Set(["add", "subtract", "multiply", "divide", "pow", "unaryMinus", "unaryPlus"]);
const nodeTypes = new Set(["OperatorNode", "SymbolNode", "ConstantNode", "ParenthesisNode", "FunctionNode"]);
const constants = new Set(["pi", "e"]);
const greek: Record<string, string> = { "θ": "theta", "φ": "phi", "π": "pi", "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon", "λ": "lambda", "μ": "mu", "ρ": "rho", "σ": "sigma", "τ": "tau", "ω": "omega", "Δ": "Delta", "Ω": "Omega" };
const fractions: Record<string, string> = { "½": "(1/2)", "¼": "(1/4)", "¾": "(3/4)", "⅓": "(1/3)", "⅔": "(2/3)", "⅛": "(1/8)" };
const superscripts: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };

export function normalizePlainMath(input: string) {
  if (input.length > 350) throw new Error("Use one equation of up to 350 characters. Put explanations in your working.");
  const normalized = input.trim().replace(/[θφπαβγδελμρστωΔΩ]/g, (value) => greek[value])
    .replace(/[½¼¾⅓⅔⅛]/g, (value) => fractions[value])
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (value) => `^(${[...value].map((character) => superscripts[character]).join("")})`)
    .replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/\*\*/g, "^")
    .replace(/√\s*\(/g, "sqrt(").replace(/\bln\s*\(/g, "log(");
  const parts = normalized.split("=");
  if (parts.length > 2 || (parts.length === 2 && !/^[A-Za-z][A-Za-z0-9_]*$/.test(parts[0].trim()))) throw new Error("Use an expression or a single result such as a = g*sin(theta). Other assignments and code are not supported.");
  const expression = parts.at(-1)!.trim();
  if (!expression || !/^[a-zA-Z0-9_+*/^().\s-]+$/.test(expression)) throw new Error("Use calculator notation: + - * / ^, parentheses and named functions. Write units separately.");
  return { expression, symbol: parts.length === 2 ? parts[0].trim() : null };
}

export function parsePlainMath(input: string, allowedVariables?: readonly string[]) {
  const normalized = normalizePlainMath(input);
  const tree = parse(normalized.expression);
  const variables = new Set<string>();
  let count = 0;
  const visit = (node: MathNode, depth: number, isFunctionName = false) => {
    if (++count > 100 || depth > 14 || !nodeTypes.has(node.type)) throw new Error("Expression too complex. Commands, arrays, property access and user-defined functions are not allowed.");
    if (node.type === "SymbolNode") {
      const name = (node as MathNode & { name: string }).name;
      if (isFunctionName) return;
      if (functions.has(name)) throw new Error(`Write ${name}(...) with an argument.`);
      if (constants.has(name)) return;
      if (!/^[A-Za-z][A-Za-z0-9_]{0,24}$/.test(name) || ["constructor", "prototype", "__proto__", "import", "evaluate"].includes(name)) throw new Error("Unsupported variable name.");
      if (allowedVariables && !allowedVariables.includes(name)) throw new Error(`Unknown variable ${name}. Use ${allowedVariables.join(", ") || "constants only"}.`);
      variables.add(name);
    }
    if (node.type === "ConstantNode") {
      const value = Number((node as MathNode & { value: number }).value);
      if (!Number.isFinite(value) || Math.abs(value) > 1e12) throw new Error("Use finite constants no larger than 1e12.");
    }
    if (node.type === "FunctionNode") {
      const fn = node as MathNode & { fn: MathNode & { name?: string }; args: MathNode[] };
      if (fn.fn.type !== "SymbolNode" || !functions.has(fn.fn.name ?? "") || fn.args.length !== 1) throw new Error("Use sqrt, sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, exp, log / ln or abs with one argument.");
      visit(fn.fn, depth + 1, true);
      fn.args.forEach((child) => visit(child, depth + 1));
      return;
    }
    if (node.type === "OperatorNode") {
      const operation = node as MathNode & { fn: string; args: MathNode[] };
      if (!operators.has(operation.fn)) throw new Error("Unsupported operator.");
      if (operation.fn === "pow") {
        const exponent = operation.args[1];
        if (exponent.filter((child) => !["ConstantNode", "ParenthesisNode", "OperatorNode"].includes(child.type) || (child.type === "OperatorNode" && !["divide", "unaryMinus", "unaryPlus"].includes((child as MathNode & { fn: string }).fn))).length) throw new Error("Use a numeric exponent, such as ^2 or ^(1/2).");
        const value = exponent.evaluate();
        if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 12) throw new Error("Exponents must be between -12 and 12.");
      }
    }
    node.forEach((child) => visit(child, depth + 1));
  };
  visit(tree, 0);
  if (variables.size > 16) throw new Error("Use at most 16 variables per equation.");
  return { ...normalized, tree, variables: [...variables] };
}

export function runPlainMath(input: string, bindings = "") {
  const parsed = parsePlainMath(input);
  const scope = new Map<string, number>();
  const lines = bindings.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 16) throw new Error("Provide at most 16 variable values, one per line.");
  for (const line of lines) {
    const value = parsePlainMath(line, []);
    if (!value.symbol || !parsed.variables.includes(value.symbol)) throw new Error("Enter values only for the listed variables, for example theta = pi/6.");
    if (scope.has(value.symbol)) throw new Error(`A value for ${value.symbol} was entered twice.`);
    const number = value.tree.evaluate();
    if (typeof number !== "number" || !Number.isFinite(number)) throw new Error("Variable values must be finite real numbers.");
    scope.set(value.symbol, number);
  }
  const missing = parsed.variables.filter((name) => !scope.has(name));
  if (missing.length) return { expression: parsed.expression, symbol: parsed.symbol, variables: parsed.variables, missing, result: null, tex: parsed.tree.toTex() };
  const result: unknown = parsed.tree.evaluate(scope);
  if (typeof result !== "number" || !Number.isFinite(result)) throw new Error("This expression is not finite and real for those values. Check division by zero and function domains.");
  return { expression: parsed.expression, symbol: parsed.symbol, variables: parsed.variables, missing, result, tex: parsed.tree.toTex() };
}

export function matchesPlainMath(input: string, expected: string, variables: readonly string[]) {
  const answer = parsePlainMath(input, variables);
  const reference = parsePlainMath(expected, variables);
  if (reference.symbol && answer.symbol && reference.symbol !== answer.symbol) return false;
  return symbolicEqual(answer.tree, reference.tree);
}
