import { test, expect } from "bun:test";
import { Lexer, TokenType } from './lexer';

test('Lexer should tokenize console.log("Hello, world!")', () => {
  const input = 'console.log("Hello, world!")';
  const lexer = new Lexer();
  const tokens = lexer.tokenize(input);

  // Expected tokens:
  // 1. IDENTIFIER: console
  // 2. DOT: .
  // 3. IDENTIFIER: log
  // 4. LPAREN: (
  // 5. STRING: "Hello, world!"
  // 6. RPAREN: )
  // 7. EOF: (end of file)

  expect(tokens).toHaveLength(7);
  
  expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
  expect(tokens[0].value).toBe('console');
  
  expect(tokens[1].type).toBe(TokenType.DOT);
  expect(tokens[1].value).toBe('.');
  
  expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
  expect(tokens[2].value).toBe('log');
  
  expect(tokens[3].type).toBe(TokenType.LPAREN);
  expect(tokens[3].value).toBe('(');
  
  expect(tokens[4].type).toBe(TokenType.STRING);
  expect(tokens[4].value).toBe('"Hello, world!"');
  
  expect(tokens[5].type).toBe(TokenType.RPAREN);
  expect(tokens[5].value).toBe(')');
  
  expect(tokens[6].type).toBe(TokenType.EOF);
});

test('Lexer should tokenize lambda expression with arrow token', () => {
  const input = 'fn (x: number) -> x + 1';
  const lexer = new Lexer();
  const tokens = lexer.tokenize(input);

  // Expected tokens:
  // 1. FN: fn
  // 2. LPAREN: (
  // 3. IDENTIFIER: x
  // 4. COLON: :
  // 5. IDENTIFIER: number
  // 6. RPAREN: )
  // 7. ARROW: ->
  // 8. IDENTIFIER: x
  // 9. IDENTIFIER: + (would need operator support, but for now identifier)
  // 10. NUMBER: 1
  // 11. EOF

  expect(tokens[0].type).toBe(TokenType.FN);
  expect(tokens[0].value).toBe('fn');
  
  expect(tokens[1].type).toBe(TokenType.LPAREN);
  expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
  expect(tokens[2].value).toBe('x');
  
  expect(tokens[3].type).toBe(TokenType.COLON);
  expect(tokens[4].type).toBe(TokenType.IDENTIFIER);
  expect(tokens[4].value).toBe('number');
  
  expect(tokens[5].type).toBe(TokenType.RPAREN);
  
  expect(tokens[6].type).toBe(TokenType.ARROW);
  expect(tokens[6].value).toBe('->');
});

test('Lexer should distinguish between fn keyword and identifier', () => {
  const input1 = 'fn';
  const input2 = 'function';
  const lexer = new Lexer();
  
  const tokens1 = lexer.tokenize(input1);
  expect(tokens1[0].type).toBe(TokenType.FN);
  
  const tokens2 = lexer.tokenize(input2);
  expect(tokens2[0].type).toBe(TokenType.IDENTIFIER);
  expect(tokens2[0].value).toBe('function');
});

