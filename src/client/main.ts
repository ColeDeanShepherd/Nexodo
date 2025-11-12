import { createReplParser } from './grammar'
import { Lexer } from './lexer'
import { _elem, _h1, _div, _input } from './ui-lib'

class REPL {
  private outputElement!: HTMLElement
  private inputElement!: HTMLInputElement
  private history: string[] = []
  private historyIndex = -1

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
      placeholder: 'Enter JavaScript...'
    }) as HTMLInputElement
    
    const inputContainer = _div({ class: 'repl-input-container' }, [prompt, this.inputElement])
    const replContainer = _div({ class: 'repl-container' }, [this.outputElement, inputContainer])
    
    container.appendChild(replContainer)
    
    this.setupEventListeners()
    this.addOutput('Welcome to Nexodo REPL! Enter JavaScript expressions.', 'info')
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
      const lexer = new Lexer();
      const tokens = lexer.tokenize(input);
      const parser = createReplParser(tokens);
      const parseTree = parser.parse();
      const result = JSON.stringify(parseTree, null, 2);
      //const result = eval(input)
      this.addOutput(String(result), 'output')
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