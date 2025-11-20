import { Token } from './lexer';
import { ParseNode, ParseNodeType } from './parser';
import { Type } from './type-checker';

// Abstract Syntax Tree Node Types
export abstract class ASTNode {
  abstract readonly nodeType: string;
}

// Expressions
export abstract class Expression extends ASTNode {}

// Literals
export class NumberLiteral extends Expression {
  readonly nodeType = 'NumberLiteral';
  
  constructor(public value: number, public token: Token) {
    super();
  }
}

export class StringLiteral extends Expression {
  readonly nodeType = 'StringLiteral';
  
  constructor(public value: string, public token: Token) {
    super();
  }
}

export class BooleanLiteral extends Expression {
  readonly nodeType = 'BooleanLiteral';
  
  constructor(public value: boolean, public token: Token) {
    super();
  }
}

export class NullLiteral extends Expression {
  readonly nodeType = 'NullLiteral';
  
  constructor(public token?: Token) {
    super();
  }
}

// Identifiers
export class Identifier extends Expression {
  readonly nodeType = 'Identifier';
  
  constructor(public name: string, public token: Token) {
    super();
  }
}

// Complex values
export class ObjectLiteral extends Expression {
  readonly nodeType = 'ObjectLiteral';
  
  constructor(public properties: ObjectProperty[]) {
    super();
  }
}

export class ObjectProperty extends ASTNode {
  readonly nodeType = 'ObjectProperty';
  
  constructor(
    public key: string | Expression,
    public value: Expression
  ) {
    super();
  }
}

export class ArrayLiteral extends Expression {
  readonly nodeType = 'ArrayLiteral';
  
  constructor(public elements: Expression[]) {
    super();
  }
}

// Operations
export class FunctionCall extends Expression {
  readonly nodeType = 'FunctionCall';
  
  constructor(
    public callee: Expression,
    public args: Expression[]
  ) {
    super();
  }
}

export class MemberAccess extends Expression {
  readonly nodeType = 'MemberAccess';
  
  constructor(
    public object: Expression,
    public property: Identifier
  ) {
    super();
  }
}

export class ArrayAccess extends Expression {
  readonly nodeType = 'ArrayAccess';
  
  constructor(
    public object: Expression,
    public index: Expression
  ) {
    super();
  }
}

// DOM Node for UI elements
export class DOMNode extends Expression {
  readonly nodeType = 'DOMNode';
  
  constructor(
    public tagName: string,
    public attributes: Record<string, string> = {},
    public children: (DOMNode | string)[] = []
  ) {
    super();
  }
}

// Assignments
export class Assignment extends ASTNode {
  readonly nodeType = 'Assignment';
  
  // target can be a plain identifier (x), a member access (obj.prop), or an array access (arr[i])
  constructor(
    public target: Identifier | MemberAccess | ArrayAccess,
    public value: Expression
  ) {
    super();
  }
}

// Other
export class BuiltInCodeNode extends ASTNode {
  readonly nodeType = 'BuiltInCodeNode';

  constructor(public fn: () => Expression) {
    super();
  }
}

export class Function extends ASTNode {
  readonly nodeType = 'Function';

  constructor(
    public parameters: Parameter[],
    public body: ASTNode[]
  ) {
    super();
  }
}

export class Parameter extends ASTNode {
  readonly nodeType = 'Parameter';

  constructor(public name: string, public type?: Type) {
    super();
  }
}

// Program (top-level)
export class Program extends ASTNode {
  readonly nodeType = 'Program';
  
  constructor(public statements: (Assignment | Expression)[]) {
    super();
  }
}

// AST Builder - converts concrete parse tree to abstract syntax tree
export class ASTBuilder {
  build(parseNode: ParseNode): ASTNode {
    switch (parseNode.type) {
      case ParseNodeType.Program:
        return this.buildProgram(parseNode);
      case ParseNodeType.Assignment:
        return this.buildAssignment(parseNode);
      case ParseNodeType.Expression:
        return this.buildExpression(parseNode);
      case ParseNodeType.Identifier:
        return this.buildIdentifier(parseNode);
      case ParseNodeType.Literal:
        return this.buildLiteral(parseNode);
      case ParseNodeType.FunctionCall:
        return this.buildFunctionCall(parseNode);
      case ParseNodeType.Object:
        return this.buildObjectLiteral(parseNode);
      case ParseNodeType.Array:
        return this.buildArrayLiteral(parseNode);
      case ParseNodeType.Property:
        return this.buildObjectProperty(parseNode);
      case ParseNodeType.MemberAccess:
        return this.buildMemberAccess(parseNode);
      case ParseNodeType.ArrayAccess:
        return this.buildArrayAccess(parseNode);
      default:
        throw new Error(`Unsupported parse node type: ${parseNode.type}`);
    }
  }

