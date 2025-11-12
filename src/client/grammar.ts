import { TokenType } from './lexer';
import { 
  ParseNodeType, 
  ParseNode, 
  RecursiveDescentParser,
  Terminal,
  NonTerminal,
  Sequence,
  Choice,
  Optional,
  ZeroOrMore,
  PostfixOperations,
  PostfixOperation,
  GrammarRule
} from './parser';

// Helper functions for building specific node types
function buildFunctionCall(parser: RecursiveDescentParser, left: ParseNode): ParseNode {
  parser.advance(); // consume '('
  
  // Parse arguments - for now, just create an empty argument list
  const args = new ParseNode(ParseNodeType.Array);
  
  // Skip to closing paren (simplified for now)
  while (!parser.check(TokenType.RPAREN) && !parser.isAtEnd()) {
    parser.advance();
  }
  
  if (parser.check(TokenType.RPAREN)) {
    parser.advance(); // consume ')'
  }

  const funcCall = new ParseNode(ParseNodeType.FunctionCall);
  funcCall.addChild(left);
  funcCall.addChild(args);
  return funcCall;
}

function buildMemberAccess(parser: RecursiveDescentParser, left: ParseNode): ParseNode {
  parser.advance(); // consume '.'
  
  // Expect an identifier after the dot
  if (!parser.check(TokenType.IDENTIFIER)) {
    throw new Error('Expected identifier after dot');
  }
  
  const identifier = parser.advance();
  const identifierNode = new ParseNode(ParseNodeType.Identifier, identifier);
  
  const memberAccess = new ParseNode(ParseNodeType.MemberAccess);
  memberAccess.addChild(left);
  memberAccess.addChild(identifierNode);
  
  return memberAccess;
}

// Grammar definition for REPL
export function createReplGrammar(): Record<string, GrammarRule> {
  const grammar: Record<string, GrammarRule> = {};

  // Main expression rule - handles both bindings and other expressions
  grammar['expression'] = new Choice(
    new NonTerminal('binding'),
    new NonTerminal('non_binding_expression')
  );

  // Binding: identifier = expression  
  grammar['binding'] = new Sequence(
    ParseNodeType.Assignment,
    new Terminal(TokenType.IDENTIFIER, ParseNodeType.Identifier),
    new Terminal(TokenType.ASSIGN),
    new NonTerminal('non_binding_expression')
  );

  // Non-binding expressions
  grammar['non_binding_expression'] = new NonTerminal('postfix_expression');

  // Postfix operations (function calls and member access)
  grammar['postfix_expression'] = new PostfixOperations(
    new NonTerminal('primary'),
    [
      { triggerToken: TokenType.LPAREN, buildNode: buildFunctionCall },
      { triggerToken: TokenType.DOT, buildNode: buildMemberAccess }
    ]
  );

  // Primary expressions
  grammar['primary'] = new Choice(
    new Terminal(TokenType.NUMBER, ParseNodeType.Literal),
    new Terminal(TokenType.STRING, ParseNodeType.Literal),  
    new Terminal(TokenType.BOOLEAN, ParseNodeType.Literal),
    new Terminal(TokenType.NULL, ParseNodeType.Literal),
    new Terminal(TokenType.IDENTIFIER, ParseNodeType.Identifier),
    new NonTerminal('object'),
    new NonTerminal('array')
  );

  // Object literal: { key: value, ... }
  grammar['object'] = new Sequence(
    ParseNodeType.Object,
    new Terminal(TokenType.LBRACE),
    new ZeroOrMore(new NonTerminal('object_property')),
    new Terminal(TokenType.RBRACE)
  );

  // Object property: key: value
  grammar['object_property'] = new Sequence(
    ParseNodeType.Property,
    new Choice(
      new Terminal(TokenType.IDENTIFIER, ParseNodeType.Identifier),
      new Terminal(TokenType.STRING, ParseNodeType.Literal)
    ),
    new Terminal(TokenType.COLON),
    new NonTerminal('non_binding_expression')
  );

  // Array literal: [value, ...]
  grammar['array'] = new Sequence(
    ParseNodeType.Array,
    new Terminal(TokenType.LBRACKET),
    new ZeroOrMore(new NonTerminal('non_binding_expression')),
    new Terminal(TokenType.RBRACKET)
  );

  return grammar;
}

// Create a parser for REPL expressions
export function createReplParser(tokens: any[]): RecursiveDescentParser {
  return new RecursiveDescentParser(tokens, createReplGrammar(), 'expression');
}
