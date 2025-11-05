import { _elem, _h1 } from './ui-lib'

async function run() {
  const appElem = document.getElementById('app')
  if (!appElem) {
    throw new Error('App root element not found')
  }

  const heading = _h1(['Welcome to Nexodo'])
  appElem.appendChild(heading)
}

run()