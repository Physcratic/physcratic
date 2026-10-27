import { parse, symbolicEqual, type MathNode } from "mathjs";

const allowedOperators = new Set(["add", "subtract", "multiply", "divide", "pow", "unaryMinus", "unaryPlus"]);
const allowedNodes = new Set(["OperatorNode", "SymbolNode", "ConstantNode", "ParenthesisNode", "FunctionNode"]);

function exponentValue(node: MathNode): number {
  if (node.type === "ParenthesisNode") return exponentValue((node as MathNode & { content: MathNode }).content);
  if (node.type === "ConstantNode") return Number((node as MathNode & { value: number }).value);
  const operation = node as MathNode & { fn?: string; args?: MathNode[] };
  if (operation.fn === "unaryMinus" && operation.args) return -exponentValue(operation.args[0]);
  if (operation.fn === "divide" && operation.args) return exponentValue(operation.args[0]) / exponentValue(operation.args[1]);
  throw new Error("Use a number or a simple fraction for an exponent, such as ^2 or ^(1/2).");
}

export function parseAnswer(input: string, variables: readonly string[]) {
  const value = input.trim();
  if (!value || value.length > 180) throw new Error("Enter one expression of up to 180 characters.");
  if (!/^[a-zA-Z0-9_+*/^().\s-]+$/.test(value)) throw new Error("Use plain-text operators + - * / ^ and parentheses. Enter only the right-hand expression, without units or an equals sign.");
  const tree = parse(value);
  const symbols = new Set([...variables, "sqrt", "pi"]);
  let count = 0;
  tree.traverse((node, _path, parent) => {
    count++;
    if (count > 70 || !allowedNodes.has(node.type)) throw new Error("Keep the expression short. Assignments, arrays, and other commands are not supported.");
    if (node.type === "SymbolNode" && !symbols.has((node as MathNode & { name: string }).name)) throw new Error(`Unknown symbol. Use only ${variables.join(", ")}, pi, and sqrt(). Variables are case-sensitive.`);
    if (node.type === "ConstantNode") {
      const number = Number((node as MathNode & { value: number }).value);
      if (!Number.isFinite(number) || Math.abs(number) > 1e9) throw new Error("Use finite constants no larger than 1e9.");
    }
    if (node.type === "SymbolNode" && (node as MathNode & { name: string }).name === "sqrt" && parent?.type !== "FunctionNode") throw new Error("Use sqrt(...) with an argument.");
    if (node.type === "FunctionNode") {
      const fn = node as MathNode & { fn: MathNode & { name?: string }; args: MathNode[] };
      if (fn.fn.type !== "SymbolNode" || fn.fn.name !== "sqrt" || fn.args.length !== 1) throw new Error("Only the sqrt(...) function is supported in this preview.");
    }
    if (node.type === "OperatorNode") {
      const operation = node as MathNode & { fn: string; args: MathNode[] };
      if (!allowedOperators.has(operation.fn)) throw new Error("Use + - * / ^ and sqrt().");
      if (operation.fn === "pow") {
        const exponent = exponentValue(operation.args[1]);
        if (!Number.isFinite(exponent) || Math.abs(exponent) > 6) throw new Error("Exponents must be finite and between -6 and 6.");
      }
    }
  });
  const depth = (node: MathNode): number => {
    let deepest = 0;
    node.forEach((child) => { deepest = Math.max(deepest, depth(child)); });
    return 1 + deepest;
  };
  if (depth(tree) > 14) throw new Error("Too many nested operations. Simplify the expression first.");
  return tree;
}

function normalizeExpression(tree: MathNode): MathNode {
  if (tree.type === "ParenthesisNode") return normalizeExpression((tree as MathNode & { content: MathNode }).content);
  if (tree.type === "FunctionNode") {
    const fn = tree as MathNode & { args: MathNode[] };
    return parse(`(${normalizeExpression(fn.args[0]).toString()})^(1/2)`);
  }
  const node = tree.map((child) => normalizeExpression(child));
  const operation = node as MathNode & { fn?: string; args?: MathNode[] };
  if (node.type !== "OperatorNode" || !["add", "multiply"].includes(operation.fn || "")) return node;
  const terms: MathNode[] = [];
  const collect = (term: MathNode) => {
    const nested = term as MathNode & { fn?: string; args?: MathNode[] };
    if (term.type === "OperatorNode" && nested.fn === operation.fn) nested.args?.forEach(collect);
    else terms.push(term);
  };
  operation.args?.forEach(collect);
  // Canonicalize inside radicals: symbolicEqual alone misses reordered sums under roots.
  terms.sort((a, b) => a.toString().localeCompare(b.toString(), "en"));
  return parse(terms.map((term) => `(${term.toString()})`).join(operation.fn === "add" ? "+" : "*"));
}

export function checkSymbolicAnswer(input: string, expected: string, variables: readonly string[]) {
  const answer = parseAnswer(input, variables);
  const key = parseAnswer(expected, variables);
  return symbolicEqual(normalizeExpression(answer), normalizeExpression(key));
}
