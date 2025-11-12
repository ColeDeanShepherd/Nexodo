import { Token, TokenType } from './lexer';

// Parse node types - extend as needed for your language
export enum ParseNodeType {
  Program = 'Program',
  Assignment = 'Assignment',
  Expression = 'Expression',
  Identifier = 'Identifier',
  Literal = 'Literal',
  FunctionCall = 'FunctionCall',
  Object = 'Object',
  Array = 'Array',
  Property = 'Property',
  MemberAccess = 'MemberAccess',
  Token = 'Token'
}

export class ParseNode {
  public children: ParseNode[] = [];

  constructor(
    public type: ParseNodeType,
    public token?: Token
  ) {}

  addChild(child: ParseNode): void {
    this.children.push(child);
  }

  toString(indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    const tokenInfo = this.token ? ` (${this.token.value})` : '';
    let result = `${spaces}${this.type}${tokenInfo}`;
    
    for (const child of this.children) {
      result += '\n' + child.toString(indent + 1);
    }
    
    return result;
  }
}

export class ParseException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseException';
  }
}

// Grammar rule types
export abstract class GrammarRule {}

export class Terminal extends GrammarRule {
  constructor(
    public tokenType: TokenType,
    public nodeType?: ParseNodeType
  ) {
    super();
  }
}

export class NonTerminal extends GrammarRule {
  constructor(public ruleName: string) {
    super();
  }
}

export class Sequence extends GrammarRule {
  public rules: GrammarRule[];
  
  constructor(public nodeType: ParseNodeType, ...rules: GrammarRule[]) {
    super();
    this.rules = rules;
  }
}

export class Choice extends GrammarRule {
  public alternatives: GrammarRule[];
  
  constructor(...alternatives: GrammarRule[]) {
    super();
    this.alternatives = alternatives;
  }
}

export class Optional extends GrammarRule {
  constructor(public rule: GrammarRule) {
    super();
  }
}

export class ZeroOrMore extends GrammarRule {
  constructor(
    public rule: GrammarRule,
    public containerType?: ParseNodeType
  ) {
    super();
  }
}

export class OneOrMore extends GrammarRule {
  constructor(
    public rule: GrammarRule,
    public containerType?: ParseNodeType
  ) {
    super();
  }
}

export class WithWhitespace extends GrammarRule {
  constructor(public rule: GrammarRule) {
    super();
  }
}

export interface PostfixOperation {
  triggerToken: TokenType;
  buildNode: (parser: RecursiveDescentParser, left: ParseNode) => ParseNode;
}

export class PostfixOperations extends GrammarRule {
  public operations: PostfixOperation[];
  
  constructor(public baseRule: GrammarRule, operations: PostfixOperation[]) {
    super();
    this.operations = operations;
  }
}

export class RecursiveDescentParser {
  private position: number = 0;

  constructor(
    private tokens: Token[],
    private grammar: Record<string, GrammarRule>,
    private startRule: string = 'program'
  ) {}

  parse(): ParseNode {
    this.skipWhitespace();
    const result = this.parseRule(this.startRule);
    return result ?? new ParseNode(ParseNodeType.Program);
  }

  parseRule(ruleName: string): ParseNode | null {
    const rule = this.grammar[ruleName];
    if (!rule) {
      throw new ParseException(`Unknown rule: ${ruleName}`);
    }
    return this.parseGrammarRule(rule);
  }

  parseGrammarRule(rule: GrammarRule): ParseNode | null {
    if (rule instanceof Terminal) {
      return this.parseTerminal(rule);
    }
    if (rule instanceof NonTerminal) {
      return this.parseNonTerminal(rule);
    }
    if (rule instanceof Sequence) {
      return this.parseSequence(rule);
    }
    if (rule instanceof Choice) {
      return this.parseChoice(rule);
    }
    if (rule instanceof Optional) {
      return this.parseOptional(rule);
    }
    if (rule instanceof ZeroOrMore) {
      return this.parseZeroOrMore(rule);
    }
    if (rule instanceof OneOrMore) {
      return this.parseOneOrMore(rule);
    }
    if (rule instanceof WithWhitespace) {
      return this.parseWithWhitespace(rule);
    }
    if (rule instanceof PostfixOperations) {
      return this.parsePostfixOperations(rule);
    }
    
    throw new Error(`Unknown rule type: ${rule.constructor.name}`);
  }

  canParseRule(rule: GrammarRule): boolean {
    if (rule instanceof Terminal) {
      return this.check(rule.tokenType);
    }
    if (rule instanceof NonTerminal) {
      return this.canParseRule(this.grammar[rule.ruleName]);
    }
    if (rule instanceof Sequence) {
      return this.canParseSequence(rule);
    }
    if (rule instanceof Choice) {
      return rule.alternatives.some(alt => this.canParseRule(alt));
    }
    if (rule instanceof Optional) {
      return true;
    }
    if (rule instanceof ZeroOrMore) {
      return true;
    }
    if (rule instanceof OneOrMore) {
      return this.canParseRule(rule.rule);
    }
    if (rule instanceof WithWhitespace) {
      return this.canParseWithWhitespace(rule.rule);
    }
    if (rule instanceof PostfixOperations) {
      return this.canParseRule(rule.baseRule);
    }
    
    return false;
  }

