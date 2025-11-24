import { test, expect } from "bun:test";
import { Interpreter, RuntimeError } from './interpreter';
import { RecursiveDescentParser } from './parser';
import { Lexer } from './lexer';
import { createReplGrammar } from './grammar';
import { ASTBuilder } from './ast';

function interpret(code: string) {
  const lexer = new Lexer();
  const tokens = lexer.tokenize(code);
  const grammar = createReplGrammar();
  const parser = new RecursiveDescentParser(tokens, grammar, 'program');
  const parseTree = parser.parseRule('program');
  
  if (!parseTree) {
    throw new Error('Failed to parse code');
  }
  
  const astBuilder = new ASTBuilder();
  const ast = astBuilder.build(parseTree);
  const interpreter = new Interpreter();
  return interpreter.interpret(ast);
}

test('should allow assignment to object property in constant expression', () => {
  const code = `
    test: { a: 1, b: 2 }
    test.a: 3
    test
  `;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(0);
  expect(result.value).toEqual({ a: 3, b: 2 });
});

test('should allow assignment to new property in object literal', () => {
  const code = `
    test: { a: 1 }
    test.b: 2
    test
  `;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(0);
  expect(result.value).toEqual({ a: 1, b: 2 });
});

test('should allow assignment when object property is a variable', () => {
  const code = `
    x: 5
    test: { a: x, b: 2 }
    test.a: 10
    test
  `;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(0);
  expect(result.value).toEqual({ a: 10, b: 2 });
});

test('should disallow assignment when root is bound to non-constant expression', () => {
  const code = `
    z: { a: 1 }
    test: z
    test.a: 3
  `;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].message).toContain('not bound to a constant expression');
});

test('should re-evaluate dependent bindings after assignment', () => {
  const code = `
    test: { a: 1, b: 2 }
    sum: test.a
    test.a: 5
    sum
  `;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(0);
  expect(result.value).toBe(5);
});

test('should work with nested object properties', () => {
  const code = `
    test: { a: { x: 1, y: 2 }, b: 3 }
    test.a.x: 10
    test
  `;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(0);
  expect(result.value).toEqual({ a: { x: 10, y: 2 }, b: 3 });
});

test('should disallow assignment to nested property when parent is variable', () => {
  const code = `
    inner: { x: 1 }
    test: { a: inner }
    test.a.x: 10
  `;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].message).toContain('not a constant object literal');
});

test('replaceSubExprInLiteral - should replace object property', () => {
  const code = `test: { a: 1, b: 2 }`;
  const result = interpret(code);
  
  const interpreter = new Interpreter();
  const lexer = new Lexer();
  const grammar = createReplGrammar();
  
  // Set up the initial binding
  const tokens1 = lexer.tokenize(code);
  const parser1 = new RecursiveDescentParser(tokens1, grammar, 'expression');
  const parseTree1 = parser1.parseRule('expression');
  const astBuilder = new ASTBuilder();
  const ast1 = astBuilder.build(parseTree1!);
  interpreter.interpret(ast1);
  
  // Create the path expression (test.a)
  const tokens2 = lexer.tokenize('test.a');
  const parser2 = new RecursiveDescentParser(tokens2, grammar, 'expression');
  const pathExpr = astBuilder.build(parser2.parseRule('expression')!);
  
  // Create the new value expression (99)
  const tokens3 = lexer.tokenize('99');
  const parser3 = new RecursiveDescentParser(tokens3, grammar, 'expression');
  const newExpr = astBuilder.build(parser3.parseRule('expression')!);
  
  // Call the private method via reflection
  (interpreter as any).replaceSubExprInLiteral(pathExpr, newExpr);
  
  // Verify the result
  const testValue = interpreter.getEnvironment().get('test');
  expect(testValue).toEqual({ a: 99, b: 2 });
});

test('replaceSubExprInLiteral - should replace array element', () => {
  const code = `test: [1, 2, 3]`;
  
  const interpreter = new Interpreter();
  const lexer = new Lexer();
  const grammar = createReplGrammar();
  const astBuilder = new ASTBuilder();
  
  // Set up the initial binding
  const tokens1 = lexer.tokenize(code);
  const parser1 = new RecursiveDescentParser(tokens1, grammar, 'expression');
  const parseTree1 = parser1.parseRule('expression');
  const ast1 = astBuilder.build(parseTree1!);
  interpreter.interpret(ast1);
  
  // Create the path expression (test[1])
  const tokens2 = lexer.tokenize('test[1]');
  const parser2 = new RecursiveDescentParser(tokens2, grammar, 'expression');
  const pathExpr = astBuilder.build(parser2.parseRule('expression')!);
  
  // Create the new value expression (99)
  const tokens3 = lexer.tokenize('99');
  const parser3 = new RecursiveDescentParser(tokens3, grammar, 'expression');
  const newExpr = astBuilder.build(parser3.parseRule('expression')!);
  
  // Call the private method
  (interpreter as any).replaceSubExprInLiteral(pathExpr, newExpr);
  
  // Verify the result
  const testValue = interpreter.getEnvironment().get('test');
  expect(testValue).toEqual([1, 99, 3]);
});

