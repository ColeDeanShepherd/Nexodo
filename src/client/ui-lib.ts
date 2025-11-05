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

export const _h1 = _elem.bind(null, 'h1')