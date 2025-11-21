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
  Program,
  Function,
  Parameter,
  BuiltInCodeNode,
  DOMNode
} from './ast';
// Import Type from type-checker (avoiding circular dependency by importing just what we need)
import { Type, PrimitiveType, ObjectType, ArrayType, FunctionType, UnknownType, NUMBER_TYPE, STRING_TYPE, BOOLEAN_TYPE, NULL_TYPE, DOM_NODE_TYPE, UNKNOWN_TYPE } from './type-checker-types';
import { RuntimeEnvironment, EnvironmentBinding, RuntimeError, InterpreterInterface } from './runtime-environment';

// Interpreter
export class Interpreter implements InterpreterInterface {
  private environment: RuntimeEnvironment;
  private output: string[] = [];

  constructor(globalEnvironment?: RuntimeEnvironment) {
    this.environment = globalEnvironment || this.createBuiltinEnvironment();
  }

  private createBuiltinEnvironment(): RuntimeEnvironment {
    const env = new RuntimeEnvironment();
    const dummyToken: any = { type: 'BUILTIN', value: '', position: 0, line: 0, column: 0 };
    
    // Built-in console object
    const consoleObj = new ObjectLiteral([
      new ObjectProperty(
        'log',
        new Function(
          [new Parameter('message', STRING_TYPE)],
          [
            new BuiltInCodeNode(() => {
              const message = this.environment.get('message', this);
              const messageStr = this.expressionToCode(message);
              this.output.push(messageStr);
              return new NullLiteral();
            })
          ]
        )
      )
    ]);
    
    // Built-in Math object
    const mathObj = new ObjectLiteral([
      new ObjectProperty(
        'abs',
        new Function(
          [new Parameter('x', NUMBER_TYPE)], 
          [
            new BuiltInCodeNode(() => {
              const x = this.environment.get('x', this);
              if (x.nodeType !== 'NumberLiteral') {
                throw new RuntimeError(`Math.abs expects a number, got ${x.nodeType}`);
              }
              return new NumberLiteral(Math.abs((x as NumberLiteral).value), dummyToken);
            })
          ]
        )
      ),
      new ObjectProperty(
        'max',
        new Function(
          [new Parameter('a', NUMBER_TYPE), new Parameter('b', NUMBER_TYPE)],
          [
            new BuiltInCodeNode(() => {
              const a = this.environment.get('a', this);
              const b = this.environment.get('b', this);
              if (a.nodeType !== 'NumberLiteral' || b.nodeType !== 'NumberLiteral') {
                throw new RuntimeError(`Math.max expects numbers, got ${a.nodeType} and ${b.nodeType}`);
              }
              return new NumberLiteral(
                Math.max((a as NumberLiteral).value, (b as NumberLiteral).value),
                dummyToken
              );
            })
          ]
        )
      ),
      new ObjectProperty(
        'min',
        new Function(
          [new Parameter('a', NUMBER_TYPE), new Parameter('b', NUMBER_TYPE)],
          [
            new BuiltInCodeNode(() => {
              const a = this.environment.get('a', this);
              const b = this.environment.get('b', this);
              if (a.nodeType !== 'NumberLiteral' || b.nodeType !== 'NumberLiteral') {
                throw new RuntimeError(`Math.min expects numbers, got ${a.nodeType} and ${b.nodeType}`);
              }
              return new NumberLiteral(
                Math.min((a as NumberLiteral).value, (b as NumberLiteral).value),
                dummyToken
              );
            })
          ]
        )
      ),
      new ObjectProperty('PI', new NumberLiteral(Math.PI, dummyToken))
    ]);
    
    env.define('console', consoleObj, undefined, new ObjectType(new Map([
      ['log', new FunctionType([UNKNOWN_TYPE], NULL_TYPE)]
    ])));
    env.define('Math', mathObj, undefined, new ObjectType(new Map([
      ['abs', new FunctionType([NUMBER_TYPE], NUMBER_TYPE)],
      ['max', new FunctionType([NUMBER_TYPE, NUMBER_TYPE], NUMBER_TYPE)],
      ['min', new FunctionType([NUMBER_TYPE, NUMBER_TYPE], NUMBER_TYPE)],
      ['PI', NUMBER_TYPE]
    ])));
    
    // Built-in UI functions
    const uiHrFunc = new Function(
      [], // No parameters
      [
        new BuiltInCodeNode(() => {
          // Create an hr element using document.createElement
          return new DOMNode('hr');
        })
      ]
    );
    env.define('uiHr', uiHrFunc, undefined, new FunctionType([], DOM_NODE_TYPE));
    
    // Built-in delete function (special - argument not evaluated)
    env.define('delete', '__DELETE_BUILTIN__' as any, undefined, new FunctionType([UNKNOWN_TYPE], NULL_TYPE));
    
    return env;
  }