test('replaceSubExprInLiteral - should replace nested path test[0].a', () => {
  const code = `test: [{ a: "hi", b: "world" }]`;
  
  const interpreter = new Interpreter();
  const lexer = new Lexer();
  const grammar = createReplGrammar();
  const astBuilder = new ASTBuilder();
  
  // Set up the initial binding
  const tokens1 = lexer.tokenize(code);
  const parser1 = new RecursiveDescentParser(tokens1, grammar, 'expression');
  const parseTree1 = parser1.parseRule('expression');
  const ast1 = astBuilder.build(parseTree1!);
  interpreter.interpret(ast1);
  
  // Create the path expression (test[0].a)
  const tokens2 = lexer.tokenize('test[0].a');
  const parser2 = new RecursiveDescentParser(tokens2, grammar, 'expression');
  const pathExpr = astBuilder.build(parser2.parseRule('expression')!);
  
  // Create the new value expression (3)
  const tokens3 = lexer.tokenize('3');
  const parser3 = new RecursiveDescentParser(tokens3, grammar, 'expression');
  const newExpr = astBuilder.build(parser3.parseRule('expression')!);
  
  // Call the private method
  (interpreter as any).replaceSubExprInLiteral(pathExpr, newExpr);
  
  // Verify the result
  const testValue = interpreter.getEnvironment().get('test');
  expect(testValue).toEqual([{ a: 3, b: "world" }]);
});

test('replaceSubExprInLiteral - should throw error for non-literal path', () => {
  const code = `
    z: { a: 1 }
    test: z
  `;
  
  const interpreter = new Interpreter();
  const lexer = new Lexer();
  const grammar = createReplGrammar();
  const astBuilder = new ASTBuilder();
  
  // Set up the initial bindings
  const tokens1 = lexer.tokenize(code);
  const parser1 = new RecursiveDescentParser(tokens1, grammar, 'expression');
  let parseTree = parser1.parseRule('expression');
  
  // Parse both assignments manually
  const tokens2 = lexer.tokenize('z: { a: 1 }');
  const parser2 = new RecursiveDescentParser(tokens2, grammar, 'expression');
  const ast1 = astBuilder.build(parser2.parseRule('expression')!);
  interpreter.interpret(ast1);
  
  const tokens3 = lexer.tokenize('test: z');
  const parser3 = new RecursiveDescentParser(tokens3, grammar, 'expression');
  const ast2 = astBuilder.build(parser3.parseRule('expression')!);
  interpreter.interpret(ast2);
  
  // Create the path expression (test.a)
  const tokens4 = lexer.tokenize('test.a');
  const parser4 = new RecursiveDescentParser(tokens4, grammar, 'expression');
  const pathExpr = astBuilder.build(parser4.parseRule('expression')!);
  
  // Create the new value expression (99)
  const tokens5 = lexer.tokenize('99');
  const parser5 = new RecursiveDescentParser(tokens5, grammar, 'expression');
  const newExpr = astBuilder.build(parser5.parseRule('expression')!);
  
  // Should throw an error
  expect(() => {
    (interpreter as any).replaceSubExprInLiteral(pathExpr, newExpr);
  }).toThrow('not a constant object literal');
});

// Lambda and map function tests
test('should parse and evaluate a simple lambda expression', () => {
  const code = `fn (x: number) -> x`;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(0);
  expect(result.value.nodeType).toBe('Function');
});

test('should call a lambda function with map', () => {
  const code = `map(fn (x: number) -> x + 1, [1, 2, 3])`;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(0);
  expect(result.value.nodeType).toBe('ArrayLiteral');
  const arr = result.value as any;
  expect(arr.elements).toHaveLength(3);
  expect(arr.elements[0].value).toBe(2);
  expect(arr.elements[1].value).toBe(3);
  expect(arr.elements[2].value).toBe(4);
});

test('should use map to double numbers', () => {
  const code = `map(fn (n: number) -> n * 2, [5, 10, 15])`;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(0);
  const arr = result.value as any;
  expect(arr.elements[0].value).toBe(10);
  expect(arr.elements[1].value).toBe(20);
  expect(arr.elements[2].value).toBe(30);
});

test('should use map to transform strings', () => {
  const code = `
    nums: [1, 2, 3]
    map(fn (x: number) -> x * x, nums)
  `;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(0);
  const arr = result.value as any;
  expect(arr.elements[0].value).toBe(1);
  expect(arr.elements[1].value).toBe(4);
  expect(arr.elements[2].value).toBe(9);
});

test('should handle lambda with multiple parameters', () => {
  // First we need to create a function that can use a 2-param lambda
  // For now, test with a simple lambda
  const code = `fn (x: number, y: number) -> x + y`;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(0);
  expect(result.value.nodeType).toBe('Function');
});

test('should handle empty array with map', () => {
  const code = `map(fn (x: number) -> x + 1, [])`;
  
  const result = interpret(code);
  expect(result.errors).toHaveLength(0);
  const arr = result.value as any;
  expect(arr.elements).toHaveLength(0);
});


