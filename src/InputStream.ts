export type streamCursor = {
  line: 1
  pos: 0
  col: 0
}

export type inputStream = {
  getNext: () => string
  getCurrent: () => string
  isEof: () => boolean
  logger: (msg: string) => string
}

const getNext = (input: string, stream: streamCursor) => (): string => {
  const ch = input.charAt(stream.pos++)

  if (ch === '\n') {
    stream.line++
    stream.col = 0
  } else {
    stream.col++
  }

  return ch
}
const getCurrent = (input: string, stream: streamCursor) => (): string => input.charAt(stream.pos)
const isEof = (input: string, stream: streamCursor) => (): boolean => getCurrent(input, stream)() === ''
const logger = (stream: streamCursor) => (msg: string) => {
  throw new Error(`${msg} - (Line: ${stream.line} - Col: ${stream.col})`)
}

export default function(input: string): inputStream {
  const stream: streamCursor = {
    line: 1,
    pos: 0,
    col: 0,
  }

  return {
    getNext: getNext(input, stream),
    getCurrent: getCurrent(input, stream),
    isEof: isEof(input, stream),
    logger: logger(stream),
  }
}
