export type _ElemChildren = (HTMLElement | string)[]
export type _ElemAttributes = { [key: string]: string | number | boolean }

export const _elem = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  childrenOrAttributes?:
    | _ElemChildren
    | _ElemAttributes,
  children?: _ElemChildren,
  options?: ElementCreationOptions
): HTMLElementTagNameMap[K] => {
  // Extract attributes and children based on the parameters provided
  let attributes: _ElemAttributes | undefined
  let finalChildren: _ElemChildren | undefined

  if (childrenOrAttributes === undefined) {
    attributes = undefined
    finalChildren = children
  }
  else if (Array.isArray(childrenOrAttributes)) {
    if (children !== undefined) {
      throw new Error('When childrenOrAttributes is an array, children parameter must be undefined')
    }

    attributes = undefined
    finalChildren = childrenOrAttributes
  }
  else {
    attributes = childrenOrAttributes
    finalChildren = children
  }

  // Create the element
  const elem = document.createElement(tagName, options)
  
  // Apply attributes if they exist
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      elem.setAttribute(key, String(value))
    })
  }
  
  // Append children if they exist
  if (finalChildren) {
    finalChildren.forEach(child => {
      if (typeof child === 'string') {
        elem.appendChild(document.createTextNode(child))
      } else {
        elem.appendChild(child)
      }
    })
  }
  
  return elem
}

export const _text = (content: string): Text =>
  document.createTextNode(content)

// Common HTML elements
export const _h1 = _elem.bind(null, 'h1')
export const _h2 = _elem.bind(null, 'h2')
export const _h3 = _elem.bind(null, 'h3')
export const _h4 = _elem.bind(null, 'h4')
export const _h5 = _elem.bind(null, 'h5')
export const _h6 = _elem.bind(null, 'h6')

export const _div = _elem.bind(null, 'div')
export const _span = _elem.bind(null, 'span')
export const _p = _elem.bind(null, 'p')

export const _a = _elem.bind(null, 'a')
export const _img = _elem.bind(null, 'img')

export const _ul = _elem.bind(null, 'ul')
export const _ol = _elem.bind(null, 'ol')
export const _li = _elem.bind(null, 'li')

export const _table = _elem.bind(null, 'table')
export const _thead = _elem.bind(null, 'thead')
export const _tbody = _elem.bind(null, 'tbody')
export const _tr = _elem.bind(null, 'tr')
export const _th = _elem.bind(null, 'th')
export const _td = _elem.bind(null, 'td')

export const _form = _elem.bind(null, 'form')
export const _input = _elem.bind(null, 'input')
export const _textarea = _elem.bind(null, 'textarea')
export const _button = _elem.bind(null, 'button')
export const _select = _elem.bind(null, 'select')
export const _option = _elem.bind(null, 'option')
export const _label = _elem.bind(null, 'label')

export const _header = _elem.bind(null, 'header')
export const _nav = _elem.bind(null, 'nav')
export const _main = _elem.bind(null, 'main')
export const _section = _elem.bind(null, 'section')
export const _article = _elem.bind(null, 'article')
export const _aside = _elem.bind(null, 'aside')
export const _footer = _elem.bind(null, 'footer')

export const _strong = _elem.bind(null, 'strong')
export const _em = _elem.bind(null, 'em')
export const _code = _elem.bind(null, 'code')
export const _pre = _elem.bind(null, 'pre')

export const _br = _elem.bind(null, 'br')
export const _hr = _elem.bind(null, 'hr')