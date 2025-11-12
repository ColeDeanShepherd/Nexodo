import { createReplParser } from './compiler/grammar'
import { Lexer } from './compiler/lexer'
import { buildAST } from './compiler/ast'
import { TypeChecker, formatTypeError, formatType } from './compiler/type-checker'
import { Interpreter, formatRuntimeValue, formatRuntimeError } from './compiler/interpreter'
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
    this.loadEnvironment()
  }

  private loadEnvironment() {
    try {
      this.interpreter.loadEnvironmentFromStorage()
      this.addOutput('Loaded previous session variables from storage', 'info')
    } catch (error) {
      console.warn('Failed to load environment:', error)
    }
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

      // Save environment to storage after successful execution
      this.interpreter.saveEnvironmentToStorage();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.addOutput(`Error: ${errorMessage}`, 'error')
    }
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