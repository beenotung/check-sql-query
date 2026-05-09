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
} {
  sql = sql.trim().toLowerCase()
  sql = replaceStringValue(sql)

  let types: SqlType[] = []
  for (let type of sqlTypes) {
    if (sql.includes(type)) {
      types.push(type)
    }
  }
  let readonly =
    sql.length === 0 || (types.length === 1 && types[0] === 'select')
  return { readonly, types }
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
