import { tokenizer, token } from './Tokenizer'

const FALSE = { type: 'boolean', value: false }

const PRECEDENCE: { [x: string]: number } = {
  '=': 1,
  '||': 2,
  '&&': 3,
  '<': 7,
  '>': 7,
  '<=': 7,
  '>=': 7,
  '==': 7,
  '!=': 7,
  '+': 10,
  '-': 10,
  '*': 10,
  '/': 10,
  '%': 10,
}

const isPontuation = (tokenizer: tokenizer, ch: string) => {
  const token = tokenizer.getCurrent()
  return token && token.type === 'pontuation' && (!ch || token.value === ch) && token
}
const isKeyword = (tokenizer: tokenizer, keyword: string) => {
  const token = tokenizer.getCurrent()
  return token && token.type === 'keyword' && (!keyword || token.value === keyword) && token
}
const isOperator = (tokenizer: tokenizer, operator?: string) => {
  const token = tokenizer.getCurrent()
  return token && token.type === 'operation' && (!operator || token.value === operator) && token
}
const skipPontuation = (tokenizer: tokenizer, ch: string) => {
  if (isPontuation(tokenizer, ch)) {
    tokenizer.getNext()
  } else {
    tokenizer.logger('Faltou uma pontuacao: ' + ch)
  }
}
const skipKeyword = (tokenizer: tokenizer, keyword: string) => {
  if (isKeyword(tokenizer, keyword)) {
    tokenizer.getNext()
  } else {
    tokenizer.logger('Faltou uma palavra chave: ' + keyword)
  }
}
const skipOperator = (tokenizer: tokenizer, operator: string) => {
  if (isOperator(tokenizer, operator)) {
    tokenizer.getNext()
  } else {
    tokenizer.logger('Faltou operador: ' + operator)
  }
}
const unexpectedError = (tokenizer: tokenizer) =>
  tokenizer.logger('Token inesperado: ' + JSON.stringify(tokenizer.getCurrent()))

const parseCall = (tokenizer: tokenizer, fn: () => any) => ({
  type: 'call',
  func: fn,
  args: delimited(tokenizer, '(', ')', ',', () => parseExpression(tokenizer)),
})

const maybeCall = (tokenizer: tokenizer, expression: any) => {
  expression = expression()
  return isPontuation(tokenizer, '(') ? parseCall(tokenizer, expression) : expression
}

const maybeBinary = (tokenizer: tokenizer, left: token, currentPrecedence: number): token => {
  const token = isOperator(tokenizer)
  if (token) {
    const anotherPrecedence = PRECEDENCE[String(token.value)]
    if (anotherPrecedence > currentPrecedence) {
      tokenizer.getNext()
      const right = maybeBinary(tokenizer, parseAtom(tokenizer), anotherPrecedence)
      const binary = {
        type: token.value === '=' ? 'assign' : 'binary',
        operator: token.value,
        left,
        right,
      }
      return maybeBinary(tokenizer, binary, currentPrecedence)
    }
  }
  return left
}

const delimited = (tokenizer: tokenizer, begin: string, end: string, splitter: string, parser: () => void) => {
  const args = []
  let first = true

  skipPontuation(tokenizer, begin)

  while (!tokenizer.isEof()) {
    if (isPontuation(tokenizer, end)) break
    if (first) {
      first = false
    } else {
      skipPontuation(tokenizer, splitter)
    }
    if (isPontuation(tokenizer, end)) break
    args.push(parser())
  }

  skipPontuation(tokenizer, end)

  return args
}

const parseExpression = (tokenizer: tokenizer): void => {
  const atom = parseAtom(tokenizer)
  return maybeCall(tokenizer, () => maybeBinary(tokenizer, atom, 0))
}

const parseProg = (tokenizer: tokenizer) => {
  const prog = delimited(tokenizer, '{', '}', ';', () => parseExpression(tokenizer))
  if (prog.length === 0) return FALSE
  if (prog.length === 1) return prog[0]
  return { type: 'prog', prog }
}

const parseMain = (tokenizer: tokenizer) => {
  const main = []
  while (!tokenizer.isEof()) {
    main.push(parseExpression(tokenizer))
    if (!tokenizer.isEof()) skipPontuation(tokenizer, ';')
  }

  return { type: 'prog', prog: main }
}

const parseIf = (tokenizer: tokenizer) => {
  skipKeyword(tokenizer, 'if')
  const cond = parseExpression(tokenizer)
  if (!isPontuation(tokenizer, '{')) skipKeyword(tokenizer, 'then')
  const then = parseExpression(tokenizer)
  const ret: { type: string; cond: any; then: any; else: any | null } = { type: 'if', cond, then, else: null }

  if (isKeyword(tokenizer, 'else')) {
    tokenizer.getNext()
    ret.else = parseExpression(tokenizer)
  }

  return ret
}

const parseVariableName = (tokenizer: tokenizer) => {
  const name = tokenizer.getNext()
  if (!name || name.type !== 'variable') return tokenizer.logger('Esperava uma variavel')

  return name.value
}

const parseFunction = (tokenizer: tokenizer) => ({
  type: 'function',
  args: delimited(tokenizer, '(', ')', ',', () => parseVariableName(tokenizer)),
  body: parseExpression(tokenizer),
})

const parseBoolean = (tokenizer: tokenizer) => {
  const token = tokenizer.getNext()
  return {
    type: 'boolean',
    value: token && token.value === 'true',
  }
}

const parseAtom = (tokenizer: tokenizer) =>
  maybeCall(tokenizer, () => {
    if (isPontuation(tokenizer, '(')) {
      tokenizer.getNext()
      const exp = parseExpression(tokenizer)
      skipPontuation(tokenizer, ')')
      return exp
    }

    if (isPontuation(tokenizer, '{')) return parseProg(tokenizer)
    if (isKeyword(tokenizer, 'if')) return parseIf(tokenizer)
    if (isKeyword(tokenizer, 'true') || isKeyword(tokenizer, 'false')) return parseBoolean(tokenizer)
    if (isKeyword(tokenizer, 'fun')) {
      tokenizer.getNext()
      return parseFunction(tokenizer)
    }

    const token = tokenizer.getNext()
    if (!token) return unexpectedError(tokenizer)
    if (token.type === 'variable' || token.type === 'num' || token.type === 'string') return token
  })

export default (tokenizer: tokenizer) => parseMain(tokenizer)
