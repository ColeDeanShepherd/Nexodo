import { 
  ASTNode, 
  Expression, 
  Assignment, 
  Identifier, 
  NumberLiteral, 
  StringLiteral, 
  BooleanLiteral, 
  NullLiteral,
  ObjectLiteral,
  ObjectProperty,
  ArrayLiteral,
  FunctionCall,
  MemberAccess,
  Program
} from './ast';

// Type system
export abstract class Type {
  abstract readonly typeName: string;
  abstract equals(other: Type): boolean;
  abstract toString(): string;
}

export class PrimitiveType extends Type {
  constructor(public readonly typeName: string) {
    super();
  }

  equals(other: Type): boolean {
    return other instanceof PrimitiveType && other.typeName === this.typeName;
  }

  toString(): string {
    return this.typeName;
  }
}

export class ObjectType extends Type {
  readonly typeName = 'object';

  constructor(public readonly properties: Map<string, Type>) {
    super();
  }

  equals(other: Type): boolean {
    if (!(other instanceof ObjectType)) return false;
    
    if (this.properties.size !== other.properties.size) return false;
    
    for (const [key, type] of this.properties) {
      const otherType = other.properties.get(key);
      if (!otherType || !type.equals(otherType)) return false;
    }
    
    return true;
  }

  toString(): string {
    const props = Array.from(this.properties.entries())
      .map(([key, type]) => `${key}: ${type.toString()}`)
      .join(', ');
    return `{ ${props} }`;
  }
}

export class ArrayType extends Type {
  readonly typeName = 'array';

  constructor(public readonly elementType: Type) {
    super();
  }

  equals(other: Type): boolean {
    return other instanceof ArrayType && this.elementType.equals(other.elementType);
  }

  toString(): string {
    return `${this.elementType.toString()}[]`;
  }
}

export class FunctionType extends Type {
  readonly typeName = 'function';

  constructor(
    public readonly parameterTypes: Type[],
    public readonly returnType: Type
  ) {
    super();
  }

  equals(other: Type): boolean {
    if (!(other instanceof FunctionType)) return false;
    
    if (this.parameterTypes.length !== other.parameterTypes.length) return false;
    
    for (let i = 0; i < this.parameterTypes.length; i++) {
      if (!this.parameterTypes[i].equals(other.parameterTypes[i])) return false;
    }
    
    return this.returnType.equals(other.returnType);
  }

  toString(): string {
    const params = this.parameterTypes.map(t => t.toString()).join(', ');
    return `(${params}) => ${this.returnType.toString()}`;
  }
}

export class UnknownType extends Type {
  readonly typeName = 'unknown';

  equals(other: Type): boolean {
    return other instanceof UnknownType;
  }

  toString(): string {
    return 'unknown';
  }
}

// Built-in types
export const NUMBER_TYPE = new PrimitiveType('number');
export const STRING_TYPE = new PrimitiveType('string');
export const BOOLEAN_TYPE = new PrimitiveType('boolean');
export const NULL_TYPE = new PrimitiveType('null');
export const UNKNOWN_TYPE = new UnknownType();

// Semantic analysis errors
export class SemanticError extends Error {
  constructor(
    message: string,
    public readonly node?: ASTNode
  ) {
    super(message);
    this.name = 'SemanticError';
  }
}

// Symbol table for variable bindings
export class Environment {
  private bindings = new Map<string, Type>();
  private parent?: Environment;

  constructor(parent?: Environment) {
    this.parent = parent;
  }

  define(name: string, type: Type): void {
    this.bindings.set(name, type);
  }

  lookup(name: string): Type | undefined {
    const type = this.bindings.get(name);
    if (type) return type;
    return this.parent?.lookup(name);
  }

  createChild(): Environment {
    return new Environment(this);
  }

  getAllBindings(): Map<string, Type> {
    const result = new Map(this.parent?.getAllBindings() || []);
    for (const [key, value] of this.bindings) {
      result.set(key, value);
    }
    return result;
  }
}

// Type checker and semantic analyzer
export class TypeChecker {
  private environment: Environment;
  private errors: SemanticError[] = [];

  constructor(globalEnvironment?: Environment) {
    this.environment = globalEnvironment || this.createBuiltinEnvironment();
  }

  private createBuiltinEnvironment(): Environment {
    const env = new Environment();
    
    // Built-in functions
    env.define('console', new ObjectType(new Map([
      ['log', new FunctionType([UNKNOWN_TYPE], NULL_TYPE)]
    ])));
    
    env.define('Math', new ObjectType(new Map([
      ['abs', new FunctionType([NUMBER_TYPE], NUMBER_TYPE)],
      ['max', new FunctionType([NUMBER_TYPE, NUMBER_TYPE], NUMBER_TYPE)],
      ['min', new FunctionType([NUMBER_TYPE, NUMBER_TYPE], NUMBER_TYPE)],
      ['PI', NUMBER_TYPE]
    ])));
    
    return env;
  }

  analyze(node: ASTNode): { type: Type; errors: SemanticError[] } {
    this.errors = [];
    const type = this.checkNode(node);
    return { type, errors: [...this.errors] };
  }

  private error(message: string, node?: ASTNode): void {
    this.errors.push(new SemanticError(message, node));
  }

