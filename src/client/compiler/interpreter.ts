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

// Runtime values
export type RuntimeValue = 
  | number 
  | string 
  | boolean 
  | null 
  | RuntimeObject 
  | RuntimeArray 
  | RuntimeFunction
  | Expression;

export interface RuntimeObject {
  [key: string]: RuntimeValue;
}

export interface RuntimeArray extends Array<RuntimeValue> {}

export interface RuntimeFunction {
  (...args: RuntimeValue[]): RuntimeValue;
}

// Environment binding - stores both value and optional expression
export interface EnvironmentBinding {
  value: RuntimeValue;
  expression?: Expression;
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
  private bindings = new Map<string, EnvironmentBinding>();
  private parent?: RuntimeEnvironment;

  constructor(parent?: RuntimeEnvironment) {
    this.parent = parent;
  }

  define(name: string, value: RuntimeValue, expression?: Expression): void {
    this.bindings.set(name, { value, expression });
  }

  get(name: string): RuntimeValue {
    const binding = this.bindings.get(name);
    if (binding !== undefined) return binding.value;
    
    if (this.parent) {
      return this.parent.get(name);
    }
    
    throw new RuntimeError(`Undefined variable: ${name}`);
  }

  getBinding(name: string): EnvironmentBinding | undefined {
    const binding = this.bindings.get(name);
    if (binding !== undefined) return binding;
    
    if (this.parent) {
      return this.parent.getBinding(name);
    }
    
    return undefined;
  }

  set(name: string, value: RuntimeValue, expression?: Expression): void {
    if (this.bindings.has(name)) {
      this.bindings.set(name, { value, expression });
      return;
    }
    
    if (this.parent) {
      try {
        this.parent.set(name, value, expression);
        return;
      } catch (e) {
        // If parent doesn't have it, define it here
      }
    }
    
    this.bindings.set(name, { value, expression });
  }

  delete(name: string): boolean {
    if (this.bindings.has(name)) {
      this.bindings.delete(name);
      return true;
    }
    
    if (this.parent) {
      return this.parent.delete(name);
    }
    
    return false;
  }

  createChild(): RuntimeEnvironment {
    return new RuntimeEnvironment(this);
  }

  getAllBindings(): Map<string, RuntimeValue> {
    const result = new Map(this.parent?.getAllBindings() || []);
    for (const [key, binding] of this.bindings) {
      result.set(key, binding.value);
    }
    return result;
  }