  private buildProgram(node: ParseNode): Program {
    const statements: (Assignment | Expression)[] = [];
    
    for (const child of node.children) {
      if (child.type === ParseNodeType.Token) {
        continue; // Skip token nodes
      }
      
      const statement = this.build(child);
      if (statement instanceof Assignment || statement instanceof Expression) {
        statements.push(statement);
      }
    }
    
    return new Program(statements);
  }

  private buildAssignment(node: ParseNode): Assignment {
    // Filter out token nodes except identifiers and member access
    const nonTokenChildren = node.children.filter(child => 
      child.type !== ParseNodeType.Token || 
      (child.token?.type !== 'COLON' as any)
    );
    
    if (nonTokenChildren.length !== 2) {
      throw new Error('Assignment must have target and value');
    }
    
    const targetNode = this.build(nonTokenChildren[0]);
    const value = this.build(nonTokenChildren[1]);
    
    if (!(targetNode instanceof Identifier) && !(targetNode instanceof MemberAccess) && !(targetNode instanceof ArrayAccess)) {
      throw new Error('Assignment target must be an identifier, member access, or array access');
    }
    
    if (!(value instanceof Expression)) {
      throw new Error('Assignment value must be an expression');
    }
    
    return new Assignment(targetNode as Identifier | MemberAccess | ArrayAccess, value);
  }

  private buildExpression(node: ParseNode): Expression {
    // Expression nodes typically wrap other nodes
    if (node.children.length === 1) {
      const child = this.build(node.children[0]);
      if (child instanceof Expression) {
        return child;
      }
    }
    
    throw new Error('Invalid expression structure');
  }

  private buildIdentifier(node: ParseNode): Identifier {
    if (!node.token) {
      throw new Error('Identifier node missing token');
    }
    
    return new Identifier(node.token.value, node.token);
  }

  private buildLiteral(node: ParseNode): Expression {
    if (!node.token) {
      throw new Error('Literal node missing token');
    }
    
    const token = node.token;
    const value = token.value;
    
    // Determine literal type based on token type or value
    if (token.type === 'NUMBER' as any) {
      return new NumberLiteral(parseFloat(value), token);
    }
    
    if (token.type === 'STRING' as any) {
      // Remove quotes from string value
      const stringValue = value.startsWith('"') && value.endsWith('"') 
        ? value.slice(1, -1)
        : value.startsWith("'") && value.endsWith("'")
        ? value.slice(1, -1)
        : value;
      return new StringLiteral(stringValue, token);
    }
    
    if (token.type === 'BOOLEAN' as any || value === 'true' || value === 'false') {
      return new BooleanLiteral(value === 'true', token);
    }
    
    if (token.type === 'NULL' as any || value === 'null') {
      return new NullLiteral(token);
    }
    
    throw new Error(`Unknown literal type: ${token.type} with value: ${value}`);
  }

  private buildFunctionCall(node: ParseNode): FunctionCall {
    // FunctionCall structure: [Expression (callee), Array (args)]
    if (node.children.length < 1) {
      throw new Error('Function call missing callee');
    }
    
    const callee = this.build(node.children[0]);
    if (!(callee instanceof Expression)) {
      throw new Error('Function callee must be an expression');
    }
    
    const args: Expression[] = [];
    if (node.children.length > 1 && node.children[1].type === ParseNodeType.Array) {
      const argsNode = node.children[1];
      for (const argChild of argsNode.children) {
        if (argChild.type !== ParseNodeType.Token) {
          const arg = this.build(argChild);
          if (arg instanceof Expression) {
            args.push(arg);
          }
        }
      }
    }
    
    return new FunctionCall(callee, args);
  }

  private buildObjectLiteral(node: ParseNode): ObjectLiteral {
    const properties: ObjectProperty[] = [];
    
    // Look for object_property_list or direct properties
    for (const child of node.children) {
      if (child.type === ParseNodeType.Property) {
        // Direct property
        const prop = this.build(child);
        if (prop instanceof ObjectProperty) {
          properties.push(prop);
        }
      } else if (child.type === ParseNodeType.Token || child.children.length > 0) {
        // This might be the object_property_list container
        this.collectProperties(child, properties);
      }
    }
    
    return new ObjectLiteral(properties);
  }

