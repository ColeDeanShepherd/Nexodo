import { createReplParser } from './compiler/grammar'
import { Lexer } from './compiler/lexer'
import { buildAST } from './compiler/ast'
import { TypeChecker, formatTypeError, formatType } from './compiler/type-checker'
import { Interpreter, formatRuntimeValue, formatRuntimeError } from './compiler/interpreter'
import { _elem, _h1, _div, _input, _button } from './ui-lib'

class Auth {
  private token: string | null = null

  async login(password: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        const data = await response.json()
        this.token = data.token
        localStorage.setItem('auth_token', this.token!)
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token')
    }
    return this.token
  }

  logout(): void {
    this.token = null
    localStorage.removeItem('auth_token')
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }
}

class REPL {
  private outputElement!: HTMLElement
  private inputElement!: HTMLInputElement
  private history: string[] = []
  private historyIndex = -1
  private typeChecker = new TypeChecker()
  private interpreter = new Interpreter()
  private auth = new Auth()
  private loginContainer!: HTMLElement
  private replContainer!: HTMLElement

  private constructor(container: HTMLElement) {
    this.setupUI(container)
  }

  static async create(container: HTMLElement): Promise<REPL> {
    const repl = new REPL(container)
    await repl.initialize()
    return repl
  }

  private async initialize() {
    if (this.auth.isAuthenticated()) {
      await this.showREPL()
    } else {
      this.showLogin()
    }
  }

  private showLogin() {
    this.loginContainer.style.display = 'block'
    this.replContainer.style.display = 'none'
  }

  private async showREPL() {
    this.loginContainer.style.display = 'none'
    this.replContainer.style.display = 'block'
    this.addOutput('Welcome to Nexodo REPL! Complete compiler pipeline: Lexer → Parser → AST → Type Checker → Interpreter', 'info')
    await this.loadEnvironment()
  }

  private async loadEnvironment() {
    try {
      await this.interpreter.loadEnvironmentFromStorage(() => this.auth.getToken())
      this.addOutput('Loaded previous session variables from server', 'info')
    } catch (error) {
      console.warn('Failed to load environment:', error)
      this.addOutput('Failed to load previous session from server', 'error')
    }
  }

  private setupUI(container: HTMLElement) {
    // Create login container
    this.setupLogin(container)
    
    // Create REPL container
    this.setupREPL(container)
  }

  private setupLogin(container: HTMLElement) {
    const passwordInput = _input({
      type: 'password',
      placeholder: 'Enter password...',
      class: 'login-input'
    }) as HTMLInputElement

    const loginButton = _button({ class: 'login-button' }, ['Login']) as HTMLButtonElement
    const errorDiv = _div({ class: 'login-error' })

    const handleLogin = async () => {
      const password = passwordInput.value.trim()
      if (!password) return

      loginButton.textContent = 'Logging in...'
      loginButton.disabled = true

      const success = await this.auth.login(password)
      if (success) {
        await this.showREPL()
      } else {
        errorDiv.textContent = 'Invalid password'
        errorDiv.style.color = 'red'
        passwordInput.value = ''
      }

      loginButton.textContent = 'Login'
      loginButton.disabled = false
    }

    loginButton.addEventListener('click', handleLogin)
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin()
    })

    this.loginContainer = _div({ class: 'login-container' }, [
      _h1({}, ['Authentication Required']),
      _div({}, ['Please enter the password to access the REPL:']),
      passwordInput,
      loginButton,
      errorDiv
    ])

    container.appendChild(this.loginContainer)
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
    
    // Add logout button
    const logoutButton = _button({ class: 'logout-button' }, ['Logout'])
    logoutButton.addEventListener('click', () => {
      this.auth.logout()
      this.showLogin()
    })
    
    const replHeader = _div({ class: 'repl-header' }, [
      _elem('span', {}, ['Nexodo REPL']),
      logoutButton
    ])
    
    this.replContainer = _div({ class: 'repl-container' }, [replHeader, this.outputElement, inputContainer])
    
    container.appendChild(this.replContainer)
    
    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.inputElement.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const input = this.inputElement.value.trim()
        if (input) {
          await this.executeCommand(input)
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

  private async executeCommand(input: string) {
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
      try {
        await this.interpreter.saveEnvironmentToStorage(() => this.auth.getToken());
      } catch (saveError) {
        console.warn('Failed to save environment:', saveError);
        this.addOutput('Warning: Failed to save session to server', 'error');
      }
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

async function run() {
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
  await REPL.create(appElem)
  
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