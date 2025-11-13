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

// Runtime values
export type RuntimeValue = 
  | number 
  | string 
  | boolean 
  | null 
  | RuntimeObject 
  | RuntimeArray 
  | RuntimeFunction;

export interface RuntimeObject {
  [key: string]: RuntimeValue;
}

export interface RuntimeArray extends Array<RuntimeValue> {}

export interface RuntimeFunction {
  (...args: RuntimeValue[]): RuntimeValue;
}

// Runtime errors
export class RuntimeError extends Error {
  constructor(
    message: string,
    public readonly node?: ASTNode
  ) {
    super(message);
    this.name = 'RuntimeError';
  }
}

// Runtime environment for variable bindings
export class RuntimeEnvironment {
  private bindings = new Map<string, RuntimeValue>();
  private parent?: RuntimeEnvironment;

  constructor(parent?: RuntimeEnvironment) {
    this.parent = parent;
  }

  define(name: string, value: RuntimeValue): void {
    this.bindings.set(name, value);
  }

  get(name: string): RuntimeValue {
    const value = this.bindings.get(name);
    if (value !== undefined) return value;
    
    if (this.parent) {
      return this.parent.get(name);
    }
    
    throw new RuntimeError(`Undefined variable: ${name}`);
  }

  set(name: string, value: RuntimeValue): void {
    if (this.bindings.has(name)) {
      this.bindings.set(name, value);
      return;
    }
    
    if (this.parent) {
      try {
        this.parent.set(name, value);
        return;
      } catch (e) {
        // If parent doesn't have it, define it here
      }
    }
    
    this.bindings.set(name, value);
  }

  createChild(): RuntimeEnvironment {
    return new RuntimeEnvironment(this);
  }

  getAllBindings(): Map<string, RuntimeValue> {
    const result = new Map(this.parent?.getAllBindings() || []);
    for (const [key, value] of this.bindings) {
      result.set(key, value);
    }
    return result;
  }
}

// Interpreter
export class Interpreter {
  private environment: RuntimeEnvironment;
  private output: string[] = [];

  constructor(globalEnvironment?: RuntimeEnvironment) {
    this.environment = globalEnvironment || this.createBuiltinEnvironment();
  }

  private createBuiltinEnvironment(): RuntimeEnvironment {
    const env = new RuntimeEnvironment();
    
    // Built-in console object
    const consoleObj: RuntimeObject = {
      log: (...args: RuntimeValue[]) => {
        const message = args.map(arg => this.valueToString(arg)).join(' ');
        this.output.push(message);
        return null;
      }
    };
    
    // Built-in Math object
    const mathObj: RuntimeObject = {
      abs: (x: RuntimeValue) => {
        if (typeof x !== 'number') {
          throw new RuntimeError('Math.abs expects a number');
        }
        return Math.abs(x);
      },
      max: (a: RuntimeValue, b: RuntimeValue) => {
        if (typeof a !== 'number' || typeof b !== 'number') {
          throw new RuntimeError('Math.max expects numbers');
        }
        return Math.max(a, b);
      },
      min: (a: RuntimeValue, b: RuntimeValue) => {
        if (typeof a !== 'number' || typeof b !== 'number') {
          throw new RuntimeError('Math.min expects numbers');
        }
        return Math.min(a, b);
      },
      PI: Math.PI
    };
    
    env.define('console', consoleObj);
    env.define('Math', mathObj);
    
    return env;
  }

  interpret(node: ASTNode): { value: RuntimeValue; output: string[]; errors: RuntimeError[] } {
    this.output = [];
    const errors: RuntimeError[] = [];
    
    try {
      const value = this.evaluateNode(node);
      return { value, output: [...this.output], errors };
    } catch (error) {
      if (error instanceof RuntimeError) {
        errors.push(error);
      } else {
        errors.push(new RuntimeError(error instanceof Error ? error.message : String(error)));
      }
      return { value: null, output: [...this.output], errors };
    }
  }

  private evaluateNode(node: ASTNode): RuntimeValue {
    switch (node.nodeType) {
      case 'Program':
        return this.evaluateProgram(node as Program);
      case 'Assignment':
        return this.evaluateAssignment(node as Assignment);
      case 'Identifier':
        return this.evaluateIdentifier(node as Identifier);
      case 'NumberLiteral':
        return (node as NumberLiteral).value;
      case 'StringLiteral':
        return (node as StringLiteral).value;
      case 'BooleanLiteral':
        return (node as BooleanLiteral).value;
      case 'NullLiteral':
        return null;
      case 'ObjectLiteral':
        return this.evaluateObjectLiteral(node as ObjectLiteral);
      case 'ArrayLiteral':
        return this.evaluateArrayLiteral(node as ArrayLiteral);
      case 'FunctionCall':
        return this.evaluateFunctionCall(node as FunctionCall);
      case 'MemberAccess':
        return this.evaluateMemberAccess(node as MemberAccess);
      default:
        throw new RuntimeError(`Unknown node type: ${node.nodeType}`, node);
    }
  }

