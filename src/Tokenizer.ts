import { streamCursor, inputStream } from './InputStream'

type predicateFn = (x: string) => void

export type token = { type: string; value?: string | number; [x: string]: any } | undefined

export type tokenizer = {
  getNext: () => token
  getCurrent: () => token
  isEof: () => boolean
  logger: (msg: string) => void
}

const keywords = ' if then else fun true false '

const isKeyword = (ch: string) => keywords.indexOf(' ' + ch + ' ') >= 0
const isDigit = (ch: string) => /[0-9]/i.test(ch)
const isIdentifierStart = (ch: string) => /[a-zA-Z_]/i.test(ch)
const isIdentifier = (ch: string) => isIdentifierStart(ch) || '$0123456789'.indexOf(ch) >= 0
const isOperator = (ch: string) => '+-*/%=&|<>!'.indexOf(ch) >= 0
const isPontuation = (ch: string) => ',;(){}[]'.indexOf(ch) >= 0
const isWhitespace = (ch: string) => ' \t\n'.indexOf(ch) >= 0
const readWhile = (input: inputStream, fn: predicateFn) => {
  let str = ''
  while (!input.isEof() && fn(input.getCurrent())) {
    str += input.getNext()
  }

  return str
}
const readNumber = (input: inputStream) => {
  let hasDot = false
  const number = readWhile(input, ch => {
    if (ch === '.') {
      if (hasDot) return false
      hasDot = true
      return true
    }
    return isDigit(ch)
  })

  return { type: 'num', value: parseFloat(number) }
}
const readIdentifier = (input: inputStream) => {
  const id = readWhile(input, isIdentifier)
  return {
    type: isKeyword(id) ? 'keyword' : 'variable',
    value: id,
  }
}
const readEscaped = (input: inputStream, end: string) => {
  let escaped = false
  let str = ''
  input.getNext()
  while (!input.isEof()) {
    const ch = input.getNext()
    if (escaped) {
      str += ch
      escaped = false
    } else if (ch === '\\') {
      escaped = true
    } else if (ch === end) {
      break
    } else {
      str += ch
    }
  }

  return str
}
const readString = (input: inputStream) => ({
  type: 'string',
  value: readEscaped(input, '"'),
})
const skipComment = (input: inputStream) => {
  readWhile(input, ch => ch !== '\n')
  input.getNext()
}
const readNext = (input: inputStream): { type: string; value: string | number } | undefined => {
  readWhile(input, isWhitespace)
  if (input.isEof()) return

  const ch = input.getCurrent()

  if (ch === '#') {
    skipComment(input)
    return readNext(input)
  }
  if (ch === '"') return readString(input)
  if (isDigit(ch)) {
    return readNumber(input)
  }
  if (isIdentifierStart(ch)) {
    return readIdentifier(input)
  }
  if (isPontuation(ch)) {
    return {
      type: 'pontuation',
      value: input.getNext(),
    }
  }
  if (isOperator(ch)) {
    return {
      type: 'operation',
      value: readWhile(input, isOperator),
    }
  }

  input.logger(`Caractere desconhecido: ${ch}`)
}

export default function(input: inputStream): tokenizer {
  let current: { type: string; value: string | number } | undefined
  const getCurrent = () => current || (current = readNext(input))
  const getNext = () => {
    const token = current
    current = undefined
    return token || readNext(input)
  }
  const isEof = () => getCurrent() === undefined

  return {
    getCurrent,
    getNext,
    isEof,
    logger: input.logger,
  }
}