  interpret(node: ASTNode): { value: Expression; output: string[]; errors: RuntimeError[] } {
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
      return { value: new NullLiteral(), output: [...this.output], errors };
    }
  }

  public getBindingValue(binding: EnvironmentBinding): Expression {
    // Lazy evaluation: if value is undefined but expression exists, evaluate it now
    if (binding.value === undefined) {
      if (binding.expression === undefined) {
        throw new RuntimeError(`Undefined variable: TODONAME`);
      }

      binding.value = this.evaluateNode(binding.expression);
    }

    return binding.value;
  }

  public evaluateNode(node: ASTNode): Expression {
    switch (node.nodeType) {
      case 'Program':
        return this.evaluateProgram(node as Program);
      case 'Assignment':
        return this.evaluateAssignment(node as Assignment);
      case 'Identifier':
        return this.evaluateIdentifier(node as Identifier);
      case 'NumberLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'NullLiteral':
      case 'DOMNode':
      case 'ObjectLiteral':
      case 'ArrayLiteral':
        return node;
      case 'FunctionCall':
        return this.evaluateFunctionCall(node as FunctionCall);
      case 'MemberAccess':
        return this.evaluateMemberAccess(node as MemberAccess);
      case 'ArrayAccess':
        return this.evaluateArrayAccess(node as ArrayAccess);
      case 'BuiltInCodeNode':
        return (node as BuiltInCodeNode).fn();
      default:
        throw new RuntimeError(`Unknown node type: ${node.nodeType}`, node);
    }
  }

  private evaluateProgram(node: Program): Expression {
    let lastValue: Expression = new NullLiteral();
    
    for (const statement of node.statements) {
      lastValue = this.evaluateNode(statement);
    }
    
    return lastValue;
  }

  // Replace a sub-expression within a binding's expression by following a path through literals
  // pathThroughLiteral: An expression like `test`, `test.a`, `test[0]`, `test[1].b`, etc.
  // newSubExpr: The new expression to replace the final target with
  // Example: replaceSubExprInLiteral(`test[0].a`, `3`) where test = `[{ a: "hi" }]` 
  //          results in test = `[{ a: 3 }]`
  private replaceSubExprInLiteral(
    pathThroughLiteral: Expression,
    newSubExpr: Expression
  ): void {
    // Extract the root identifier and navigation path from the expression
    const { rootIdentifier, navigationPath } = this.extractNavigationPath(pathThroughLiteral);
    
    // Get the root binding
    const rootBinding = this.environment.getBinding(rootIdentifier);
    if (!rootBinding) {
      throw new RuntimeError(`Undefined variable: ${rootIdentifier}`);
    }
    
    if (!rootBinding.expression) {
      throw new RuntimeError(
        `Cannot replace sub-expression: '${rootIdentifier}' is not bound to a constant expression`
      );
    }
    
    // Navigate through the expression and replace the target
    const updatedExpression = this.navigateAndReplace(
      rootBinding.expression,
      navigationPath,
      newSubExpr,
      pathThroughLiteral
    );
    
    // Update the binding
    rootBinding.expression = updatedExpression;
    rootBinding.value = undefined;
    
    // Re-evaluate all bindings
    this.reevaluateAllBindings();
  }
  
  // Extract root identifier and navigation path from an expression
  // Returns: { rootIdentifier: string, navigationPath: Array<{type: 'member'|'index', key: string|number}> }
  private extractNavigationPath(expr: Expression): { 
    rootIdentifier: string; 
    navigationPath: Array<{ type: 'member' | 'index'; key: string | number }> 
  } {
    const path: Array<{ type: 'member' | 'index'; key: string | number }> = [];
    let current: Expression = expr;
    
    // Walk up the expression tree, building the path in reverse
    while (current.nodeType === 'MemberAccess' || current.nodeType === 'ArrayAccess') {
      if (current.nodeType === 'MemberAccess') {
        const memberNode = current as MemberAccess;
        path.unshift({ type: 'member', key: memberNode.property.name });
        current = memberNode.object;
      } else if (current.nodeType === 'ArrayAccess') {
        const arrayNode = current as ArrayAccess;
        
        // The index must be a number literal for this to be a valid literal path
        if (arrayNode.index.nodeType !== 'NumberLiteral') {
          throw new RuntimeError(
            `Array index must be a number literal in path, got ${arrayNode.index.nodeType}`
          );
        }
        
        const indexValue = (arrayNode.index as NumberLiteral).value;
        if (!Number.isInteger(indexValue)) {
          throw new RuntimeError(`Array index must be an integer, got ${indexValue}`);
        }
        
        path.unshift({ type: 'index', key: indexValue });
        current = arrayNode.object;
      }
    }
    
    // The root must be an identifier
    if (current.nodeType !== 'Identifier') {
      throw new RuntimeError(
        `Path must start with an identifier, got ${current.nodeType}`
      );
    }
    
    const rootIdentifier = (current as Identifier).name;
    return { rootIdentifier, navigationPath: path };
  }
  
  // Navigate through an expression following the path and replace the target
  private navigateAndReplace(
    expr: Expression,
    path: Array<{ type: 'member' | 'index'; key: string | number }>,
    newSubExpr: Expression,
    originalPathExpr: Expression
  ): Expression {
    // Base case: if path is empty, replace the entire expression
    if (path.length === 0) {
      return newSubExpr;
    }
    
    const [firstStep, ...restPath] = path;
    
    if (firstStep.type === 'member') {
      // Must be an object literal
      if (expr.nodeType !== 'ObjectLiteral') {
        throw new RuntimeError(
          `Cannot navigate through member '${firstStep.key}': expression is not a constant object literal (got ${expr.nodeType})`
        );
      }
      
      const objLiteral = expr as ObjectLiteral;
      const propertyName = firstStep.key as string;
      
      // Find the property
      let foundIndex = -1;
      for (let i = 0; i < objLiteral.properties.length; i++) {
        const prop = objLiteral.properties[i];
        const propKey = typeof prop.key === 'string' ? prop.key :
                        (prop.key instanceof Identifier ? prop.key.name : null);
        
        if (propKey === propertyName) {
          foundIndex = i;
          break;
        }
      }
      
      if (foundIndex < 0) {
        // If we're at the end of the path, we can add a new property
        if (restPath.length === 0) {
          const newProperties = [...objLiteral.properties];
          newProperties.push(new ObjectProperty(propertyName, newSubExpr));
          return new ObjectLiteral(newProperties);
        } else {
          throw new RuntimeError(
            `Property '${propertyName}' does not exist in constant object literal`
          );
        }
      }
      
      // Navigate deeper or replace
      const currentProp = objLiteral.properties[foundIndex];
      const updatedValue = this.navigateAndReplace(
        currentProp.value,
        restPath,
        newSubExpr,
        originalPathExpr
      );
      
      const newProperties = [...objLiteral.properties];
      newProperties[foundIndex] = new ObjectProperty(propertyName, updatedValue);
      return new ObjectLiteral(newProperties);
      
    } else if (firstStep.type === 'index') {
      // Must be an array literal
      if (expr.nodeType !== 'ArrayLiteral') {
        throw new RuntimeError(
          `Cannot navigate through index ${firstStep.key}: expression is not a constant array literal (got ${expr.nodeType})`
        );
      }
      
      const arrayLiteral = expr as ArrayLiteral;
      const index = firstStep.key as number;
      
      // Check bounds
      if (index < 0 || index >= arrayLiteral.elements.length) {
        throw new RuntimeError(
          `Array index ${index} out of bounds for array of length ${arrayLiteral.elements.length}`
        );
      }
      
      // Navigate deeper or replace
      const updatedElement = this.navigateAndReplace(
        arrayLiteral.elements[index],
        restPath,
        newSubExpr,
        originalPathExpr
      );
      
      const newElements = [...arrayLiteral.elements];
      newElements[index] = updatedElement;
      return new ArrayLiteral(newElements);
    }
    
    throw new RuntimeError(`Invalid navigation step type`);
  }

  private evaluateAssignment(node: Assignment): Expression {
    // Evaluate the value expression to get the runtime value
    const value = this.evaluateNode(node.value);
    
    // Use replaceSubExprInLiteral to update the binding expression
    // This handles both simple identifiers and complex paths (member/array access)
    this.replaceSubExprInLiteral(node.target, node.value);
    
    return value;
  }

  private evaluateIdentifier(node: Identifier): Expression {
    return this.environment.get(node.name, this);
  }

  private evaluateFunctionCall(node: FunctionCall): Expression {
    // Special handling for delete function - don't evaluate the argument
    if (node.callee.nodeType === 'Identifier' && (node.callee as Identifier).name === 'delete') {
      return this.handleDelete(node);
    }
    
    const callee = this.evaluateNode(node.callee);
    
    if (callee.nodeType !== 'Function') {
      throw new RuntimeError(`Cannot call non-function value: ${callee.nodeType}`, node);
    }
    
    const args = node.args.map(arg => this.evaluateNode(arg));
    const funcNode = callee as Function;

    // Push new environment for function call
    this.pushEnvironment();

    try {
      // Bind function parameters to arguments
      for (const [i, param] of funcNode.parameters.entries()) {
        const arg = args[i];
        this.environment.set(param.name, arg);
      }

      // Evaluate function body in new environment
      const result = this.evaluateBlock(funcNode.body);
      return result;
    } finally {
      // Always pop environment, even if an error occurred
      this.popEnvironment();
    }
  }

  private evaluateBlock(statements: ASTNode[]): Expression {
    let lastValue: Expression = new NullLiteral();

    for (const stmt of statements) {
      lastValue = this.evaluateNode(stmt);
    }

    return lastValue;
  }

  private handleDelete(node: FunctionCall): Expression {
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
      return new NullLiteral();
    }
    
    // Handle delete(obj.property) - delete object property
    if (target.nodeType === 'MemberAccess') {
      const member = target as MemberAccess;
      const object = this.evaluateNode(member.object);
      
      if (object.nodeType === 'NullLiteral') {
        throw new RuntimeError('Cannot delete property of null or undefined', target);
      }
      
      if (object.nodeType !== 'ObjectLiteral') {
        throw new RuntimeError('Cannot delete property of non-object value', target);
      }
      
      // For now, we can't modify the object in place since it's immutable
      // This would require tracking the identifier and updating the binding
      throw new RuntimeError('Delete on object properties not yet fully supported', target);
    }
    
    // Handle delete(arr[index]) - delete array element
    if (target.nodeType === 'ArrayAccess') {
      const arrayAccess = target as ArrayAccess;
      
      // Extract the root identifier and navigation path
      const { rootIdentifier, navigationPath } = this.extractNavigationPath(arrayAccess);
      
      // Get the root binding
      const rootBinding = this.environment.getBinding(rootIdentifier);
      if (!rootBinding || !rootBinding.expression) {
        throw new RuntimeError(
          `Cannot delete array element: '${rootIdentifier}' is not bound to a constant expression`,
          target
        );
      }
      
      // The path should end with an array index
      if (navigationPath.length === 0) {
        throw new RuntimeError('Invalid array access path for delete', target);
      }
      
      const lastStep = navigationPath[navigationPath.length - 1];
      if (lastStep.type !== 'index') {
        throw new RuntimeError('Delete target must be an array index', target);
      }
      
      // Navigate to the parent array and remove the element
      const parentPath = navigationPath.slice(0, -1);
      const indexToDelete = lastStep.key as number;
      
      // Navigate to the parent array expression
      let parentArray: Expression = rootBinding.expression;
      for (const step of parentPath) {
        if (step.type === 'member') {
          if (parentArray.nodeType !== 'ObjectLiteral') {
            throw new RuntimeError('Cannot navigate through non-object in delete path', target);
          }
          const objLiteral = parentArray as ObjectLiteral;
          const prop = objLiteral.properties.find(p => {
            const key = typeof p.key === 'string' ? p.key : (p.key as Identifier).name;
            return key === step.key;
          });
          if (!prop) {
            throw new RuntimeError(`Property '${step.key}' not found in delete path`, target);
          }
          parentArray = prop.value;
        } else if (step.type === 'index') {
          if (parentArray.nodeType !== 'ArrayLiteral') {
            throw new RuntimeError('Cannot navigate through non-array in delete path', target);
          }
          const arrayLiteral = parentArray as ArrayLiteral;
          const index = step.key as number;
          if (index < 0 || index >= arrayLiteral.elements.length) {
            throw new RuntimeError(`Array index ${index} out of bounds in delete path`, target);
          }
          parentArray = arrayLiteral.elements[index];
        }
      }
      
      // Verify the parent is an array
      if (parentArray.nodeType !== 'ArrayLiteral') {
        throw new RuntimeError('Delete target is not an array element', target);
      }
      
      const arrayLiteral = parentArray as ArrayLiteral;
      
      // Check bounds
      if (indexToDelete < 0 || indexToDelete >= arrayLiteral.elements.length) {
        throw new RuntimeError(
          `Array index ${indexToDelete} out of bounds for array of length ${arrayLiteral.elements.length}`,
          target
        );
      }
      
      // Create new array with element removed
      const newElements = arrayLiteral.elements.filter((_, i) => i !== indexToDelete);
      const newArray = new ArrayLiteral(newElements);
      
      // Update the binding by replacing the parent array
      if (parentPath.length === 0) {
        // We're deleting from the root array
        rootBinding.expression = newArray;
      } else {
        // We need to replace the parent array in the larger structure
        const updatedExpression = this.navigateAndReplace(
          rootBinding.expression,
          parentPath,
          newArray,
          arrayAccess
        );
        rootBinding.expression = updatedExpression;
      }
      
      // Clear cached value and re-evaluate
      rootBinding.value = undefined;
      this.reevaluateAllBindings();
      
      return new NullLiteral();
    }
    
    throw new RuntimeError('delete expects an identifier, object property, or array element', target);
  }

  private evaluateMemberAccess(node: MemberAccess, allowUndefined: boolean = false): Expression {
    const object = this.evaluateNode(node.object);
    
    if (object.nodeType === 'NullLiteral') {
      throw new RuntimeError('Cannot access property of null or undefined', node);
    }
    
    // Handle array methods
    if (object.nodeType === 'ArrayLiteral') {
      const propertyName = node.property.name;
      const arrayLiteral = object as ArrayLiteral;
      const dummyToken: any = { type: 'RUNTIME', value: '', position: 0, line: 0, column: 0 };
      
      switch (propertyName) {
        case 'length':
          return new NumberLiteral(arrayLiteral.elements.length, dummyToken);
        case 'add':
          return new Function(
            [new Parameter('element')],
            [
              new BuiltInCodeNode(() => {
                const element = this.environment.get('element', this);
                arrayLiteral.elements.push(element);
                return new NullLiteral();
                // const newElements = [...arrayLiteral.elements, element];
                // return new ArrayLiteral(newElements);
              })
            ]
          );
        case 'removeAt':
          return new Function(
            [new Parameter('index', NUMBER_TYPE)],
            [
              new BuiltInCodeNode(() => {
                const indexExpr = this.environment.get('index', this);
                if (indexExpr.nodeType !== 'NumberLiteral') {
                  throw new RuntimeError(`Index must be a number, got ${indexExpr.nodeType}`);
                }
                const index = (indexExpr as NumberLiteral).value;
                if (index < 0 || index >= arrayLiteral.elements.length) {
                  throw new RuntimeError(`Index ${index} out of bounds for array of length ${arrayLiteral.elements.length}`);
                }
                arrayLiteral.elements.splice(index, 1);
                return new NullLiteral();
                // const newElements = arrayLiteral.elements.filter((_, i) => i !== index);
                // return new ArrayLiteral(newElements);
              })
            ]
          );
        default:
          if (!allowUndefined) {
            throw new RuntimeError(`Property '${propertyName}' does not exist on array`, node);
          }
          return new NullLiteral();
      }
    }
    
    if (object.nodeType !== 'ObjectLiteral') {
      throw new RuntimeError(`Cannot access property of ${object.nodeType}`, node);
    }
    
    const propertyName = node.property.name;
    const objLiteral = object as ObjectLiteral;
    const prop = objLiteral.properties.find(p => {
      const key = typeof p.key === 'string' ? p.key : (p.key as Identifier).name;
      return key === propertyName;
    });
    
    if (!prop && !allowUndefined) {
      throw new RuntimeError(`Property '${propertyName}' does not exist`, node);
    }
    
    return prop ? prop.value : new NullLiteral();
  }

  private evaluateArrayAccess(node: ArrayAccess): Expression {
    const object = this.evaluateNode(node.object);
    const index = this.evaluateNode(node.index);
    
    // Check if object is an array
    if (object.nodeType !== 'ArrayLiteral') {
      throw new RuntimeError(`Cannot index non-array value: ${object.nodeType}`, node);
    }

    const arrayLiteral = object as ArrayLiteral;
    
    // Check if index is a number
    if (index.nodeType !== 'NumberLiteral') {
      throw new RuntimeError(`Array index must be a number, got ${index.nodeType}`, node);
    }

    const indexLiteral = index as NumberLiteral;
    
    // Check if index is within bounds (allow negative indices for Python-like behavior)
    let actualIndex = indexLiteral.value < 0
      ? arrayLiteral.elements.length + indexLiteral.value
      : indexLiteral.value;

    if (actualIndex < 0 || actualIndex >= arrayLiteral.elements.length) {
      throw new RuntimeError(`Array index ${index} out of bounds for array of length ${arrayLiteral.elements.length}`, node);
    }

    return arrayLiteral.elements[actualIndex];
  }

  private valueToString(value: Expression): string {
    return this.expressionToCode(value);
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

  pushEnvironment(): void {
    this.environment = this.environment.createChild();
  }

  popEnvironment(): void {
    if (!this.environment.getParent()) {
      throw new RuntimeError('Cannot pop root environment');
    }
    this.environment = this.environment.getParent()!;
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
    const valueMap = new Map<string, Expression>();
    for (const [name, binding] of userBindings) {
      // If we have the original expression, serialize that instead of the evaluated value
      valueMap.set(name, binding.expression || this.getBindingValue(binding));
    }
    return this.serializeBindings(valueMap);
  }

  // Load user-defined bindings from serialized format
  loadEnvironment(serializedBindings: Record<string, any>): void {
    const deserializedBindings = this.deserializeBindings(serializedBindings);
    
    // PASS 1: Add all bindings to the environment without evaluating
    // This allows forward references and circular dependencies to work
    for (const [name, value] of deserializedBindings) {
      if (value instanceof Expression) {
        // Store the expression but with a placeholder value (the expression itself)
        this.environment.define(name, undefined, value);
      } else {
        // For already-evaluated values, store them directly
        this.environment.define(name, value, undefined);
      }
    }
    
    // PASS 2: Evaluate all expressions now that all names are bound
    for (const [name, value] of deserializedBindings) {
      if (value instanceof Expression) {
        // Now evaluate the expression with all bindings available
        const evaluatedValue = this.evaluateNode(value);
        // Update the binding with the evaluated value, keeping the expression
        this.environment.set(name, evaluatedValue, value);
      }
    }
  }

  // Get only user-defined bindings (exclude built-ins like console, Math)
  getUserDefinedBindings(): Map<string, EnvironmentBinding> {
    const builtins = new Set(['console', 'Math', 'delete', 'uiHr']);
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
  private serializeBindings(bindings: Map<string, Expression>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [name, value] of bindings) {
      result[name] = this.serializeValue(value);
    }

    return result;
  }

  private serializeValue(value: Expression): any {
    // All values are now Expression types
    return {
      type: 'expression',
      value: this.serializeExpression(value)
    };
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
  private deserializeBindings(serializedBindings: Record<string, any>): Map<string, Expression> {
    const bindings = new Map<string, Expression>();

    for (const [name, serializedValue] of Object.entries(serializedBindings)) {
      const value = this.deserializeValue(serializedValue);
      bindings.set(name, value);
    }

    return bindings;
  }

  private deserializeValue(serialized: any): Expression {
    if (!serialized || typeof serialized !== 'object' || !serialized.type) {
      return new NullLiteral();
    }

    const dummyToken: any = { type: 'DESERIALIZED', value: '', position: 0, line: 0, column: 0 };

    switch (serialized.type) {
      case 'null':
        return new NullLiteral();

      case 'number':
        return new NumberLiteral(typeof serialized.value === 'number' ? serialized.value : 0, dummyToken);

      case 'string':
        return new StringLiteral(typeof serialized.value === 'string' ? serialized.value : '', dummyToken);

      case 'boolean':
        return new BooleanLiteral(Boolean(serialized.value), dummyToken);

      case 'function':
        // Functions cannot be deserialized, return null
        return new NullLiteral();

      case 'expression':
        return this.deserializeExpression(serialized.value);

      case 'array':
        if (Array.isArray(serialized.value)) {
          const elements = serialized.value.map((item: any) => this.deserializeValue(item));
          return new ArrayLiteral(elements);
        }
        return new ArrayLiteral([]);

      case 'object':
        if (serialized.value && typeof serialized.value === 'object') {
          const properties: ObjectProperty[] = [];
          for (const [key, val] of Object.entries(serialized.value)) {
            properties.push(new ObjectProperty(key, this.deserializeValue(val)));
          }
          return new ObjectLiteral(properties);
        }
        return new ObjectLiteral([]);

      default:
        return new NullLiteral();
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
export function formatRuntimeValue(value: Expression): string {
  return expressionToCode(value);
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
    
    case 'DOMNode': {
      const node = expr as DOMNode;
      const attrs = Object.entries(node.attributes)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      const attrsStr = attrs ? ' ' + attrs : '';
      
      if (node.children.length === 0) {
        return `<${node.tagName}${attrsStr}>`;
      } else {
        const childrenStr = node.children
          .map(child => typeof child === 'string' ? child : expressionToCode(child))
          .join('');
        return `<${node.tagName}${attrsStr}>${childrenStr}</${node.tagName}>`;
      }
    }
    
    default:
      return `[Unknown: ${expr.nodeType}]`;
  }
}

export function formatRuntimeError(error: RuntimeError): string {
  return `Runtime Error: ${error.message}`;
}