  private canParseSequence(sequence: Sequence): boolean {
    if (sequence.rules.length === 0) return true;
    
    // Save current position
    const savedPosition = this.position;
    
    try {
      // Try to parse each rule in the sequence
      for (const rule of sequence.rules) {
        if (!this.canParseRule(rule)) {
          return false;
        }
        
        // Actually advance past this rule to check the next one
        const result = this.parseGrammarRule(rule);
        if (result === null) {
          return false;
        }
      }
      return true;
    } finally {
      // Always restore position
      this.position = savedPosition;
    }
  }

  private canParseWithWhitespace(rule: GrammarRule): boolean {
    // Look ahead by skipping whitespace temporarily
    const savedPosition = this.position;
    while (this.check(TokenType.WHITESPACE)) {
      this.advance();
    }
    const result = this.canParseRule(rule);
    this.position = savedPosition; // Restore position
    return result;
  }

  private parseTerminal(terminal: Terminal): ParseNode | null {
    if (!this.check(terminal.tokenType)) return null;
    const token = this.advance();
    return new ParseNode(terminal.nodeType ?? ParseNodeType.Token, token);
  }

  private parseNonTerminal(nonTerminal: NonTerminal): ParseNode | null {
    const rule = this.grammar[nonTerminal.ruleName];
    if (!rule) {
      throw new ParseException(`Unknown rule: ${nonTerminal.ruleName}`);
    }
    return this.parseGrammarRule(rule);
  }

  private parseSequence(sequence: Sequence): ParseNode | null {
    const node = new ParseNode(sequence.nodeType);

    for (const rule of sequence.rules) {
      const child = this.parseGrammarRule(rule);
      if (child === null) {
        throw new ParseException(`Expected ${rule.constructor.name} in sequence for ${sequence.nodeType}`);
      }
      node.addChild(child);
    }

    return node;
  }

  private parseChoice(choice: Choice): ParseNode | null {
    for (const alternative of choice.alternatives) {
      if (this.canParseRule(alternative)) {
        return this.parseGrammarRule(alternative);
      }
    }
    return null;
  }

  private parseOptional(optional: Optional): ParseNode | null {
    if (this.canParseRule(optional.rule)) {
      return this.parseGrammarRule(optional.rule);
    }
    return null;
  }

  private parseZeroOrMore(zeroOrMore: ZeroOrMore): ParseNode | null {
    const children: ParseNode[] = [];

    while (this.canParseRule(zeroOrMore.rule)) {
      const child = this.parseGrammarRule(zeroOrMore.rule);
      if (child !== null) {
        children.push(child);
      } else {
        break;
      }
    }

    if (zeroOrMore.containerType) {
      const container = new ParseNode(zeroOrMore.containerType);
      for (const child of children) {
        container.addChild(child);
      }
      return container;
    }

    switch (children.length) {
      case 0:
        return null;
      case 1:
        return children[0];
      default:
        throw new Error("ZeroOrMore without container type matched multiple items");
    }
  }

  private parseOneOrMore(oneOrMore: OneOrMore): ParseNode | null {
    const children: ParseNode[] = [];

    // Must match at least once
    const first = this.parseGrammarRule(oneOrMore.rule);
    if (first === null) {
      throw new ParseException("OneOrMore rule failed to match required first occurrence");
    }
    children.push(first);

    // Then match zero or more additional times
    while (this.canParseRule(oneOrMore.rule)) {
      const child = this.parseGrammarRule(oneOrMore.rule);
      if (child !== null) {
        children.push(child);
      } else {
        break;
      }
    }

    if (oneOrMore.containerType) {
      const container = new ParseNode(oneOrMore.containerType);
      for (const child of children) {
        container.addChild(child);
      }
      return container;
    }

    return children.length === 1 ? 
      children[0] : 
      (() => { throw new Error("OneOrMore without container type matched multiple items"); })();
  }

  private parseWithWhitespace(ws: WithWhitespace): ParseNode | null {
    this.skipWhitespace();
    return this.parseGrammarRule(ws.rule);
  }

  private parsePostfixOperations(postfix: PostfixOperations): ParseNode | null {
    let left = this.parseGrammarRule(postfix.baseRule);
    if (left === null) return null;

    while (true) {
      let matched = false;
      for (const operation of postfix.operations) {
        if (this.check(operation.triggerToken)) {
          left = operation.buildNode(this, left);
          matched = true;
          break;
        }
      }
      if (!matched) break;
    }

    return left;
  }

  // Helper methods for token management
  skipWhitespace(): void {
    while (this.check(TokenType.WHITESPACE)) {
      this.advance();
    }
  }

  check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.currentToken()?.type === type;
  }

  currentToken(): Token | undefined {
    if (this.isAtEnd()) return undefined;
    return this.tokens[this.position];
  }

  advance(): Token | undefined {
    if (!this.isAtEnd()) this.position++;
    return this.previous();
  }

  previous(): Token | undefined {
    if (this.position <= 0) return undefined;
    return this.tokens[this.position - 1];
  }

  isAtEnd(): boolean {
    return this.position >= this.tokens.length;
  }
}