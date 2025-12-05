// Type system definitions - separate file to avoid circular imports

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

  // Get array method types
  getMethodType(methodName: string): Type | undefined {
    switch (methodName) {
      case 'add':
      case 'push':
        // add/push takes an element and returns the array length (number)
        return new FunctionType([this.elementType], NUMBER_TYPE);
      case 'pop':
        // pop returns the element type or undefined
        return new FunctionType([], this.elementType);
      case 'removeAt':
        // removeAt takes an index (number) and returns the element type
        return new FunctionType([NUMBER_TYPE], this.elementType);
      case 'length':
        return NUMBER_TYPE;
      default:
        return undefined;
    }
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

// Type variable for generic types (e.g., T, U)
export class TypeVariable extends Type {
  readonly typeName = 'typevar';

  constructor(public readonly name: string) {
    super();
  }

  equals(other: Type): boolean {
    return other instanceof TypeVariable && other.name === this.name;
  }

  toString(): string {
    return this.name;
  }
}

// Generic function type - will be instantiated with concrete types when used
export class GenericFunctionType extends Type {
  readonly typeName = 'generic-function';

  constructor(
    public readonly typeParameters: TypeVariable[],
    public readonly parameterTypes: Type[],
    public readonly returnType: Type
  ) {
    super();
  }

  equals(other: Type): boolean {
    if (!(other instanceof GenericFunctionType)) return false;
    
    if (this.typeParameters.length !== other.typeParameters.length) return false;
    if (this.parameterTypes.length !== other.parameterTypes.length) return false;
    
    for (let i = 0; i < this.typeParameters.length; i++) {
      if (!this.typeParameters[i].equals(other.typeParameters[i])) return false;
    }
    
    for (let i = 0; i < this.parameterTypes.length; i++) {
      if (!this.parameterTypes[i].equals(other.parameterTypes[i])) return false;
    }
    
    return this.returnType.equals(other.returnType);
  }

  toString(): string {
    const typeParams = this.typeParameters.map(t => t.toString()).join(', ');
    const params = this.parameterTypes.map(t => t.toString()).join(', ');
    return `<${typeParams}>(${params}) => ${this.returnType.toString()}`;
  }

  // Instantiate the generic type with concrete type arguments
  instantiate(typeArguments: Type[]): FunctionType {
    if (typeArguments.length !== this.typeParameters.length) {
      throw new Error(`Expected ${this.typeParameters.length} type arguments, got ${typeArguments.length}`);
    }

    const substitution = new Map<string, Type>();
    for (let i = 0; i < this.typeParameters.length; i++) {
      substitution.set(this.typeParameters[i].name, typeArguments[i]);
    }

    const instantiatedParams = this.parameterTypes.map(t => this.substituteType(t, substitution));
    const instantiatedReturn = this.substituteType(this.returnType, substitution);

    return new FunctionType(instantiatedParams, instantiatedReturn);
  }

  private substituteType(type: Type, substitution: Map<string, Type>): Type {
    if (type instanceof TypeVariable) {
      return substitution.get(type.name) ?? type;
    }
    if (type instanceof ArrayType) {
      return new ArrayType(this.substituteType(type.elementType, substitution));
    }
    if (type instanceof FunctionType) {
      const params = type.parameterTypes.map(t => this.substituteType(t, substitution));
      const returnType = this.substituteType(type.returnType, substitution);
      return new FunctionType(params, returnType);
    }
    return type;
  }
}

// Type constraint for unification
export class TypeConstraint {
  constructor(
    public readonly left: Type,
    public readonly right: Type,
    public readonly description: string = ""
  ) {}

  toString(): string {
    return `${this.left.toString()} ~ ${this.right.toString()}${this.description ? ` (${this.description})` : ''}`;
  }
}

// Type substitution map for unification
export type TypeSubstitution = Map<string, Type>;

// Fresh type variable generator
export class TypeVariableGenerator {
  private counter = 0;

  fresh(prefix: string = 'T'): TypeVariable {
    return new TypeVariable(`${prefix}${this.counter++}`);
  }

  reset(): void {
    this.counter = 0;
  }
}

// Unification algorithm
export class Unifier {
  static unify(constraints: TypeConstraint[]): TypeSubstitution | null {
    const substitution: TypeSubstitution = new Map();

    for (const constraint of constraints) {
      const left = Unifier.applySubstitution(constraint.left, substitution);
      const right = Unifier.applySubstitution(constraint.right, substitution);

      const result = Unifier.unifyTypes(left, right);
      if (!result) {
        return null; // Unification failed
      }

      // Merge the new substitution
      for (const [varName, type] of result) {
        const substitutedType = Unifier.applySubstitution(type, substitution);
        substitution.set(varName, substitutedType);
      }

      // Apply new substitutions to existing ones
      for (const [existingVar, existingType] of substitution) {
        substitution.set(existingVar, Unifier.applySubstitution(existingType, result));
      }
    }

    return substitution;
  }

  private static unifyTypes(type1: Type, type2: Type): TypeSubstitution | null {
    const substitution: TypeSubstitution = new Map();

    // If types are identical, no substitution needed
    if (type1.equals(type2)) {
      return substitution;
    }

    // If either is a type variable, bind it
    if (type1 instanceof TypeVariable) {
      if (Unifier.occursCheck(type1.name, type2)) {
        return null; // Infinite type
      }
      substitution.set(type1.name, type2);
      return substitution;
    }

    if (type2 instanceof TypeVariable) {
      if (Unifier.occursCheck(type2.name, type1)) {
        return null; // Infinite type
      }
      substitution.set(type2.name, type1);
      return substitution;
    }

    // Unify array types
    if (type1 instanceof ArrayType && type2 instanceof ArrayType) {
      return Unifier.unifyTypes(type1.elementType, type2.elementType);
    }

    // Unify function types
    if (type1 instanceof FunctionType && type2 instanceof FunctionType) {
      if (type1.parameterTypes.length !== type2.parameterTypes.length) {
        return null; // Different arity
      }

      const constraints: TypeConstraint[] = [];
      
      // Unify parameter types
      for (let i = 0; i < type1.parameterTypes.length; i++) {
        constraints.push(new TypeConstraint(type1.parameterTypes[i], type2.parameterTypes[i]));
      }
      
      // Unify return types
      constraints.push(new TypeConstraint(type1.returnType, type2.returnType));

      return Unifier.unify(constraints);
    }

    // Unify object types
    if (type1 instanceof ObjectType && type2 instanceof ObjectType) {
      const constraints: TypeConstraint[] = [];
      
      // For structural compatibility, we need all properties of both types to match
      const allProps = new Set([...type1.properties.keys(), ...type2.properties.keys()]);
      
      for (const propName of allProps) {
        const prop1 = type1.properties.get(propName);
        const prop2 = type2.properties.get(propName);
        
        if (prop1 && prop2) {
          // Both have the property, unify their types
          constraints.push(new TypeConstraint(prop1, prop2));
        } else if (prop1 || prop2) {
          // Only one has the property - this is fine for structural subtyping
          // The type variable will be unified with the object that has more properties
          continue;
        }
      }
      
      return Unifier.unify(constraints);
    }

    // Types cannot be unified
    return null;
  }

  private static occursCheck(varName: string, type: Type): boolean {
    if (type instanceof TypeVariable) {
      return type.name === varName;
    }
    if (type instanceof ArrayType) {
      return Unifier.occursCheck(varName, type.elementType);
    }
    if (type instanceof FunctionType) {
      return type.parameterTypes.some(t => Unifier.occursCheck(varName, t)) ||
             Unifier.occursCheck(varName, type.returnType);
    }
    if (type instanceof ObjectType) {
      return Array.from(type.properties.values()).some(t => Unifier.occursCheck(varName, t));
    }
    return false;
  }

  static applySubstitution(type: Type, substitution: TypeSubstitution): Type {
    if (type instanceof TypeVariable) {
      const substituted = substitution.get(type.name);
      return substituted ? Unifier.applySubstitution(substituted, substitution) : type;
    }
    if (type instanceof ArrayType) {
      return new ArrayType(Unifier.applySubstitution(type.elementType, substitution));
    }
    if (type instanceof FunctionType) {
      const params = type.parameterTypes.map(t => Unifier.applySubstitution(t, substitution));
      const returnType = Unifier.applySubstitution(type.returnType, substitution);
      return new FunctionType(params, returnType);
    }
    if (type instanceof ObjectType) {
      const newProps = new Map<string, Type>();
      for (const [key, propType] of type.properties) {
        newProps.set(key, Unifier.applySubstitution(propType, substitution));
      }
      return new ObjectType(newProps);
    }
    return type;
  }
}

// Built-in types
export const NUMBER_TYPE = new PrimitiveType('number');
export const STRING_TYPE = new PrimitiveType('string');
export const BOOLEAN_TYPE = new PrimitiveType('boolean');
export const NULL_TYPE = new PrimitiveType('null');
export const DOM_NODE_TYPE = new PrimitiveType('DOMNode');
export const UNKNOWN_TYPE = new UnknownType();