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
  GroupedExpression,
  Program,
  LambdaExpression,
  Parameter
} from './ast';
import { RuntimeEnvironment } from './runtime-environment';
import { 
  Type, 
  PrimitiveType, 
  ObjectType, 
  ArrayType, 
  FunctionType, 
  UnknownType, 
  GenericFunctionType,
  TypeVariable,
  TypeConstraint,
  TypeSubstitution,
  TypeVariableGenerator,
  Unifier,
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
  private typeVarGenerator: TypeVariableGenerator = new TypeVariableGenerator();
  private constraints: TypeConstraint[] = [];

  constructor(globalEnvironment: RuntimeEnvironment) {
    this.environment = globalEnvironment;
  }

  analyze(node: ASTNode): { type: Type; errors: SemanticError[] } {
    this.errors = [];
    this.constraints = [];
    this.typeVarGenerator.reset();
    
    const type = this.checkNode(node);
    
    // Solve constraints through unification
    if (this.constraints.length > 0) {
      const substitution = Unifier.unify(this.constraints);
      if (substitution) {
        const finalType = Unifier.applySubstitution(type, substitution);
        return { type: finalType, errors: [...this.errors] };
      } else {
        this.error('Type inference failed: unable to unify constraints');
        return { type, errors: [...this.errors] };
      }
    }
    
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
      case 'GroupedExpression':
        return this.checkGroupedExpression(node as any);
      case 'LambdaExpression':
        return this.checkLambdaExpression(node as any);
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

  private checkGroupedExpression(node: GroupedExpression): Type {
    // Simply infer the type of the inner expression
    return this.checkNode(node.expression);
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
    
    // Handle generic functions by inferring type arguments and instantiating
    if (calleeType instanceof GenericFunctionType) {
      return this.checkGenericFunctionCall(node, calleeType);
    }
    
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
    
    // Check argument types and add constraints for type inference
    for (let i = 0; i < node.args.length; i++) {
      const argType = this.checkNode(node.args[i]);
      const expectedType = calleeType.parameterTypes[i];
      
      // Add constraint for unification instead of checking assignability directly
      this.constraints.push(new TypeConstraint(
        argType, 
        expectedType, 
        `Function call argument ${i + 1}`
      ));
    }
    
    return calleeType.returnType;
  }

  private checkGenericFunctionCall(node: FunctionCall, genericType: GenericFunctionType): Type {
    // Check argument count first
    if (node.args.length !== genericType.parameterTypes.length) {
      this.error(
        `Function expects ${genericType.parameterTypes.length} arguments, got ${node.args.length}`,
        node as any
      );
      return UNKNOWN_TYPE;
    }

    // For generic functions, create fresh type variables for generic parameters
    // and add constraints instead of trying to immediately infer
    const freshTypeArgs = genericType.typeParameters.map(tv => 
      this.typeVarGenerator.fresh(tv.name.replace('T', 'G'))
    );
    
    // Instantiate with fresh type variables
    const instantiatedType = genericType.instantiate(freshTypeArgs);
    
    // Check argument types and add constraints
    const argTypes = node.args.map(arg => this.checkNode(arg));
    for (let i = 0; i < node.args.length; i++) {
      const argType = argTypes[i];
      const expectedType = instantiatedType.parameterTypes[i];
      
      // Add constraint for unification instead of checking assignability directly
      this.constraints.push(new TypeConstraint(
        argType, 
        expectedType, 
        `Generic function call argument ${i + 1}`
      ));
    }
    
    return instantiatedType.returnType;
  }

  private inferTypeArguments(genericType: GenericFunctionType, argTypes: Type[]): { 
    success: boolean; 
    typeArguments?: Type[];
    conflictingVariable?: string;
    type1?: Type;
    type2?: Type;
  } {
    // Build a map from type variable names to inferred types
    const typeMap = new Map<string, Type>();
    
    // Try to infer type arguments by matching actual argument types with parameter types
    for (let i = 0; i < argTypes.length; i++) {
      const argType = argTypes[i];
      const paramType = genericType.parameterTypes[i];
      
      const unifyResult = this.unifyTypes(paramType, argType, typeMap);
      if (!unifyResult.success) {
        return {
          success: false,
          conflictingVariable: unifyResult.conflictingVariable,
          type1: unifyResult.type1,
          type2: unifyResult.type2
        };
      }
    }
    
    // Extract type arguments in the order of type parameters
    const typeArguments: Type[] = [];
    for (const typeParam of genericType.typeParameters) {
      const inferredType = typeMap.get(typeParam.name);
      if (!inferredType) {
        // Could not infer this type parameter
        return { success: false };
      }
      typeArguments.push(inferredType);
    }
    
    return { success: true, typeArguments };
  }

  private unifyTypes(pattern: Type, concrete: Type, typeMap: Map<string, Type>): {
    success: boolean;
    conflictingVariable?: string;
    type1?: Type;
    type2?: Type;
  } {
    // If pattern is a type variable, try to bind it
    if (pattern instanceof TypeVariable) {
      const existing = typeMap.get(pattern.name);
      if (existing) {
        // Type variable already bound, check if it matches
        if (!existing.equals(concrete)) {
          return {
            success: false,
            conflictingVariable: pattern.name,
            type1: existing,
            type2: concrete
          };
        }
        return { success: true };
      } else {
        // Bind the type variable
        typeMap.set(pattern.name, concrete);
        return { success: true };
      }
    }
    
    // If pattern is an array type, concrete must also be an array type
    if (pattern instanceof ArrayType) {
      if (!(concrete instanceof ArrayType)) {
        return { success: false };
      }
      return this.unifyTypes(pattern.elementType, concrete.elementType, typeMap);
    }
    
    // If pattern is a function type, concrete must also be a function type
    if (pattern instanceof FunctionType) {
      if (!(concrete instanceof FunctionType)) {
        return { success: false };
      }
      if (pattern.parameterTypes.length !== concrete.parameterTypes.length) {
        return { success: false };
      }
      for (let i = 0; i < pattern.parameterTypes.length; i++) {
        const result = this.unifyTypes(pattern.parameterTypes[i], concrete.parameterTypes[i], typeMap);
        if (!result.success) {
          return result;
        }
      }
      return this.unifyTypes(pattern.returnType, concrete.returnType, typeMap);
    }
    
    // For other types, they must be equal
    if (!pattern.equals(concrete)) {
      return { success: false };
    }
    return { success: true };
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
    
    // Handle type variables - create constraint for object with property
    if (objectType instanceof TypeVariable) {
      // Generate a fresh type variable for the property type
      const propertyType = this.typeVarGenerator.fresh('Prop');
      
      // Create an object type with the required property
      const requiredObjectType = new ObjectType(new Map([[node.property.name, propertyType]]));
      
      // Add constraint that the object must be at least this object type
      this.constraints.push(new TypeConstraint(
        objectType,
        requiredObjectType,
        `Property access: ${node.property.name}`
      ));
      
      return propertyType;
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

  private checkLambdaExpression(node: LambdaExpression): Type {
    // Create a new scope for the lambda parameters
    const lambdaEnv = new RuntimeEnvironment(this.environment);
    const savedEnv = this.environment;
    this.environment = lambdaEnv;

    // Add parameters to the lambda's environment
    const paramTypes: Type[] = [];
    for (const param of node.parameters) {
      let paramType: Type;
      if (param.type) {
        // Explicit type annotation
        paramType = param.type;
      } else {
        // Generate a fresh type variable for inference
        paramType = this.typeVarGenerator.fresh('P'); // Parameter type variable
      }
      paramTypes.push(paramType);
      // Define the parameter in the lambda's environment
      lambdaEnv.defineType(param.name, paramType, node);
    }

    // Check the body expression in the lambda's environment
    const returnType = this.checkNode(node.body);

    // Restore the original environment
    this.environment = savedEnv;

    // Return a function type
    return new FunctionType(paramTypes, returnType);
  }

  private isAssignable(from: Type, to: Type): boolean {
    // Simple type compatibility - can be extended for more complex rules
    if (from.equals(to)) return true;
    if (to instanceof UnknownType) return true;
    
    // Allow empty arrays (unknown[]) to be assigned to any array type
    if (from instanceof ArrayType && to instanceof ArrayType) {
      // If 'from' is an unknown array (empty array), it can be assigned to any array type
      if (from.elementType instanceof UnknownType) return true;
      // Otherwise, check if element types are assignable
      return this.isAssignable(from.elementType, to.elementType);
    }
    
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