  private evaluateProgram(node: Program): RuntimeValue {
    let lastValue: RuntimeValue = null;
    
    for (const statement of node.statements) {
      lastValue = this.evaluateNode(statement);
    }
    
    return lastValue;
  }

  private evaluateAssignment(node: Assignment): RuntimeValue {
    const value = this.evaluateNode(node.value);
    
    // If target is an identifier
    if (node.target.nodeType === 'Identifier') {
      const identifier = node.target as Identifier;
      this.environment.set(identifier.name, value);
      return value;
    }

    // If target is member access
    if (node.target.nodeType === 'MemberAccess') {
      const member = node.target as MemberAccess;
      
      // For assignment, we need to be more careful about evaluating the object
      // If the object itself is a member access, we need to allow undefined properties
      let obj: RuntimeValue;
      if (member.object.nodeType === 'MemberAccess') {
        obj = this.evaluateMemberAccess(member.object as MemberAccess, true);
      } else {
        obj = this.evaluateNode(member.object);
      }

      if (obj === null || obj === undefined) {
        throw new RuntimeError('Cannot set property on null or undefined', node);
      }
      if (typeof obj !== 'object') {
        throw new RuntimeError('Cannot set property on non-object value', node);
      }

      const propName = member.property.name;
      (obj as any)[propName] = value;
      return value;
    }

    throw new RuntimeError('Invalid assignment target', node);
  }

  private evaluateIdentifier(node: Identifier): RuntimeValue {
    return this.environment.get(node.name);
  }

  private evaluateObjectLiteral(node: ObjectLiteral): RuntimeObject {
    const obj: RuntimeObject = {};
    
    for (const prop of node.properties) {
      const key = this.getPropertyKey(prop);
      const value = this.evaluateNode(prop.value);
      obj[key] = value;
    }
    
    return obj;
  }

  private getPropertyKey(prop: ObjectProperty): string {
    if (typeof prop.key === 'string') {
      return prop.key;
    }
    
    if (prop.key instanceof Identifier) {
      return prop.key.name;
    }
    
    if (prop.key instanceof StringLiteral) {
      return prop.key.value;
    }
    
    // Evaluate the key expression
    const keyValue = this.evaluateNode(prop.key);
    if (typeof keyValue === 'string') {
      return keyValue;
    }
    
    throw new RuntimeError('Object property key must be a string');
  }

  private evaluateArrayLiteral(node: ArrayLiteral): RuntimeArray {
    return node.elements.map(element => this.evaluateNode(element));
  }

