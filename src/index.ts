import * as fs from 'fs'

import InputStream from './InputStream'
import Tokenizer from './Tokenizer'
import Parser from './Parser'

const sourceCode = fs.readFileSync(process.argv[2]).toString()

const tokenizer = Parser(Tokenizer(InputStream(sourceCode)))

console.log(JSON.stringify(tokenizer))
