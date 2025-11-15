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