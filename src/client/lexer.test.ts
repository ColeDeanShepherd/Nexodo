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
