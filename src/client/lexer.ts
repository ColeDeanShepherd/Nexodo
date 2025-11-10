export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  NULL = 'NULL',
  
  // Identifiers and keywords
  IDENTIFIER = 'IDENTIFIER',
  
  // Operators
  ASSIGN = 'ASSIGN',
  
  // Punctuation
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COMMA = 'COMMA',
  COLON = 'COLON',
  
  // Special
  WHITESPACE = 'WHITESPACE',
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
  UNKNOWN = 'UNKNOWN'
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
  line: number;
  column: number;
}

interface TokenRule {
  type: TokenType;
  regex: RegExp;
  skip?: boolean;
}

export class Lexer {
  private rules: TokenRule[] = [
    // Whitespace (skip)
    { type: TokenType.WHITESPACE, regex: /^[ \t]+/, skip: true },
    { type: TokenType.NEWLINE, regex: /^\n/, skip: true },
    
    // Literals
    { type: TokenType.NUMBER, regex: /^-?\d+(\.\d+)?([eE][+-]?\d+)?/ },
    { type: TokenType.STRING, regex: /^"([^"\\]|\\.)*"/ },
    { type: TokenType.STRING, regex: /^'([^'\\]|\\.)*'/ },
    { type: TokenType.BOOLEAN, regex: /^(true|false)/ },
    { type: TokenType.NULL, regex: /^null/ },
    
    // Operators
    { type: TokenType.ASSIGN, regex: /^=/ },
    
    // Punctuation
    { type: TokenType.LPAREN, regex: /^\(/ },
    { type: TokenType.RPAREN, regex: /^\)/ },
    { type: TokenType.LBRACE, regex: /^\{/ },
    { type: TokenType.RBRACE, regex: /^\}/ },
    { type: TokenType.LBRACKET, regex: /^\[/ },
    { type: TokenType.RBRACKET, regex: /^\]/ },
    { type: TokenType.COMMA, regex: /^,/ },
    { type: TokenType.COLON, regex: /^:/ },
    
    // Identifiers (must come after keywords)
    { type: TokenType.IDENTIFIER, regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ }
  ];

  private input: string = '';
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  tokenize(input: string): Token[] {
    this.input = input;
    this.position = 0;
    this.line = 1;
    this.column = 1;

    const tokens: Token[] = [];
    
    while (this.position < this.input.length) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }

    tokens.push({
      type: TokenType.EOF,
      value: '',
      position: this.position,
      line: this.line,
      column: this.column
    });

    return tokens;
  }

  private nextToken(): Token | null {
    if (this.position >= this.input.length) {
      return null;
    }

    const remaining = this.input.slice(this.position);
    
    for (const rule of this.rules) {
      const match = remaining.match(rule.regex);
      if (match) {
        const value = match[0];
        const token: Token = {
          type: rule.type,
          value,
          position: this.position,
          line: this.line,
          column: this.column
        };

        this.advance(value);
        
        return rule.skip ? this.nextToken() : token;
      }
    }

    // Unknown character
    const char = this.input[this.position];
    const token: Token = {
      type: TokenType.UNKNOWN,
      value: char,
      position: this.position,
      line: this.line,
      column: this.column
    };
    
    this.advance(char);
    return token;
  }

  private advance(text: string): void {
    for (const char of text) {
      if (char === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
    }
    this.position += text.length;
  }
}

// Usage example:
// const lexer = new Lexer();
// const tokens = lexer.tokenize(`
//   x = 42
//   name = "John"
//   config = { port: 8080, enabled: true }
//   result = calculate(x, y)
//   items = [1, 2, 3]
// `);