import { expect } from 'chai'
import { checkSqlQuery } from '.'

describe('checkSqlQuery', () => {
  describe('single level sql query/command', () => {
    it('should detect select query', () => {
      let result = checkSqlQuery('select * from users')
      expect(result).to.deep.equal({
        readonly: true,
        types: ['select'],
      })
    })
    it('should detect insert query', () => {
      let result = checkSqlQuery(
        'insert into users (name, email) values ("John Doe", "john.doe@example.com")',
      )
      expect(result).to.deep.equal({
        readonly: false,
        types: ['insert'],
      })
    })
    it('should detect update query', () => {
      let result = checkSqlQuery(
        'update users set name = "John Doe" where id = 1',
      )
      expect(result).to.deep.equal({
        readonly: false,
        types: ['update'],
      })
    })
    it('should detect delete query', () => {
      let result = checkSqlQuery('delete from users where id = 1')
      expect(result).to.deep.equal({
        readonly: false,
        types: ['delete'],
      })
    })
    it('should detect create table command', () => {
      let result = checkSqlQuery(
        'create table users (id int primary key, name varchar(255))',
      )
      expect(result).to.deep.equal({
        readonly: false,
        types: ['create'],
      })
    })
    it('should detect create index command', () => {
      let result = checkSqlQuery('create index idx_users_name on users (name)')
      expect(result).to.deep.equal({
        readonly: false,
        types: ['create'],
      })
    })
    it('should detect alter table command', () => {
      let result = checkSqlQuery(
        'alter table users add column email varchar(255)',
      )
      expect(result).to.deep.equal({
        readonly: false,
        types: ['alter'],
      })
    })
    it('should detect drop table command', () => {
      let result = checkSqlQuery('drop table users')
      expect(result).to.deep.equal({
        readonly: false,
        types: ['drop'],
      })
    })
    it('should detect pragma command', () => {
      // disable foreign key checks
      let result = checkSqlQuery('pragma foreign_keys = off;')
      expect(result).to.deep.equal({
        readonly: false,
        types: ['pragma'],
      })
    })
    it('should detect attach command', () => {
      let result = checkSqlQuery('attach database "users.db" as users')
      expect(result).to.deep.equal({
        readonly: false,
        types: ['attach'],
      })
    })
    it('should detect detach command', () => {
      let result = checkSqlQuery('detach database users')
      expect(result).to.deep.equal({
        readonly: false,
        types: ['detach'],
      })
    })
    it('should detect replace command', () => {
      let result = checkSqlQuery(
        'replace into users (id, name) values (1, "John Doe")',
      )
      expect(result).to.deep.equal({
        readonly: false,
        types: ['replace'],
      })
    })
    it('should detect truncate command', () => {
      let result = checkSqlQuery('truncate table users')
      expect(result).to.deep.equal({
        readonly: false,
        types: ['truncate'],
      })
    })
    it('should detect vacuum command', () => {
      let result = checkSqlQuery('vacuum')
      expect(result).to.deep.equal({
        readonly: false,
        types: ['vacuum'],
      })
    })
    it('should detect vacuum into command', () => {
      let result = checkSqlQuery('vacuum into "users.db"')
      expect(result).to.deep.equal({
        readonly: false,
        types: ['vacuum'],
      })
    })
  })
  describe('subquery', () => {
    it('should detect select in subquery', () => {
      let result = checkSqlQuery(
        'select * from (select * from users) where id = 1',
      )
      expect(result).to.deep.equal({
        readonly: true,
        types: ['select'],
      })
    })
    it('should detect insert in subquery', () => {
      let result = checkSqlQuery(
        'select * from users where id in (insert into users (name, email) values ("John Doe", "john.doe@example.com") returning id)',
      )
      expect(result).to.deep.equal({
        readonly: false,
        types: ['select', 'insert'],
      })
    })
    it('should detect delete in subquery', () => {
      let result = checkSqlQuery(
        'select * from users where id in (delete from users where id = 1 returning id)',
      )
      expect(result).to.deep.equal({
        readonly: false,
        types: ['select', 'delete'],
      })
    })
    it('should update in subquery', () => {
      let result = checkSqlQuery(
        'select * from users where id in (update users set name = "John Doe" where id = 1 returning id)',
      )
      expect(result).to.deep.equal({
        readonly: false,
        types: ['select', 'update'],
      })
    })
  })
  describe('string payload', () => {
    describe('without escape', () => {
      function test(name: string, value: string) {
        it(`string in ${name}`, () => {
          // select with "update" in where condition
          let result = checkSqlQuery(
            `select * from users where message like ${value} and 1`,
          )
          expect(result).to.deep.equal({
            readonly: true,
            types: ['select'],
          })
        })
      }
      test('double quotes', '"%update%"')
      test('single quotes', "'%update\'%'")
      test('backticks', '`%update%`')
    })
    describe('with escape', () => {
      function test(name: string, value: string) {
        it(`string in ${name}`, () => {
          let result = checkSqlQuery(
            `select * from users where message like ${value} and 1`,
          )
          expect(result).to.deep.equal({
            readonly: true,
            types: ['select'],
          })
        })
      }
      test('double quotes', '"%\\"update%"')
      test('single quotes', "'%\\'update%'")
      test('backticks', '`%\\`update%`')
    })
  })
  describe('missing parameter', () => {
    function testArrayParameters(name: string, sql: string) {
      describe(`${name} array parameters`, () => {
        it('should pass when parameters are enough', () => {
          let result = checkSqlQuery(sql, ['alice', 'admin'])
          expect(result).to.deep.equal({
            readonly: true,
            types: ['select'],
          })
        })
        it('should fail when missing parameters entirely', () => {
          let result = checkSqlQuery(sql)
          expect(result).to.deep.equal({
            readonly: true,
            types: ['select'],
            error: 'missing array parameters',
          })
        })
        it('should fail when parameters are not enough', () => {
          let result = checkSqlQuery(sql, ['alice'])
          expect(result).to.deep.equal({
            readonly: true,
            types: ['select'],
            error: 'not enough parameter in array, expected 2, got 1',
          })
        })
        it('should fail when parameters are too many', () => {
          let result = checkSqlQuery(sql, ['alice', 'admin', 'admin'])
          expect(result).to.deep.equal({
            readonly: true,
            types: ['select'],
            error: 'too many parameter in array, expected 2, got 3',
          })
        })
      })
    }
    testArrayParameters(
      '"$1" style',
      'select * from users where username = $1 and role = $2',
    )
    testArrayParameters(
      '"?" style',
      'select * from users where username = ? and role = ?',
    )

    function testObjectParameters(symbol: string) {
      describe(`"${symbol}key" style object parameters`, () => {
        let sql = `select * from users where username = ${symbol}username and role = ${symbol}role`
        it('should pass when parameters are enough', () => {
          let result = checkSqlQuery(sql, { username: 'alice', role: 'admin' })
          expect(result).to.deep.equal({
            readonly: true,
            types: ['select'],
          })
        })
        it('should fail when missing parameters entirely', () => {
          let result = checkSqlQuery(sql)
          expect(result).to.deep.equal({
            readonly: true,
            types: ['select'],
            error: 'missing object parameters',
          })
        })
        it('should fail when missing some parameters', () => {
          let result = checkSqlQuery(sql, { username: 'alice' })
          expect(result).to.deep.equal({
            readonly: true,
            types: ['select'],
            error: 'missing parameter in object: role',
          })

          result = checkSqlQuery(sql, {})
          expect(result).to.deep.equal({
            readonly: true,
            types: ['select'],
            error: 'missing parameter in object: username, role',
          })
        })
        it('should ignore extra parameters', () => {
          let result = checkSqlQuery(sql, {
            username: 'alice',
            role: 'admin',
            role2: 'admin',
          })
          expect(result).to.deep.equal({
            readonly: true,
            types: ['select'],
          })
        })
      })
    }
    testObjectParameters('@')
    testObjectParameters(':')
    testObjectParameters('$')
  })
  describe('mixed parameters', () => {
    it('should fail when mixed "$1" and "?" style parameters', () => {
      let result = checkSqlQuery(
        'select * from users where username = $1 and role = ?',
        ['alice'],
      )
      expect(result).to.deep.equal({
        readonly: true,
        types: ['select'],
        error: 'mixed "$1" and "?" style parameters',
      })
    })
  })
})