  getAllBindingsWithExpressions(): Map<string, EnvironmentBinding> {
    const result = new Map(this.parent?.getAllBindingsWithExpressions() || []);
    for (const [key, binding] of this.bindings) {
      result.set(key, binding);
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
    
    // Built-in delete function (special - argument not evaluated)
    env.define('delete', '__DELETE_BUILTIN__' as any);
    
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
      case 'ArrayAccess':
        return this.evaluateArrayAccess(node as ArrayAccess);
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
    // Always evaluate the expression to get the runtime value
    const value = this.evaluateNode(node.value);
    
    // If target is an identifier
    if (node.target.nodeType === 'Identifier') {
      const identifier = node.target as Identifier;
      // Store both the evaluated value and the original expression
      this.environment.set(identifier.name, value, node.value);
      // Re-evaluate all other bindings since they might depend on this one
      this.reevaluateAllBindings();
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
    // Special handling for delete function - don't evaluate the argument
    if (node.callee.nodeType === 'Identifier' && (node.callee as Identifier).name === 'delete') {
      return this.handleDelete(node);
    }
    
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

  private handleDelete(node: FunctionCall): RuntimeValue {
    if (node.args.length !== 1) {
      throw new RuntimeError('delete expects exactly 1 argument', node);
    }
    
    const target = node.args[0];
    
    // Handle delete(identifier) - delete variable from environment
    if (target.nodeType === 'Identifier') {
      const identifier = target as Identifier;
      const deleted = this.environment.delete(identifier.name);
      if (!deleted) {
        throw new RuntimeError(`Variable '${identifier.name}' not found`, target);
      }
      return null;
    }
    
    // Handle delete(obj.property) - delete object property
    if (target.nodeType === 'MemberAccess') {
      const member = target as MemberAccess;
      const object = this.evaluateNode(member.object);
      
      if (object === null || object === undefined) {
        throw new RuntimeError('Cannot delete property of null or undefined', target);
      }
      
      if (typeof object !== 'object') {
        throw new RuntimeError('Cannot delete property of non-object value', target);
      }
      
      const propertyName = member.property.name;
      delete (object as any)[propertyName];
      return null;
    }
    
    // Handle delete(arr[index]) - delete array element
    if (target.nodeType === 'ArrayAccess') {
      const arrayAccess = target as ArrayAccess;
      const object = this.evaluateNode(arrayAccess.object);
      const index = this.evaluateNode(arrayAccess.index);
      
      if (!Array.isArray(object)) {
        throw new RuntimeError('Cannot delete index from non-array value', target);
      }
      
      if (typeof index !== 'number') {
        throw new RuntimeError('Array index must be a number', target);
      }
      
      const array = object as RuntimeArray;
      const actualIndex = index < 0 ? array.length + index : index;
      
      if (actualIndex < 0 || actualIndex >= array.length) {
        throw new RuntimeError(`Array index ${index} out of bounds for array of length ${array.length}`, target);
      }
      
      // Use splice to remove the element
      array.splice(actualIndex, 1);
      return null;
    }
    
    throw new RuntimeError('delete expects an identifier, object property, or array element', target);
  }

  private evaluateMemberAccess(node: MemberAccess, allowUndefined: boolean = false): RuntimeValue {
    const object = this.evaluateNode(node.object);
    
    if (object === null || object === undefined) {
      throw new RuntimeError('Cannot access property of null or undefined', node);
    }
    
    // Handle array methods
    if (Array.isArray(object)) {
      const propertyName = node.property.name;
      
      switch (propertyName) {
        case 'add':
        case 'push':
          return (...items: RuntimeValue[]) => {
            (object as RuntimeArray).push(...items);
            return object.length;
          };
        case 'pop':
          return () => {
            const result = (object as RuntimeArray).pop();
            return result !== undefined ? result : null;
          };
        case 'length':
          return object.length;
        default:
          // Check if it's a native array method
          const nativeMethod = (object as any)[propertyName];
          if (typeof nativeMethod === 'function') {
            return nativeMethod.bind(object);
          }
          if (!allowUndefined) {
            throw new RuntimeError(`Property '${propertyName}' does not exist on array`, node);
          }
          return null;
      }
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

  private evaluateArrayAccess(node: ArrayAccess): RuntimeValue {
    const object = this.evaluateNode(node.object);
    const index = this.evaluateNode(node.index);
    
    // Check if object is an array
    if (!Array.isArray(object)) {
      throw new RuntimeError(`Cannot index non-array value: ${typeof object}`, node);
    }
    
    // Check if index is a number
    if (typeof index !== 'number') {
      throw new RuntimeError(`Array index must be a number, got ${typeof index}`, node);
    }
    
    // Check if index is within bounds (allow negative indices for Python-like behavior)
    const array = object as RuntimeArray;
    const actualIndex = index < 0 ? array.length + index : index;
    
    if (actualIndex < 0 || actualIndex >= array.length) {
      throw new RuntimeError(`Array index ${index} out of bounds for array of length ${array.length}`, node);
    }
    
    return array[actualIndex];
  }

  private valueToString(value: RuntimeValue): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'function') return '[Function]';
    if (value instanceof Expression) {
      return this.expressionToCode(value);
    }
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

  private expressionToCode(expr: Expression): string {
    switch (expr.nodeType) {
      case 'NumberLiteral':
        return (expr as NumberLiteral).value.toString();
      
      case 'StringLiteral':
        return `"${(expr as StringLiteral).value}"`;
      
      case 'BooleanLiteral':
        return (expr as BooleanLiteral).value.toString();
      
      case 'NullLiteral':
        return 'null';
      
      case 'Identifier':
        return (expr as Identifier).name;
      
      case 'ArrayLiteral': {
        const node = expr as ArrayLiteral;
        const elements = node.elements.map(elem => this.expressionToCode(elem)).join(', ');
        return `[${elements}]`;
      }
      
      case 'ObjectLiteral': {
        const node = expr as ObjectLiteral;
        const props = node.properties.map(prop => {
          const key = typeof prop.key === 'string' 
            ? prop.key 
            : this.expressionToCode(prop.key as Expression);
          const value = this.expressionToCode(prop.value);
          return `${key}: ${value}`;
        }).join(', ');
        return `{ ${props} }`;
      }
      
      case 'FunctionCall': {
        const node = expr as FunctionCall;
        const callee = this.expressionToCode(node.callee);
        const args = node.args.map(arg => this.expressionToCode(arg)).join(', ');
        return `${callee}(${args})`;
      }
      
      case 'MemberAccess': {
        const node = expr as MemberAccess;
        const object = this.expressionToCode(node.object);
        const property = this.expressionToCode(node.property);
        return `${object}.${property}`;
      }
      
      case 'ArrayAccess': {
        const node = expr as ArrayAccess;
        const object = this.expressionToCode(node.object);
        const index = this.expressionToCode(node.index);
        return `${object}[${index}]`;
      }
      
      default:
        return `[Unknown: ${expr.nodeType}]`;
    }
  }

  getEnvironment(): RuntimeEnvironment {
    return this.environment;
  }

  getOutput(): string[] {
    return [...this.output];
  }

  // Re-evaluate all bindings that have expressions
  reevaluateAllBindings(): void {
    const allBindings = this.environment.getAllBindingsWithExpressions();
    
    for (const [name, binding] of allBindings) {
      // If this binding has an expression, re-evaluate it
      if (binding.expression) {
        try {
          const newValue = this.evaluateNode(binding.expression);
          this.environment.set(name, newValue, binding.expression);
        } catch (error) {
          // If evaluation fails, keep the old value
          console.warn(`Failed to re-evaluate binding '${name}':`, error);
        }
      }
    }
  }

  // Save user-defined bindings to serializable format
  saveEnvironment(): Record<string, any> {
    const userBindings = this.getUserDefinedBindings();
    // Prefer expressions over values when available for serialization
    const valueMap = new Map<string, RuntimeValue>();
    for (const [name, binding] of userBindings) {
      // If we have the original expression, serialize that instead of the evaluated value
      valueMap.set(name, binding.expression || binding.value);
    }
    return this.serializeBindings(valueMap);
  }

  // Load user-defined bindings from serialized format
  loadEnvironment(serializedBindings: Record<string, any>): void {
    const deserializedBindings = this.deserializeBindings(serializedBindings);
    
    // Apply the loaded bindings to current environment
    for (const [name, value] of deserializedBindings) {
      // If the value is an Expression (unevaluated), evaluate it and store both
      if (value instanceof Expression) {
        const evaluatedValue = this.evaluateNode(value);
        this.environment.define(name, evaluatedValue, value);
      } else {
        // For evaluated values, store without an expression
        this.environment.define(name, value);
      }
    }
  }

  // Get only user-defined bindings (exclude built-ins like console, Math)
  getUserDefinedBindings(): Map<string, EnvironmentBinding> {
    const builtins = new Set(['console', 'Math']);
    const allBindingsWithExpressions = this.environment.getAllBindingsWithExpressions();
    const userBindings = new Map<string, EnvironmentBinding>();

    for (const [name, binding] of allBindingsWithExpressions) {
      if (!builtins.has(name)) {
        userBindings.set(name, binding);
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

    // Check if it's an Expression (AST node) before checking Array
    // because Expression objects may have properties
    if (value instanceof Expression) {
      return {
        type: 'expression',
        value: this.serializeExpression(value)
      };
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

  private serializeExpression(expr: Expression): any {
    const nodeType = expr.nodeType;
    const result: any = { nodeType };

    switch (nodeType) {
      case 'NumberLiteral': {
        const node = expr as NumberLiteral;
        result.value = node.value;
        break;
      }
      case 'StringLiteral': {
        const node = expr as StringLiteral;
        result.value = node.value;
        break;
      }
      case 'BooleanLiteral': {
        const node = expr as BooleanLiteral;
        result.value = node.value;
        break;
      }
      case 'NullLiteral':
        // No additional properties needed
        break;
      case 'Identifier': {
        const node = expr as Identifier;
        result.name = node.name;
        break;
      }
      case 'ObjectLiteral': {
        const node = expr as ObjectLiteral;
        result.properties = node.properties.map(prop => ({
          key: typeof prop.key === 'string' ? prop.key : this.serializeExpression(prop.key as Expression),
          value: this.serializeExpression(prop.value)
        }));
        break;
      }
      case 'ArrayLiteral': {
        const node = expr as ArrayLiteral;
        result.elements = node.elements.map(elem => this.serializeExpression(elem));
        break;
      }
      case 'FunctionCall': {
        const node = expr as FunctionCall;
        result.callee = this.serializeExpression(node.callee);
        result.args = node.args.map(arg => this.serializeExpression(arg));
        break;
      }
      case 'MemberAccess': {
        const node = expr as MemberAccess;
        result.object = this.serializeExpression(node.object);
        result.property = this.serializeExpression(node.property);
        break;
      }
      case 'ArrayAccess': {
        const node = expr as ArrayAccess;
        result.object = this.serializeExpression(node.object);
        result.index = this.serializeExpression(node.index);
        break;
      }
      default:
        throw new Error(`Unsupported expression type for serialization: ${nodeType}`);
    }

    return result;
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

      case 'expression':
        return this.deserializeExpression(serialized.value);

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

  private deserializeExpression(serialized: any): Expression {
    if (!serialized || !serialized.nodeType) {
      throw new Error('Invalid serialized expression: missing nodeType');
    }

    const nodeType = serialized.nodeType;
    // Create a dummy token for deserialized nodes
    const dummyToken: any = { type: 'DESERIALIZED', value: '', line: 0, column: 0 };

    switch (nodeType) {
      case 'NumberLiteral':
        return new NumberLiteral(serialized.value, dummyToken);

      case 'StringLiteral':
        return new StringLiteral(serialized.value, dummyToken);

      case 'BooleanLiteral':
        return new BooleanLiteral(serialized.value, dummyToken);

      case 'NullLiteral':
        return new NullLiteral(dummyToken);

      case 'Identifier':
        return new Identifier(serialized.name, dummyToken);

      case 'ObjectLiteral': {
        const properties = serialized.properties.map((prop: any) => {
          const key = typeof prop.key === 'string' ? prop.key : this.deserializeExpression(prop.key);
          const value = this.deserializeExpression(prop.value);
          return new ObjectProperty(key, value);
        });
        return new ObjectLiteral(properties);
      }

      case 'ArrayLiteral': {
        const elements = serialized.elements.map((elem: any) => this.deserializeExpression(elem));
        return new ArrayLiteral(elements);
      }

      case 'FunctionCall': {
        const callee = this.deserializeExpression(serialized.callee);
        const args = serialized.args.map((arg: any) => this.deserializeExpression(arg));
        return new FunctionCall(callee, args);
      }

      case 'MemberAccess': {
        const object = this.deserializeExpression(serialized.object);
        const property = this.deserializeExpression(serialized.property) as Identifier;
        return new MemberAccess(object, property);
      }

      case 'ArrayAccess': {
        const object = this.deserializeExpression(serialized.object);
        const index = this.deserializeExpression(serialized.index);
        return new ArrayAccess(object, index);
      }

      default:
        throw new Error(`Unsupported expression type for deserialization: ${nodeType}`);
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
  
  if (value instanceof Expression) {
    return expressionToCode(value);
  }
  
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

export function expressionToCode(expr: Expression): string {
  switch (expr.nodeType) {
    case 'NumberLiteral':
      return (expr as NumberLiteral).value.toString();
    
    case 'StringLiteral':
      return `"${(expr as StringLiteral).value}"`;
    
    case 'BooleanLiteral':
      return (expr as BooleanLiteral).value.toString();
    
    case 'NullLiteral':
      return 'null';
    
    case 'Identifier':
      return (expr as Identifier).name;
    
    case 'ArrayLiteral': {
      const node = expr as ArrayLiteral;
      const elements = node.elements.map(elem => expressionToCode(elem)).join(', ');
      return `[${elements}]`;
    }
    
    case 'ObjectLiteral': {
      const node = expr as ObjectLiteral;
      const props = node.properties.map(prop => {
        const key = typeof prop.key === 'string' 
          ? prop.key 
          : expressionToCode(prop.key as Expression);
        const value = expressionToCode(prop.value);
        return `${key}: ${value}`;
      }).join(', ');
      return `{ ${props} }`;
    }
    
    case 'FunctionCall': {
      const node = expr as FunctionCall;
      const callee = expressionToCode(node.callee);
      const args = node.args.map(arg => expressionToCode(arg)).join(', ');
      return `${callee}(${args})`;
    }
    
    case 'MemberAccess': {
      const node = expr as MemberAccess;
      const object = expressionToCode(node.object);
      const property = expressionToCode(node.property);
      return `${object}.${property}`;
    }
    
    case 'ArrayAccess': {
      const node = expr as ArrayAccess;
      const object = expressionToCode(node.object);
      const index = expressionToCode(node.index);
      return `${object}[${index}]`;
    }
    
    default:
      return `[Unknown: ${expr.nodeType}]`;
  }
}

export function formatRuntimeError(error: RuntimeError): string {
  return `Runtime Error: ${error.message}`;
}