  private evaluateFunctionCall(node: FunctionCall): RuntimeValue {
    const callee = this.evaluateNode(node.callee);
    
    if (typeof callee !== 'function') {
      throw new RuntimeError(`Cannot call non-function value: ${typeof callee}`, node);
    }
    
    const args = node.args.map(arg => this.evaluateNode(arg));
    
    try {
      return callee(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new RuntimeError(`Function call error: ${message}`, node);
    }
  }

  private evaluateMemberAccess(node: MemberAccess, allowUndefined: boolean = false): RuntimeValue {
    const object = this.evaluateNode(node.object);
    
    if (object === null || object === undefined) {
      throw new RuntimeError('Cannot access property of null or undefined', node);
    }
    
    if (typeof object !== 'object') {
      throw new RuntimeError(`Cannot access property of ${typeof object}`, node);
    }
    
    const propertyName = node.property.name;
    const value = (object as any)[propertyName];
    
    if (value === undefined && !allowUndefined) {
      throw new RuntimeError(`Property '${propertyName}' does not exist`, node);
    }
    
    return value;
  }

  private valueToString(value: RuntimeValue): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'function') return '[Function]';
    if (Array.isArray(value)) {
      return '[' + value.map(v => this.valueToString(v)).join(', ') + ']';
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value)
        .map(([key, val]) => `${key}: ${this.valueToString(val)}`)
        .join(', ');
      return `{ ${entries} }`;
    }
    return String(value);
  }

  getEnvironment(): RuntimeEnvironment {
    return this.environment;
  }

  getOutput(): string[] {
    return [...this.output];
  }

  // Save user-defined bindings to server API (excluding built-ins)
  async saveEnvironmentToStorage(): Promise<void> {
    const userBindings = this.getUserDefinedBindings();
    const serializedBindings = this.serializeBindings(userBindings);
    
    try {
      const response = await fetch('/api/db/value', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: JSON.stringify(serializedBindings) }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save environment: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to save environment to server:', error);
      throw error;
    }
  }

  // Load user-defined bindings from server API
  async loadEnvironmentFromStorage(): Promise<void> {
    try {
      const response = await fetch('/api/db/value');
      
      if (response.status === 404) {
        // No saved environment exists yet
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to load environment: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const serializedBindings = JSON.parse(data.value);
      const deserializedBindings = this.deserializeBindings(serializedBindings);
      
      // Apply the loaded bindings to current environment
      for (const [name, value] of deserializedBindings) {
        this.environment.define(name, value);
      }
    } catch (error) {
      console.warn('Failed to load environment from server:', error);
      throw error;
    }
  }

  // Get only user-defined bindings (exclude built-ins like console, Math)
  private getUserDefinedBindings(): Map<string, RuntimeValue> {
    const builtins = new Set(['console', 'Math']);
    const allBindings = this.environment.getAllBindings();
    const userBindings = new Map<string, RuntimeValue>();

    for (const [name, value] of allBindings) {
      if (!builtins.has(name)) {
        userBindings.set(name, value);
      }
    }

    return userBindings;
  }

  // Serialize runtime values to JSON-compatible format
  private serializeBindings(bindings: Map<string, RuntimeValue>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [name, value] of bindings) {
      result[name] = this.serializeValue(value);
    }

    return result;
  }

  private serializeValue(value: RuntimeValue): any {
    if (value === null || value === undefined) {
      return { type: 'null', value: null };
    }

    if (typeof value === 'number') {
      return { type: 'number', value };
    }

    if (typeof value === 'string') {
      return { type: 'string', value };
    }

    if (typeof value === 'boolean') {
      return { type: 'boolean', value };
    }

    if (typeof value === 'function') {
      // Functions cannot be serialized, skip them
      return { type: 'function', value: '[Function - not serializable]' };
    }

    if (Array.isArray(value)) {
      return {
        type: 'array',
        value: value.map(item => this.serializeValue(item))
      };
    }

    if (typeof value === 'object') {
      const serializedObj: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        serializedObj[key] = this.serializeValue(val);
      }
      return {
        type: 'object',
        value: serializedObj
      };
    }

    return { type: 'unknown', value: String(value) };
  }

  // Deserialize JSON data back to runtime values
  private deserializeBindings(serializedBindings: Record<string, any>): Map<string, RuntimeValue> {
    const bindings = new Map<string, RuntimeValue>();

    for (const [name, serializedValue] of Object.entries(serializedBindings)) {
      const value = this.deserializeValue(serializedValue);
      bindings.set(name, value);
    }

    return bindings;
  }

  private deserializeValue(serialized: any): RuntimeValue {
    if (!serialized || typeof serialized !== 'object' || !serialized.type) {
      return null;
    }

    switch (serialized.type) {
      case 'null':
        return null;

      case 'number':
        return typeof serialized.value === 'number' ? serialized.value : 0;

      case 'string':
        return typeof serialized.value === 'string' ? serialized.value : '';

      case 'boolean':
        return Boolean(serialized.value);

      case 'function':
        // Functions cannot be deserialized, return null
        return null;

      case 'array':
        if (Array.isArray(serialized.value)) {
          return serialized.value.map((item: any) => this.deserializeValue(item));
        }
        return [];

      case 'object':
        if (serialized.value && typeof serialized.value === 'object') {
          const obj: RuntimeObject = {};
          for (const [key, val] of Object.entries(serialized.value)) {
            obj[key] = this.deserializeValue(val);
          }
          return obj;
        }
        return {};

      default:
        return null;
    }
  }
}

// Utility functions
export function formatRuntimeValue(value: RuntimeValue): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'function') return '[Function]';
  
  if (Array.isArray(value)) {
    const elements = value.map(formatRuntimeValue).join(', ');
    return `[${elements}]`;
  }
  
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, val]) => `${key}: ${formatRuntimeValue(val)}`)
      .join(', ');
    return `{ ${entries} }`;
  }
  
  return String(value);
}

export function formatRuntimeError(error: RuntimeError): string {
  return `Runtime Error: ${error.message}`;
}

// Usage example:
// const interpreter = new Interpreter();
// const result = interpreter.interpret(ast);
// console.log('Result:', formatRuntimeValue(result.value));
// if (result.errors.length > 0) {
//   console.log('Errors:', result.errors.map(formatRuntimeError));
// }