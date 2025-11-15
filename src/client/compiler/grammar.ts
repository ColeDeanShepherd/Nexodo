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
  OneOrMore,
  PostfixOperations,
  PostfixOperation,
  GrammarRule
} from './parser';

// Helper functions for building specific node types
function buildFunctionCall(parser: RecursiveDescentParser, left: ParseNode): ParseNode {
  parser.advance(); // consume '('
  
  // Parse arguments
  const args = new ParseNode(ParseNodeType.Array);
  
  // Handle empty argument list
  if (parser.check(TokenType.RPAREN)) {
    parser.advance(); // consume ')'
    const funcCall = new ParseNode(ParseNodeType.FunctionCall);
    funcCall.addChild(left);
    funcCall.addChild(args);
    return funcCall;
  }
  
  // Parse first argument
  const firstArg = parser.parseRule('non_binding_expression');
  if (!firstArg) {
    throw new Error('Expected argument expression');
  }
  args.addChild(firstArg);
  
  // Parse additional arguments separated by commas
  while (parser.check(TokenType.COMMA)) {
    parser.advance(); // consume ','
    
    // Parse next argument
    const arg = parser.parseRule('non_binding_expression');
    if (!arg) {
      throw new Error('Expected argument expression after comma');
    }
    args.addChild(arg);
  }
  
  // Expect closing parenthesis
  if (!parser.check(TokenType.RPAREN)) {
    throw new Error('Expected closing parenthesis after function arguments');
  }
  parser.advance(); // consume ')'

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

function buildArrayAccess(parser: RecursiveDescentParser, left: ParseNode): ParseNode {
  parser.advance(); // consume '['
  
  // Parse the index expression
  const indexExpr = parser.parseRule('non_binding_expression');
  if (!indexExpr) {
    throw new Error('Expected index expression');
  }
  
  // Expect closing bracket
  if (!parser.check(TokenType.RBRACKET)) {
    throw new Error('Expected closing bracket after array index');
  }
  parser.advance(); // consume ']'
  
  const arrayAccess = new ParseNode(ParseNodeType.ArrayAccess);
  arrayAccess.addChild(left);
  arrayAccess.addChild(indexExpr);
  
  return arrayAccess;
}

// Grammar definition for REPL
export function createReplGrammar(): Record<string, GrammarRule> {
  const grammar: Record<string, GrammarRule> = {};

  // Main expression rule - handles both bindings and other expressions
  grammar['expression'] = new Choice(
    new NonTerminal('assignment'), 
    new NonTerminal('non_binding_expression')
  );

  // Assignment: postfix_expression : expression (covers all assignable expressions)
  grammar['assignment'] = new Sequence(
    ParseNodeType.Assignment,
    new NonTerminal('postfix_expression'),
    new Terminal(TokenType.COLON),
    new NonTerminal('non_binding_expression')
  );

  // Non-binding expressions
  grammar['non_binding_expression'] = new NonTerminal('postfix_expression');

  // Postfix operations (function calls, member access, and array indexing)
  grammar['postfix_expression'] = new PostfixOperations(
    new NonTerminal('primary'),
    [
      { triggerToken: TokenType.LPAREN, buildNode: buildFunctionCall },
      { triggerToken: TokenType.DOT, buildNode: buildMemberAccess },
      { triggerToken: TokenType.LBRACKET, buildNode: buildArrayAccess }
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
    new Optional(new NonTerminal('object_property_list')),
    new Terminal(TokenType.RBRACE)
  );

  // Object property list: property or property, property, ...
  grammar['object_property_list'] = new Choice(
    new NonTerminal('object_property'),
    new Sequence(
      ParseNodeType.Token,
      new NonTerminal('object_property'),
      new OneOrMore(
        new Sequence(
          ParseNodeType.Token,
          new Terminal(TokenType.COMMA),
          new NonTerminal('object_property')
        )
      )
    )
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
    new Optional(new NonTerminal('array_element_list')),
    new Terminal(TokenType.RBRACKET)
  );

  // Array element list: element or element, element, ...
  grammar['array_element_list'] = new Choice(
    new NonTerminal('non_binding_expression'),
    new Sequence(
      ParseNodeType.Token,
      new NonTerminal('non_binding_expression'),
      new OneOrMore(
        new Sequence(
          ParseNodeType.Token,
          new Terminal(TokenType.COMMA),
          new NonTerminal('non_binding_expression')
        )
      )
    )
  );

  return grammar;
}

// Create a parser for REPL expressions
export function createReplParser(tokens: any[]): RecursiveDescentParser {
  return new RecursiveDescentParser(tokens, createReplGrammar(), 'expression');
}
