import { createReplParser } from './grammar'
import { Lexer } from './lexer'
import { buildAST } from './ast'
import { TypeChecker, formatTypeError, formatType } from './type-checker'
import { Interpreter, formatRuntimeValue, formatRuntimeError } from './interpreter'
import { _elem, _h1, _div, _input } from './ui-lib'

class REPL {
  private outputElement!: HTMLElement
  private inputElement!: HTMLInputElement
  private history: string[] = []
  private historyIndex = -1
  private typeChecker = new TypeChecker()
  private interpreter = new Interpreter()

  constructor(container: HTMLElement) {
    this.setupREPL(container)
  }

  private setupREPL(container: HTMLElement) {
    // Output area
    this.outputElement = _div({ class: 'repl-output' })
    
    // Input area
    const prompt = _elem('span', { class: 'repl-prompt' }, ['> '])
    this.inputElement = _input({ 
      class: 'repl-input', 
      type: 'text',
      placeholder: 'Try: x = 42, {name: "John"}, [1,2,3], console.log("hello")...'
    }) as HTMLInputElement
    
    const inputContainer = _div({ class: 'repl-input-container' }, [prompt, this.inputElement])
    const replContainer = _div({ class: 'repl-container' }, [this.outputElement, inputContainer])
    
    container.appendChild(replContainer)
    
    this.setupEventListeners()
    this.addOutput('Welcome to Nexodo REPL! Complete compiler pipeline: Lexer → Parser → AST → Type Checker → Interpreter', 'info')
  }

  private setupEventListeners() {
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const input = this.inputElement.value.trim()
        if (input) {
          this.executeCommand(input)
          this.inputElement.value = ''
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.navigateHistory(-1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.navigateHistory(1)
      }
    })
  }

  private executeCommand(input: string) {
    this.history.push(input)
    this.historyIndex = this.history.length
    this.addOutput(`> ${input}`, 'input')
    
    try {
      // Tokenization
      const lexer = new Lexer();
      const tokens = lexer.tokenize(input);
      
      // Parsing (concrete syntax tree)
      const parser = createReplParser(tokens);
      const parseTree = parser.parse();
      
      // AST Building (abstract syntax tree)
      const ast = buildAST(parseTree);
      
      // Type Checking & Semantic Analysis
      const typeAnalysis = this.typeChecker.analyze(ast);
      
      // Interpretation & Execution
      const executionResult = this.interpreter.interpret(ast);
      
      // Display results
      this.addOutput('--- AST ---', 'info');
      this.addOutput(this.formatAST(ast), 'output');
      
      this.addOutput('--- Type Analysis ---', 'info');
      if (typeAnalysis.errors.length > 0) {
        for (const error of typeAnalysis.errors) {
          this.addOutput(formatTypeError(error), 'error');
        }
      } else {
        this.addOutput('✓ No type errors', 'info');
      }
      this.addOutput(`Type: ${formatType(typeAnalysis.type)}`, 'output');
      
      this.addOutput('--- Execution ---', 'info');
      if (executionResult.errors.length > 0) {
        for (const error of executionResult.errors) {
          this.addOutput(formatRuntimeError(error), 'error');
        }
      } else {
        this.addOutput(`Value: ${formatRuntimeValue(executionResult.value)}`, 'output');
      }
      
      // Show console output if any
      if (executionResult.output.length > 0) {
        this.addOutput('--- Console Output ---', 'info');
        for (const line of executionResult.output) {
          this.addOutput(line, 'output');
        }
      }
      
      // Show current runtime environment (variables with values)
      const runtimeBindings = this.interpreter.getEnvironment().getAllBindings();
      if (runtimeBindings.size > 0) {
        this.addOutput('--- Variables ---', 'info');
        const vars = Array.from(runtimeBindings.entries())
          .filter(([name]) => !['console', 'Math'].includes(name)) // Hide built-ins
          .map(([name, value]) => `${name} = ${formatRuntimeValue(value)}`)
          .join('\n');
        if (vars) {
          this.addOutput(vars, 'output');
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.addOutput(`Error: ${errorMessage}`, 'error')
    }
  }

  private formatAST(node: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let result = `${spaces}${node.nodeType}`;
    
    // Add specific information based on node type
    if (node.nodeType === 'NumberLiteral') {
      result += ` (${node.value})`;
    } else if (node.nodeType === 'StringLiteral') {
      result += ` ("${node.value}")`;
    } else if (node.nodeType === 'BooleanLiteral') {
      result += ` (${node.value})`;
    } else if (node.nodeType === 'Identifier') {
      result += ` (${node.name})`;
    }
    
    // Recursively format child nodes
    const children = this.getChildNodes(node);
    for (const child of children) {
      result += '\n' + this.formatAST(child, indent + 1);
    }
    
    return result;
  }

  private getChildNodes(node: any): any[] {
    const children: any[] = [];
    
    if (node.statements) {
      children.push(...node.statements);
    }
    if (node.identifier) {
      children.push(node.identifier);
    }
    if (node.value) {
      children.push(node.value);
    }
    if (node.callee) {
      children.push(node.callee);
    }
    if (node.args) {
      children.push(...node.args);
    }
    if (node.properties) {
      children.push(...node.properties);
    }
    if (node.key && typeof node.key === 'object') {
      children.push(node.key);
    }
    if (node.elements) {
      children.push(...node.elements);
    }
    if (node.object) {
      children.push(node.object);
    }
    if (node.property) {
      children.push(node.property);
    }
    
    return children;
  }

  private navigateHistory(direction: number) {
    const newIndex = this.historyIndex + direction
    if (newIndex >= 0 && newIndex < this.history.length) {
      this.historyIndex = newIndex
      this.inputElement.value = this.history[this.historyIndex]
    } else if (newIndex >= this.history.length) {
      this.historyIndex = this.history.length
      this.inputElement.value = ''
    }
  }

  private addOutput(text: string, type: 'input' | 'output' | 'error' | 'info') {
    const line = _div({ class: `repl-output-line ${type}` }, [text])
    this.outputElement.appendChild(line)
    this.outputElement.scrollTop = this.outputElement.scrollHeight
  }
}

function run() {
  const appElem = document.getElementById('app')
  if (!appElem) {
    throw new Error('App root element not found')
  }

  // Create main content area
  const heading = _h1(['Nexodo'])
  const welcomeText = _div(['Full-stack TypeScript application with integrated REPL'])
  const mainContent = _div({ class: 'main-content' }, [heading, welcomeText])
  
  // Add main content to app
  appElem.appendChild(mainContent)
  
  // Initialize REPL
  new REPL(appElem)
  
  // Focus on REPL input
  setTimeout(() => {
    const replInput = document.querySelector('.repl-input') as HTMLInputElement
    if (replInput) replInput.focus()
  }, 100)
}

// Ensure the function runs when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run)
} else {
  run()
}