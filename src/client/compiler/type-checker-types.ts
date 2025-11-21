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

// Built-in types
export const NUMBER_TYPE = new PrimitiveType('number');
export const STRING_TYPE = new PrimitiveType('string');
export const BOOLEAN_TYPE = new PrimitiveType('boolean');
export const NULL_TYPE = new PrimitiveType('null');
export const DOM_NODE_TYPE = new PrimitiveType('DOMNode');
export const UNKNOWN_TYPE = new UnknownType();