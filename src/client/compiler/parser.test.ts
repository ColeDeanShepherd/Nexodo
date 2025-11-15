import { test, expect } from "bun:test";
import { Lexer } from './lexer';
import { RecursiveDescentParser, ParseNodeType } from "./parser";
import { createReplGrammar } from "./grammar";

test("Parser should parse empty object using object rule", () => {
  const lexer = new Lexer();
  const tokens = lexer.tokenize('{}');
  const grammar = createReplGrammar();
  const parser = new RecursiveDescentParser(tokens, grammar, 'object');
  
  const parseTree = parser.parseRule('object');
  
  expect(parseTree).not.toBeNull();
  expect(parseTree!.type).toBe(ParseNodeType.Object);
  expect(parseTree!.children).toHaveLength(3); // {, properties_container, }
  
  // Check that the middle child is the properties container (should be empty)
  const propertiesContainer = parseTree!.children[1];
  expect(propertiesContainer.type).toBe(ParseNodeType.Token);
  expect(propertiesContainer.children).toHaveLength(0); // No properties in empty object
});

test("Parser should parse assignment with empty object", () => {
  const lexer = new Lexer();
  const tokens = lexer.tokenize('mom: {}');
  const grammar = createReplGrammar();
  const parser = new RecursiveDescentParser(tokens, grammar, 'expression');
  
  const parseTree = parser.parseRule('expression');
  
  expect(parseTree).not.toBeNull();
  expect(parseTree!.type).toBe(ParseNodeType.Assignment);
  
  // With Pratt parser: Assignment has 2 children (target, value) and operator is in the token
  expect(parseTree!.children).toHaveLength(2);
  expect(parseTree!.token?.value).toBe(':');
  
  // First child should be the identifier 'mom'
  const target = parseTree!.children[0];
  expect(target.type).toBe(ParseNodeType.Identifier);
  expect(target.token?.value).toBe('mom');
  
  // Second child should be the empty object
  const value = parseTree!.children[1];
  expect(value.type).toBe(ParseNodeType.Object);
});

test("Parser should parse Math.abs member access", () => {
  const lexer = new Lexer();
  const tokens = lexer.tokenize('Math.abs');
  const grammar = createReplGrammar();
  const parser = new RecursiveDescentParser(tokens, grammar, 'expression');
  
  const parseTree = parser.parseRule('expression');
  
  expect(parseTree).not.toBeNull();
  expect(parseTree!.type).toBe(ParseNodeType.MemberAccess);
  expect(parseTree!.token?.value).toBe('.');
  
  // Member access should have 2 children: Math and abs
  expect(parseTree!.children).toHaveLength(2);
  const objectExpr = parseTree!.children[0];
  const propertyExpr = parseTree!.children[1];
  expect(objectExpr.type).toBe(ParseNodeType.Identifier);
  expect(objectExpr.token?.value).toBe('Math');
  expect(propertyExpr.type).toBe(ParseNodeType.Identifier);
  expect(propertyExpr.token?.value).toBe('abs');
});

test("Parser should parse Math.abs(1)", () => {
  const lexer = new Lexer();
  const tokens = lexer.tokenize('Math.abs(1)');
  const grammar = createReplGrammar();
  const parser = new RecursiveDescentParser(tokens, grammar, 'expression');
  
  const parseTree = parser.parseRule('expression');
  
  expect(parseTree).not.toBeNull();
  expect(parseTree!.type).toBe(ParseNodeType.FunctionCall);
  
  // Function call should have 2 children: function expression and arguments
  expect(parseTree!.children).toHaveLength(2);
  
  // First child should be the member access (Math.abs)
  const functionExpr = parseTree!.children[0];
  expect(functionExpr.type).toBe(ParseNodeType.MemberAccess);
  expect(functionExpr.token?.value).toBe('.');
  
  // Member access should have 2 children: Math and abs
  expect(functionExpr.children).toHaveLength(2);
  const objectExpr = functionExpr.children[0];
  const propertyExpr = functionExpr.children[1];
  expect(objectExpr.type).toBe(ParseNodeType.Identifier);
  expect(objectExpr.token?.value).toBe('Math');
  expect(propertyExpr.type).toBe(ParseNodeType.Identifier);
  expect(propertyExpr.token?.value).toBe('abs');
  
  // Second child should be the arguments array with one element
  const args = parseTree!.children[1];
  expect(args.type).toBe(ParseNodeType.Array);
  expect(args.children).toHaveLength(1);
  
  // The argument should be the number 1
  const arg = args.children[0];
  expect(arg.type).toBe(ParseNodeType.Literal);
  expect(arg.token?.value).toBe('1');
});

test("Parser should parse array with object [{}]", () => {
  const lexer = new Lexer();
  const tokens = lexer.tokenize('[{}]');
  const grammar = createReplGrammar();
  const parser = new RecursiveDescentParser(tokens, grammar, 'expression');
  
  const parseTree = parser.parseRule('expression');
  
  expect(parseTree).not.toBeNull();
  expect(parseTree!.type).toBe(ParseNodeType.Array);
  
  // Array should have 3 children: [, elements_container, ]
  expect(parseTree!.children).toHaveLength(3);
  
  // Check brackets
  expect(parseTree!.children[0].type).toBe(ParseNodeType.Token);
  expect(parseTree!.children[0].token?.value).toBe('[');
  expect(parseTree!.children[2].type).toBe(ParseNodeType.Token);
  expect(parseTree!.children[2].token?.value).toBe(']');
  
  // Check elements container (middle child)
  const elementsContainer = parseTree!.children[1];
  expect(elementsContainer.type).toBe(ParseNodeType.Token);
  expect(elementsContainer.children).toHaveLength(1);
  
  // Check the object element
  const objectElement = elementsContainer.children[0];
  expect(objectElement.type).toBe(ParseNodeType.Object);
});

test("AST builder should handle array with object [{}]", () => {
  const lexer = new Lexer();
  const tokens = lexer.tokenize('[{}]');
  const grammar = createReplGrammar();
  const parser = new RecursiveDescentParser(tokens, grammar, 'expression');
  
  const parseTree = parser.parseRule('expression');
  expect(parseTree).not.toBeNull();
  
  // This should not throw "Unsupported parse node type: Token"
  const { buildAST } = require('./ast');
  const ast = buildAST(parseTree!);
  
  expect(ast.nodeType).toBe('ArrayLiteral');
});