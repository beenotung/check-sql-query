# check-sql-query

Detects SQL operation types and whether a query is readonly, and validates parameter binding.

[![npm Package Version](https://img.shields.io/npm/v/check-sql-query)](https://www.npmjs.com/package/check-sql-query)
[![Minified Package Size](https://img.shields.io/bundlephobia/min/check-sql-query)](https://bundlephobia.com/package/check-sql-query)
[![Minified and Gzipped Package Size](https://img.shields.io/bundlephobia/minzip/check-sql-query)](https://bundlephobia.com/package/check-sql-query)

## Features

- Detects SQL operation types (select, insert, update, delete, create, drop, alter, etc.)
- Determines if query is readonly (only doing `SELECT` operations)
- Validates parameter binding consistency (positional `$1`/`?` or named `@`/`:`/`$`)
- Typescript support
- Isomorphic package: works in Node.js and browsers

## Installation

```bash
npm install check-sql-query
```

You can also install `check-sql-query` with [pnpm](https://pnpm.io/), [yarn](https://yarnpkg.com/), or [slnpm](https://github.com/beenotung/slnpm)

## Usage Example

```typescript
import { checkSqlQuery } from 'check-sql-query'

// Positional parameters with $1 style (PostgreSQL)
const result1 = checkSqlQuery('INSERT INTO users (name) VALUES ($1)', ['Alice'])
// result1: { readonly: false, types: ['insert'] }

// Positional parameters with ? style (MySQL/SQLite)
const result2 = checkSqlQuery('UPDATE users SET name = ? WHERE id = ?', [
  'Bob',
  1,
])
// result2: { readonly: false, types: ['update'] }

// Named parameters with @, :, or $
const result3a = checkSqlQuery('DELETE FROM users WHERE id = @id', { id: 1 })
const result3b = checkSqlQuery('DELETE FROM users WHERE id = :id', { id: 1 })
const result3c = checkSqlQuery('DELETE FROM users WHERE id = $id', { id: 1 })
// result3a/3b/3c: { readonly: false, types: ['delete'] }

// CREATE INDEX
const result4 = checkSqlQuery('CREATE INDEX idx_name ON users (name)')
// result4: { readonly: false, types: ['create'] }

// DROP TABLE
const result5 = checkSqlQuery('DROP TABLE users')
// result5: { readonly: false, types: ['drop'] }

// Parameter count mismatch
const result6 = checkSqlQuery('SELECT * FROM users WHERE id = $1', [
  'too',
  'many',
  'params',
])
// result6: { readonly: true, types: ['select'], error: 'too many parameter in array, expected 1, got 3' }

// Mixed parameter styles (not allowed)
const result7 = checkSqlQuery(
  'SELECT * FROM users WHERE id = $1 AND name = ?',
  [1, 'Alice'],
)
// result7: { readonly: true, types: ['select'], error: 'mixed "$1" and "?" style parameters' }
```

## API

```typescript
export type SqlType = // supported SQL operation types
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'drop'
  | 'alter'
  | 'create'
  | 'pragma'
  | 'attach'
  | 'detach'
  | 'replace'
  | 'truncate'
  | 'vacuum'
  | 'reindex'

export function checkSqlQuery(
  sql: string,
  params?: any[] | object, // array for positional ($1, ?) or object for named (@, :, $)
): {
  readonly: boolean // true if query is read-only (SELECT only)
  types: SqlType[] // detected SQL operation types
  error?: string // present only if validation fails
}
```

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