  private checkNode(node: ASTNode): Type {
    switch (node.nodeType) {
      case 'Program':
        return this.checkProgram(node as Program);
      case 'Assignment':
        return this.checkAssignment(node as Assignment);
      case 'Identifier':
        return this.checkIdentifier(node as Identifier);
      case 'NumberLiteral':
        return NUMBER_TYPE;
      case 'StringLiteral':
        return STRING_TYPE;
      case 'BooleanLiteral':
        return BOOLEAN_TYPE;
      case 'NullLiteral':
        return NULL_TYPE;
      case 'ObjectLiteral':
        return this.checkObjectLiteral(node as ObjectLiteral);
      case 'ArrayLiteral':
        return this.checkArrayLiteral(node as ArrayLiteral);
      case 'FunctionCall':
        return this.checkFunctionCall(node as FunctionCall);
      case 'MemberAccess':
        return this.checkMemberAccess(node as MemberAccess);
      default:
        this.error(`Unknown node type: ${node.nodeType}`, node);
        return UNKNOWN_TYPE;
    }
  }

  private checkProgram(node: Program): Type {
    let lastType: Type = NULL_TYPE;
    
    for (const statement of node.statements) {
      lastType = this.checkNode(statement);
    }
    
    return lastType;
  }

  private checkAssignment(node: Assignment): Type {
    const valueType = this.checkNode(node.value);
    
    // Define the variable in the current environment
    this.environment.define(node.identifier.name, valueType);
    
    return valueType;
  }

  private checkIdentifier(node: Identifier): Type {
    const type = this.environment.lookup(node.name);
    if (!type) {
      this.error(`Undefined variable: ${node.name}`, node);
      return UNKNOWN_TYPE;
    }
    return type;
  }

  private checkObjectLiteral(node: ObjectLiteral): Type {
    const properties = new Map<string, Type>();
    
    for (const prop of node.properties) {
      const key = typeof prop.key === 'string' ? prop.key : 
                  prop.key instanceof StringLiteral ? prop.key.value :
                  prop.key instanceof Identifier ? prop.key.name :
                  'unknown';
      
      if (key === 'unknown') {
        this.error('Object property key must be a string or identifier', prop as any);
        continue;
      }
      
      const valueType = this.checkNode(prop.value);
      properties.set(key, valueType);
    }
    
    return new ObjectType(properties);
  }

  private checkArrayLiteral(node: ArrayLiteral): Type {
    if (node.elements.length === 0) {
      // Empty array - assume unknown element type for now
      return new ArrayType(UNKNOWN_TYPE);
    }
    
    // Check all elements and find common type
    const elementTypes = node.elements.map(element => this.checkNode(element));
    const firstType = elementTypes[0];
    
    // Check if all elements have the same type
    const allSameType = elementTypes.every(type => type.equals(firstType));
    
    if (!allSameType) {
      this.error('Array elements must have the same type', node as any);
      return new ArrayType(UNKNOWN_TYPE);
    }
    
    return new ArrayType(firstType);
  }

  private checkFunctionCall(node: FunctionCall): Type {
    const calleeType = this.checkNode(node.callee);
    
    if (!(calleeType instanceof FunctionType)) {
      this.error(`Cannot call non-function type: ${calleeType.toString()}`, node as any);
      return UNKNOWN_TYPE;
    }
    
    // Check argument count
    if (node.args.length !== calleeType.parameterTypes.length) {
      this.error(
        `Function expects ${calleeType.parameterTypes.length} arguments, got ${node.args.length}`,
        node as any
      );
      return calleeType.returnType;
    }
    
    // Check argument types
    for (let i = 0; i < node.args.length; i++) {
      const argType = this.checkNode(node.args[i]);
      const expectedType = calleeType.parameterTypes[i];
      
      if (!this.isAssignable(argType, expectedType)) {
        this.error(
          `Argument ${i + 1}: expected ${expectedType.toString()}, got ${argType.toString()}`,
          node.args[i] as any
        );
      }
    }
    
    return calleeType.returnType;
  }

  private checkMemberAccess(node: MemberAccess): Type {
    const objectType = this.checkNode(node.object);
    
    if (!(objectType instanceof ObjectType)) {
      this.error(`Cannot access property of non-object type: ${objectType.toString()}`, node as any);
      return UNKNOWN_TYPE;
    }
    
    const propertyType = objectType.properties.get(node.property.name);
    if (!propertyType) {
      this.error(`Property '${node.property.name}' does not exist on type ${objectType.toString()}`, node as any);
      return UNKNOWN_TYPE;
    }
    
    return propertyType;
  }

  private isAssignable(from: Type, to: Type): boolean {
    // Simple type compatibility - can be extended for more complex rules
    if (from.equals(to)) return true;
    if (to instanceof UnknownType) return true;
    return false;
  }

  getEnvironment(): Environment {
    return this.environment;
  }
}

// Utility functions
export function formatTypeError(error: SemanticError): string {
  return `Type Error: ${error.message}`;
}

export function formatType(type: Type): string {
  return type.toString();
}

// Usage example:
// const typeChecker = new TypeChecker();
// const result = typeChecker.analyze(ast);
// if (result.errors.length > 0) {
//   console.log('Type errors:', result.errors.map(formatTypeError));
// }
// console.log('Result type:', formatType(result.type));