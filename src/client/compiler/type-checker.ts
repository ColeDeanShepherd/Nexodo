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
  ArrayAccess,
  Program
} from './ast';
import { RuntimeEnvironment } from './runtime-environment';
import { 
  Type, 
  PrimitiveType, 
  ObjectType, 
  ArrayType, 
  FunctionType, 
  UnknownType, 
  NUMBER_TYPE, 
  STRING_TYPE, 
  BOOLEAN_TYPE, 
  NULL_TYPE, 
  DOM_NODE_TYPE, 
  UNKNOWN_TYPE 
} from './type-checker-types';

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

// Type checker and semantic analyzer
export class TypeChecker {
  private environment: RuntimeEnvironment;
  private errors: SemanticError[] = [];

  constructor(globalEnvironment: RuntimeEnvironment) {
    this.environment = globalEnvironment;
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
      case 'DOMNode':
        return DOM_NODE_TYPE;
      case 'ObjectLiteral':
        return this.checkObjectLiteral(node as ObjectLiteral);
      case 'ArrayLiteral':
        return this.checkArrayLiteral(node as ArrayLiteral);
      case 'FunctionCall':
        return this.checkFunctionCall(node as FunctionCall);
      case 'MemberAccess':
        return this.checkMemberAccess(node as MemberAccess);
      case 'ArrayAccess':
        return this.checkArrayAccess(node as ArrayAccess);
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

    // If assignment target is an identifier, define the variable
    if ((node as any).target && (node as any).target.nodeType === 'Identifier') {
      const identifier = (node as any).target as Identifier;
        this.environment.defineType(identifier.name, valueType, node.value);
      return valueType;
    }

    // If assignment target is a member access, update the object's property type
    if ((node as any).target && (node as any).target.nodeType === 'MemberAccess') {
      const member = (node as any).target as MemberAccess;
      const objectType = this.checkNode(member.object);

      if (!(objectType instanceof ObjectType)) {
        this.error(`Cannot assign property on non-object type: ${objectType.toString()}`, node as any);
        return UNKNOWN_TYPE;
      }

      const propName = member.property.name;
      // Add or update the property type on the object
      objectType.properties.set(propName, valueType);
      return valueType;
    }

    // If assignment target is an array access, validate the array and index types
    if ((node as any).target && (node as any).target.nodeType === 'ArrayAccess') {
      const arrayAccess = (node as any).target as ArrayAccess;
      const objectType = this.checkNode(arrayAccess.object);
      const indexType = this.checkNode(arrayAccess.index);

      if (!(objectType instanceof ArrayType)) {
        this.error(`Cannot assign to non-array type: ${objectType.toString()}`, node as any);
        return UNKNOWN_TYPE;
      }

      if (!indexType.equals(NUMBER_TYPE)) {
        this.error(`Array index must be a number, got ${indexType.toString()}`, node as any);
        return UNKNOWN_TYPE;
      }

      // Check if the value type is assignable to the array's element type
      if (!this.isAssignable(valueType, objectType.elementType) && 
          !this.isAssignable(objectType.elementType, UNKNOWN_TYPE)) {
        this.error(
          `Cannot assign ${valueType.toString()} to array of ${objectType.elementType.toString()}`,
          node as any
        );
      }

      return valueType;
    }

    this.error('Invalid assignment target', node as any);
    return UNKNOWN_TYPE;
  }

  private checkIdentifier(node: Identifier): Type {
    const type = this.environment.lookupType(node.name);
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
      // Empty array - create a flexible array that can accept any element type
      return new ArrayType(UNKNOWN_TYPE);
    }
    
    // Check all elements and find common type
    const elementTypes = node.elements.map(element => this.checkNode(element));
    const firstType = elementTypes[0];
    
    // Check if all elements have the same type
    const allSameType = elementTypes.every(type => type.equals(firstType));
    
    if (!allSameType) {
      // Mixed types - use unknown element type for flexibility
      return new ArrayType(UNKNOWN_TYPE);
    }
    
    return new ArrayType(firstType);
  }

  private checkFunctionCall(node: FunctionCall): Type {
    // Special handling for delete function - validate the reference type
    if (node.callee.nodeType === 'Identifier' && (node.callee as Identifier).name === 'delete') {
      return this.checkDelete(node);
    }
    
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

  private checkDelete(node: FunctionCall): Type {
    if (node.args.length !== 1) {
      this.error('delete expects exactly 1 argument', node as any);
      return NULL_TYPE;
    }
    
    const target = node.args[0];
    
    // Validate that the argument is a deletable reference
    if (target.nodeType === 'Identifier') {
      // Check if variable exists
      const type = this.environment.lookupType((target as Identifier).name);
      if (!type) {
        this.error(`Variable '${(target as Identifier).name}' not found`, target as any);
      }
      return NULL_TYPE;
    }
    
    if (target.nodeType === 'MemberAccess') {
      // Just check that the object exists and is an object type
      const member = target as MemberAccess;
      const objectType = this.checkNode(member.object);
      if (!(objectType instanceof ObjectType)) {
        this.error('Cannot delete property from non-object type', target as any);
      }
      return NULL_TYPE;
    }
    
    if (target.nodeType === 'ArrayAccess') {
      // Check that it's an array and index is a number
      const arrayAccess = target as ArrayAccess;
      const objectType = this.checkNode(arrayAccess.object);
      const indexType = this.checkNode(arrayAccess.index);
      
      if (!(objectType instanceof ArrayType)) {
        this.error('Cannot delete from non-array type', target as any);
      }
      
      if (!indexType.equals(NUMBER_TYPE)) {
        this.error('Array index must be a number', target as any);
      }
      
      return NULL_TYPE;
    }
    
    this.error('delete expects an identifier, object property, or array element', target as any);
    return NULL_TYPE;
  }

  private checkMemberAccess(node: MemberAccess): Type {
    const objectType = this.checkNode(node.object);
    
    // Handle array methods
    if (objectType instanceof ArrayType) {
      const methodType = objectType.getMethodType(node.property.name);
      if (methodType) {
        return methodType;
      }
      this.error(`Property '${node.property.name}' does not exist on array type`, node as any);
      return UNKNOWN_TYPE;
    }
    
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

  private checkArrayAccess(node: ArrayAccess): Type {
    const objectType = this.checkNode(node.object);
    const indexType = this.checkNode(node.index);
    
    // Check if object is an array
    if (!(objectType instanceof ArrayType)) {
      this.error(`Cannot index non-array type: ${objectType.toString()}`, node as any);
      return UNKNOWN_TYPE;
    }
    
    // Check if index is a number
    if (!indexType.equals(NUMBER_TYPE)) {
      this.error(`Array index must be a number, got ${indexType.toString()}`, node as any);
      return UNKNOWN_TYPE;
    }
    
    // Return the element type of the array
    return objectType.elementType;
  }

  private isAssignable(from: Type, to: Type): boolean {
    // Simple type compatibility - can be extended for more complex rules
    if (from.equals(to)) return true;
    if (to instanceof UnknownType) return true;
    return false;
  }

  getEnvironment(): RuntimeEnvironment {
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