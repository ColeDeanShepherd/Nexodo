import { createReplParser } from './compiler/grammar'
import { Lexer } from './compiler/lexer'
import { buildAST } from './compiler/ast'
import { TypeChecker, formatTypeError, formatType } from './compiler/type-checker'
import { Interpreter, formatRuntimeValue, formatRuntimeError, expressionToCode } from './compiler/interpreter'
import { EnvironmentService } from './environment-service'
import { _elem, _h1, _div, _input, _button } from './ui-lib'

// Google Identity Services API types
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

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

  async triggerBackup(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/backup/trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Backup error:', error)
      return { success: false, message: 'Network error' }
    }
  }

  async getBackupStatus(): Promise<any> {
    try {
      const response = await fetch('/api/backup/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      })

      if (response.ok) {
        return await response.json()
      }
      return null
    } catch (error) {
      console.error('Backup status error:', error)
      return null
    }
  }

  async sendGoogleTokens(tokens: any): Promise<{ success: boolean; message: string }> {
    try {
      // Get folder ID from localStorage if set
      const folderId = localStorage.getItem('google_drive_folder_id')
      
      const response = await fetch('/api/auth/google/tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
          folder_id: folderId || undefined
        })
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Google tokens error:', error)
      return { success: false, message: 'Network error' }
    }
  }

  async getGoogleAuthStatus(): Promise<any> {
    try {
      const response = await fetch('/api/auth/google/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      })

      if (response.ok) {
        return await response.json()
      }
      return null
    } catch (error) {
      console.error('Google auth status error:', error)
      return null
    }
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
  private envService = new EnvironmentService(() => this.auth.getToken())
  private loginContainer!: HTMLElement
  private replContainer!: HTMLElement
  private envDisplayElement!: HTMLElement

  private constructor(container: HTMLElement, envDisplay: HTMLElement) {
    this.envDisplayElement = envDisplay
    this.setupUI(container)
  }

  static async create(container: HTMLElement, envDisplay: HTMLElement): Promise<REPL> {
    const repl = new REPL(container, envDisplay)
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
    this.addOutput('Welcome to Nexodo REPL!', 'info')
    await this.loadEnvironment()
    this.updateEnvironmentDisplay()
  }

  private updateEnvironmentDisplay() {
    const userBindings = this.interpreter.getUserDefinedBindings()
    
    // Clear existing content
    this.envDisplayElement.innerHTML = ''
    
    if (userBindings.size === 0) {
      this.envDisplayElement.appendChild(_div({ class: 'env-empty' }, ['No variables defined']))
      return
    }
    
    // Create title
    const title = _div({ class: 'env-title' }, ['Runtime Environment'])
    this.envDisplayElement.appendChild(title)
    
    // Create variables list
    const varsList = _div({ class: 'env-variables' })
    
    for (const [name, binding] of userBindings) {
      console.log(name, binding);
      const valueStr = formatRuntimeValue(binding.value)
      
      // If there's an expression, show both the expression and the evaluated value
      if (binding.expression) {
        const exprStr = expressionToCode(binding.expression)

        if (valueStr !== exprStr) {
          // Only show expression if it's different from the value string
          const varItem = _div({ class: 'env-variable' }, [
            _elem('span', { class: 'env-var-name' }, [name]),
            _elem('span', { class: 'env-var-separator' }, [': ']),
            _elem('span', { class: 'env-var-value' }, [valueStr]),
            _elem('span', { class: 'env-var-separator' }, [' <- ']),
            _elem('span', { class: 'env-var-expression' }, [exprStr])
          ])
          varsList.appendChild(varItem)
        } else {
          // If expression and value are the same, just show one
          const varItem = _div({ class: 'env-variable' }, [
            _elem('span', { class: 'env-var-name' }, [name]),
            _elem('span', { class: 'env-var-separator' }, [': ']),
            _elem('span', { class: 'env-var-value' }, [valueStr])
          ])
          varsList.appendChild(varItem)
        }
      } else {
        // No expression, just show the value
        const varItem = _div({ class: 'env-variable' }, [
          _elem('span', { class: 'env-var-name' }, [name]),
          _elem('span', { class: 'env-var-separator' }, [': ']),
          _elem('span', { class: 'env-var-value' }, [valueStr])
        ])
        varsList.appendChild(varItem)
      }
    }
    
    this.envDisplayElement.appendChild(varsList)
  }

  private async loadEnvironment() {
    try {
      const serializedEnv = await this.envService.loadEnvironment()
      if (serializedEnv) {
        this.interpreter.loadEnvironment(serializedEnv)
        // Also update type checker with the loaded environment
        this.typeChecker.updateEnvironment(this.interpreter.getEnvironment())
        this.addOutput('Loaded previous session variables from server', 'info')
      }
      this.updateEnvironmentDisplay()
    } catch (error) {
      console.warn('Failed to load environment:', error)
      this.addOutput('Failed to load previous session from server', 'error')
      this.updateEnvironmentDisplay()
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
      type: 'text'
    }) as HTMLInputElement
    
    const inputContainer = _div({ class: 'repl-input-container' }, [prompt, this.inputElement])
    
    // Add app menu
    const menuButton = _button({ class: 'menu-button' }, ['☰'])
    const menuDropdown = _div({ class: 'menu-dropdown', style: 'display: none;' }, [
      _button({ class: 'menu-item' }, ['🔄 Backup Now']),
      _button({ class: 'menu-item' }, ['📊 Backup Status']),
      _button({ class: 'menu-item' }, ['📋 Set Backup Folder']),
      _button({ class: 'menu-item' }, ['🔗 Authorize Google Drive']),
      _button({ class: 'menu-item' }, ['🚪 Logout'])
    ])
    
    this.setupMenuHandlers(menuButton, menuDropdown)
    
    const replHeader = _div({ class: 'repl-header' }, [
      _elem('span', {}, ['Nexodo REPL']),
      _div({ class: 'menu-container' }, [menuButton, menuDropdown])
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

  private setupMenuHandlers(menuButton: HTMLElement, menuDropdown: HTMLElement) {
    let isMenuOpen = false
    
    menuButton.addEventListener('click', (e) => {
      e.stopPropagation()
      isMenuOpen = !isMenuOpen
      menuDropdown.style.display = isMenuOpen ? 'block' : 'none'
    })
    
    // Close menu when clicking outside
    document.addEventListener('click', () => {
      if (isMenuOpen) {
        isMenuOpen = false
        menuDropdown.style.display = 'none'
      }
    })
    
    // Menu item handlers
    const menuItems = menuDropdown.querySelectorAll('.menu-item')
    
    // Backup Now
    menuItems[0].addEventListener('click', async () => {
      menuDropdown.style.display = 'none'
      isMenuOpen = false
      await this.handleBackupTrigger()
    })
    
    // Backup Status
    menuItems[1].addEventListener('click', async () => {
      menuDropdown.style.display = 'none'
      isMenuOpen = false
      await this.handleBackupStatus()
    })
    
    // Set Backup Folder
    menuItems[2].addEventListener('click', async () => {
      menuDropdown.style.display = 'none'
      isMenuOpen = false
      await this.handleBackupFolderConfig()
    })
    
    // Authorize Google Drive
    menuItems[3].addEventListener('click', async () => {
      menuDropdown.style.display = 'none'
      isMenuOpen = false
      await this.handleGoogleDriveSetup()
    })
    
    // Logout
    menuItems[4].addEventListener('click', () => {
      menuDropdown.style.display = 'none'
      isMenuOpen = false
      this.auth.logout()
      this.showLogin()
    })
  }

  private async handleBackupTrigger() {
    this.addOutput('🔄 Triggering backup...', 'info')
    const result = await this.auth.triggerBackup()
    
    if (result.success) {
      this.addOutput(`✅ ${result.message}`, 'info')
    } else {
      this.addOutput(`❌ ${result.message}`, 'error')
    }
  }

  private async handleBackupStatus() {
    this.addOutput('📊 Checking backup status...', 'info')
    const status = await this.auth.getBackupStatus()
    
    if (status) {
      const statusMsg = `Scheduler: ${status.running ? '✅ Running' : '❌ Stopped'} | Next: ${status.nextRun || 'N/A'} | Timezone: ${status.timezone}`
      this.addOutput(statusMsg, 'info')
    } else {
      this.addOutput('❌ Failed to get backup status', 'error')
    }
  }



  private async handleBackupFolderConfig() {
    this.addOutput('📋 Configuring backup folder...', 'info')
    
    const currentFolderId = localStorage.getItem('google_drive_folder_id')
    if (currentFolderId) {
      this.addOutput(`📋 Current Folder ID: ${currentFolderId}`, 'info')
    } else {
      this.addOutput('📋 No folder configured - backups will go to Drive root', 'info')
    }
    
    this.addOutput('💡 To get a folder ID: Open Google Drive, go to your folder, copy the ID from the URL after /folders/', 'info')
    
    const folderId = prompt('Enter Google Drive Folder ID (leave empty for root folder):', currentFolderId || '')
    
    if (folderId === null) {
      this.addOutput('❌ Folder configuration cancelled', 'error')
      return
    }
    
    if (folderId.trim() === '') {
      localStorage.removeItem('google_drive_folder_id')
      this.addOutput('✅ Backup folder cleared - will use Drive root', 'info')
    } else {
      // Basic validation - Google Drive folder IDs are typically long alphanumeric strings
      if (folderId.length < 10 || !/^[a-zA-Z0-9_-]+$/.test(folderId)) {
        this.addOutput('⚠️ Invalid folder ID format. Should be a long alphanumeric string from the Drive URL.', 'error')
        return
      }
      
      localStorage.setItem('google_drive_folder_id', folderId.trim())
      this.addOutput(`✅ Backup folder set to: ${folderId.trim()}`, 'info')
    }
  }

  private async handleGoogleDriveSetup() {
    // Hardcoded client ID for the Nexodo app
    const clientId = '491462303134-7mpv6vqs3s1ls3rrupgelhtobnlcj48o.apps.googleusercontent.com'
    
    this.addOutput('🔗 Setting up Google Drive authorization...', 'info')
    
    // Check current status first
    const status = await this.auth.getGoogleAuthStatus()
    if (status?.configured) {
      this.addOutput('✅ Google Drive is already configured!', 'info')
      return
    }

    this.addOutput('🔑 Starting Google OAuth flow...', 'info')
    
    try {
      // Initialize Google OAuth with hardcoded client ID
      await this.initializeGoogleOAuth(clientId)
    } catch (error) {
      this.addOutput('❌ Failed to initialize Google OAuth. Make sure your domain is authorized in Google Cloud Console.', 'error')
      this.addOutput('💡 Contact the app administrator if this continues to fail.', 'info')
    }
  }

  private async initializeGoogleOAuth(clientId: string) {
    
    return new Promise<void>((resolve, reject) => {
      if (typeof window.google === 'undefined') {
        reject(new Error('Google Identity Services not loaded'));
        return;
      }

      window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: async (response: any) => {
          if (response.error) {
            this.addOutput(`❌ Authorization failed: ${response.error}`, 'error')
            reject(new Error(response.error));
            return;
          }

          this.addOutput('✅ Google authorization successful!', 'info')
          this.addOutput('📤 Sending tokens to server...', 'info')

          // Send tokens to server
          const result = await this.auth.sendGoogleTokens({
            access_token: response.access_token,
            expires_at: Date.now() + (response.expires_in * 1000)
          })

          if (result.success) {
            this.addOutput('✅ Google Drive backup is now configured!', 'info')
          } else {
            this.addOutput(`❌ Failed to configure: ${result.message}`, 'error')
          }

          resolve();
        },
      }).requestAccessToken();
    });
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

      if (typeAnalysis.errors.length > 0) {
        for (const error of typeAnalysis.errors) {
          this.addOutput(formatTypeError(error), 'error');
        }
        return; // Stop execution if there are type errors
      }
      
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
        const serializedEnv = this.interpreter.saveEnvironment()
        await this.envService.saveEnvironment(serializedEnv)
        // Update type checker with current environment
        this.typeChecker.updateEnvironment(this.interpreter.getEnvironment())
        this.updateEnvironmentDisplay(); // Update display after successful save
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
  const envDisplay = _div({ class: 'environment-display' })
  const mainContent = _div({ class: 'main-content' }, [heading, envDisplay])
  
  // Add main content to app
  appElem.appendChild(mainContent)
  
  // Initialize REPL with environment display
  await REPL.create(appElem, envDisplay)
  
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