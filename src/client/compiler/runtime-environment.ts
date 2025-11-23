import { 
  ASTNode, 
  Expression
} from './ast';
import { Type } from './type-checker-types';

// Environment binding - stores value, expression, and optional type information
export interface EnvironmentBinding {
  value?: Expression;
  expression?: Expression;
  type?: Type;
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

// Interface for accessing interpreter functionality from environment
export interface InterpreterInterface {
  getBindingValue(binding: EnvironmentBinding): Expression;
}

// Runtime environment for variable bindings
export class RuntimeEnvironment {
  private bindings = new Map<string, EnvironmentBinding>();
  private parent?: RuntimeEnvironment;

  constructor(parent?: RuntimeEnvironment) {
    this.parent = parent;
  }

  define(name: string, value?: Expression, expression?: Expression, type?: Type): void {
    this.bindings.set(name, { value, expression, type });
  }

  getParent(): RuntimeEnvironment | undefined {
    return this.parent;
  }

  get(name: string, interpreter: InterpreterInterface): Expression {
    const binding = this.bindings.get(name);
    if (binding !== undefined) {
      return interpreter.getBindingValue(binding);
    }

    if (this.parent) {
      return this.parent.get(name, interpreter);
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

  set(name: string, value: Expression, expression?: Expression, type?: Type): void {
    if (this.bindings.has(name)) {
      const existingBinding = this.bindings.get(name)!;
      this.bindings.set(name, { value, expression, type: type || existingBinding.type });
      return;
    }
    
    if (this.parent) {
      try {
        this.parent.set(name, value, expression, type);
        return;
      } catch (e) {
        // If parent doesn't have it, define it here
      }
    }
    
    this.bindings.set(name, { value, expression, type });
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

  getAllBindings(interpreter: InterpreterInterface): Map<string, Expression> {
    const result = new Map(this.parent?.getAllBindings(interpreter) || []);
    for (const [key, binding] of this.bindings) {
      result.set(key, interpreter.getBindingValue(binding));
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

  // Type-related methods for static analysis
  defineType(name: string, type: Type, expression: Expression): void {
    const existing = this.bindings.get(name);
    this.bindings.set(name, { ...existing, type, expression });
  }

  lookupType(name: string): Type | undefined {
    const binding = this.bindings.get(name);
    if (binding?.type) return binding.type;
    return this.parent?.lookupType(name);
  }

  getAllTypes(): Map<string, Type> {
    const result = new Map(this.parent?.getAllTypes() || []);
    for (const [key, binding] of this.bindings) {
      if (binding.type) {
        result.set(key, binding.type);
      }
    }
    return result;
  }
}