  private collectProperties(node: ParseNode, properties: ObjectProperty[]): void {
    for (const child of node.children) {
      if (child.type === ParseNodeType.Property) {
        const prop = this.build(child);
        if (prop instanceof ObjectProperty) {
          properties.push(prop);
        }
      } else if (child.type === ParseNodeType.Token && child.children.length > 0) {
        // Recursively check nested token containers
        this.collectProperties(child, properties);
      } else if (child.children) {
        // Check any other nodes with children
        this.collectProperties(child, properties);
      }
    }
  }

  private buildObjectProperty(node: ParseNode): ObjectProperty {
    // Property structure: [key, :, value]
    const nonTokenChildren = node.children.filter(child => 
      child.type !== ParseNodeType.Token || child.token?.type !== 'COLON' as any
    );
    
    if (nonTokenChildren.length < 2) {
      throw new Error('Object property missing key or value');
    }
    
    const keyNode = nonTokenChildren[0];
    const valueNode = nonTokenChildren[1];
    
    let key: string | Expression;
    if (keyNode.type === ParseNodeType.Identifier && keyNode.token) {
      key = keyNode.token.value;
    } else {
      const keyExpr = this.build(keyNode);
      if (keyExpr instanceof Expression) {
        key = keyExpr;
      } else {
        throw new Error('Invalid object property key');
      }
    }
    
    const value = this.build(valueNode);
    if (!(value instanceof Expression)) {
      throw new Error('Object property value must be an expression');
    }
    
    return new ObjectProperty(key, value);
  }

  private buildArrayLiteral(node: ParseNode): ArrayLiteral {
    const elements: Expression[] = [];
    
    // Look for array_element_list or direct elements
    for (const child of node.children) {
      if (child.type !== ParseNodeType.Token || (child.token?.type !== 'LBRACKET' as any && child.token?.type !== 'RBRACKET' as any)) {
        if (child.children) {
          // This might be the array_element_list container
          this.collectElements(child, elements);
        } else {
          const element = this.build(child);
          if (element instanceof Expression) {
            elements.push(element);
          }
        }
      }
    }
    
    return new ArrayLiteral(elements);
  }

  private collectElements(node: ParseNode, elements: Expression[]): void {
    for (const child of node.children) {
      if (child.type !== ParseNodeType.Token || child.token?.type !== 'COMMA' as any) {
        // Check if this is a direct expression node
        if (child.type === ParseNodeType.Object || 
            child.type === ParseNodeType.Array ||
            child.type === ParseNodeType.Literal ||
            child.type === ParseNodeType.Identifier ||
            child.type === ParseNodeType.FunctionCall ||
            child.type === ParseNodeType.MemberAccess ||
            child.type === ParseNodeType.ArrayAccess) {
          // Build the expression directly
          const element = this.build(child);
          if (element instanceof Expression) {
            elements.push(element);
          }
        } else if (child.children && child.children.length > 0 && child.type === ParseNodeType.Token) {
          // Only recursively search in Token containers
          this.collectElements(child, elements);
        } else if (child.type !== ParseNodeType.Token) {
          // Only build non-Token nodes that weren't handled above
          const element = this.build(child);
          if (element instanceof Expression) {
            elements.push(element);
          }
        }
      }
    }
  }

  private buildMemberAccess(node: ParseNode): MemberAccess {
    // Postfix member access structure: [object_expression, property_identifier]
    // This is created by the postfix buildMemberAccess function in grammar.ts
    
    if (node.children.length !== 2) {
      throw new Error(`MemberAccess expects 2 children (object, property), got ${node.children.length}`);
    }
    
    const objectNode = node.children[0];
    const propertyNode = node.children[1];
    
    if (propertyNode.type !== ParseNodeType.Identifier) {
      throw new Error('MemberAccess property must be an identifier');
    }
    
    const object = this.build(objectNode) as Expression;
    const property = this.build(propertyNode) as Identifier;
    
    return new MemberAccess(object, property);
  }

  private buildArrayAccess(node: ParseNode): ArrayAccess {
    // Postfix array access structure: [object_expression, index_expression]
    // This is created by the postfix buildArrayAccess function in grammar.ts
    
    if (node.children.length !== 2) {
      throw new Error(`ArrayAccess expects 2 children (object, index), got ${node.children.length}`);
    }
    
    const objectNode = node.children[0];
    const indexNode = node.children[1];
    
    const object = this.build(objectNode) as Expression;
    const index = this.build(indexNode) as Expression;
    
    return new ArrayAccess(object, index);
  }
}

// Utility function to build AST from parse tree
export function buildAST(parseTree: ParseNode): ASTNode {
  const builder = new ASTBuilder();
  return builder.build(parseTree);
}