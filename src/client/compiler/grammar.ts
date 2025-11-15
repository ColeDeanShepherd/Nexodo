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
  GrammarRule,
  PrattExpression,
  OperatorType,
  PrattOperator,
  TokenSeparatedList
} from './parser';

// Grammar definition for REPL
export function createReplGrammar(): Record<string, GrammarRule> {
  const grammar: Record<string, GrammarRule> = {};

  // Primary expressions (atoms)
  grammar['primary'] = new Choice(
    new Terminal(TokenType.NUMBER, ParseNodeType.Literal),
    new Terminal(TokenType.STRING, ParseNodeType.Literal),  
    new Terminal(TokenType.BOOLEAN, ParseNodeType.Literal),
    new Terminal(TokenType.NULL, ParseNodeType.Literal),
    new Terminal(TokenType.IDENTIFIER, ParseNodeType.Identifier),
    new NonTerminal('object'),
    new NonTerminal('array')
  );

  // Define operators for the Pratt parser
  const operators: PrattOperator[] = [
    // Assignment operator: x : value
    // Lowest precedence (binding power 5), right-associative
    {
      type: OperatorType.INFIX,
      tokenType: TokenType.COLON,
      leftBindingPower: 5,
      rightBindingPower: 4, // Right-associative
      buildNode: (parser, left, operator, right) => {
        const node = new ParseNode(ParseNodeType.Assignment, operator);
        node.addChild(left);
        node.addChild(right);
        return node;
      }
    },

    // Member access: x.property
    // Highest precedence (binding power 110), left-associative
    {
      type: OperatorType.INFIX,
      tokenType: TokenType.DOT,
      leftBindingPower: 110,
      rightBindingPower: 111,
      buildNode: (parser, left, operator, right) => {
        // Right side should be an identifier
        if (right.type !== ParseNodeType.Identifier) {
          throw new Error(`Member access requires an identifier after dot. Got ${right.type}`);
        }
        const node = new ParseNode(ParseNodeType.MemberAccess, operator);
        node.addChild(left);
        node.addChild(right);
        return node;
      }
    },

    // Function application: f(args...)
    // Highest precedence (binding power 100), postfix
    {
      type: OperatorType.POSTFIX,
      tokenType: TokenType.LPAREN,
      leftBindingPower: 100,
      buildNode: (parser, left, operator) => {
        // Parse arguments using TokenSeparatedList
        const argListRule = new TokenSeparatedList(
          new NonTerminal('expression'),
          TokenType.COMMA,
          ParseNodeType.Array, // container type for arguments
          true,  // allow empty argument list
          false  // don't allow trailing comma in function calls
        );
        
        parser.skipWhitespace();
        const args = parser.parseGrammarRule(argListRule) ?? new ParseNode(ParseNodeType.Array);
        parser.skipWhitespace();
        
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
    },

    // Array access: arr[index]
    // Highest precedence (binding power 100), postfix
    {
      type: OperatorType.POSTFIX,
      tokenType: TokenType.LBRACKET,
      leftBindingPower: 100,
      buildNode: (parser, left, operator) => {
        parser.skipWhitespace();
        
        // Parse the index expression
        const indexExpr = parser.parseRule('expression');
        if (!indexExpr) {
          throw new Error('Expected index expression');
        }
        
        parser.skipWhitespace();
        
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
    }
  ];

  // Main expression rule using Pratt parser
  grammar['expression'] = new PrattExpression({
    baseExpressionRule: new NonTerminal('primary'),
    operators: operators
  });

  // Object literal: { key: value, ... }
  grammar['object'] = new Sequence(
    ParseNodeType.Object,
    new Terminal(TokenType.LBRACE),
    new NonTerminal('object_property_list'),
    new Terminal(TokenType.RBRACE)
  );

  // Object property list: property, property, ...
  grammar['object_property_list'] = new TokenSeparatedList(
    new NonTerminal('object_property'),
    TokenType.COMMA,
    ParseNodeType.Token, // container type for properties
    true, // allow empty
    true  // allow trailing comma
  );

  // Object property: key: value
  grammar['object_property'] = new Sequence(
    ParseNodeType.Property,
    new Choice(
      new Terminal(TokenType.IDENTIFIER, ParseNodeType.Identifier),
      new Terminal(TokenType.STRING, ParseNodeType.Literal)
    ),
    new Terminal(TokenType.COLON),
    new NonTerminal('expression')
  );

  // Array literal: [value, ...]  
  grammar['array'] = new Sequence(
    ParseNodeType.Array,
    new Terminal(TokenType.LBRACKET),
    new NonTerminal('array_element_list'),
    new Terminal(TokenType.RBRACKET)
  );

  // Array element list: element, element, ...
  grammar['array_element_list'] = new TokenSeparatedList(
    new NonTerminal('expression'),
    TokenType.COMMA,
    ParseNodeType.Token, // container type for elements  
    true, // allow empty
    true   // allow trailing comma in arrays
  );

  return grammar;
}

// Create a parser for REPL expressions
export function createReplParser(tokens: any[]): RecursiveDescentParser {
  return new RecursiveDescentParser(tokens, createReplGrammar(), 'expression');
}
