const sqlTypes = [
  'select',
  'insert',
  'update',
  'delete',
  'drop',
  'alter',
  'create',
  'pragma',
  'attach',
  'detach',
  'replace',
  'truncate',
  'vacuum',
  'reindex',
] as const

export type SqlType = (typeof sqlTypes)[number]

export function checkSqlQuery(
  sql: string,
  params?: any[] | object,
): {
  readonly: boolean
  types: SqlType[]
  error?: string
} {
  sql = sql.trim().toLowerCase()
  sql = replaceStringValue(sql)

  let error: string | undefined

  let paramType = Array.isArray(params)
    ? 'array'
    : params === null
      ? 'null'
      : typeof params
  // check array parameters
  if (sql.includes('$1') && sql.includes('?')) {
    error = 'mixed "$1" and "?" style parameters'
  } else if (sql.includes('$1') || sql.includes('?')) {
    if (!params) {
      error = 'missing array parameters'
    } else if (paramType !== 'array') {
      error = 'array parameters expected, got ' + paramType
    } else {
      let array = params as any[]
      let count = 1
      while (sql.includes(`$${count + 1}`)) {
        count++
      }
      if (count === 1) {
        sql = sql.replace('?', 'x')
      }
      while (sql.includes('?')) {
        count++
        sql = sql.replace('?', 'x')
      }
      if (array.length < count) {
        error =
          'not enough parameter in array, expected ' +
          count +
          ', got ' +
          array.length
      } else if (array.length > count) {
        error =
          'too many parameter in array, expected ' +
          count +
          ', got ' +
          array.length
      }
    }
  }
  // check object parameters
  else {
    let symbols = ['@', ':', '$']
    for (let symbol of symbols) {
      if (sql.includes(symbol)) {
        if (!params) {
          error = 'missing object parameters'
        } else if (paramType !== 'object') {
          error = 'object parameters expected, got ' + paramType
        } else {
          let object = params as object
          let missing: string[] = []
          for (;;) {
            let start = sql.indexOf(symbol)
            if (start === -1) {
              break
            }
            let name = parseName(sql, start + 1)
            if (!name) {
              error = `missing parameter name after "${symbol}"`
              break
            }
            sql = replace(sql, start, start + name.length, 'x')
            if (!(name in object)) {
              missing.push(name)
            }
          }
          if (missing.length > 0) {
            error = 'missing parameter in object: ' + missing.join(', ')
          }
        }
      }
    }
  }

  let types: SqlType[] = []
  for (let type of sqlTypes) {
    if (sql.includes(type)) {
      types.push(type)
    }
  }
  let readonly =
    sql.length === 0 || (types.length === 1 && types[0] === 'select')

  return error ? { readonly, types, error } : { readonly, types }
}

function parseName(sql: string, start: number): string | null {
  let name = sql.slice(start).match(/^[a-zA-Z0-9_]+/)
  if (!name) {
    return null
  }
  return name[0]
}

function replaceStringValue(sql: string): string {
  let start = 0
  let end = 0
  main: for (;;) {
    sql = sql.trim()
    if (sql.length === 0) {
      break
    }

    let quotas = ['"', "'", '`']
    for (let quota of quotas) {
      start = sql.indexOf(quota)
      if (start !== -1) {
        end = sql.indexOf(quota, start + 1)
        if (end !== -1) {
          if (sql[end - 1] === '\\') {
            sql = replace(sql, end - 1, end, 'x')
            continue main
          }
          sql = replace(sql, start, end, 'x')
          continue main
        }
      }
    }

    break
  }
  return sql
}

function replace(
  sql: string,
  start: number,
  end: number,
  replacement: string,
): string {
  return sql.substring(0, start) + replacement + sql.substring(end + 1)
}
