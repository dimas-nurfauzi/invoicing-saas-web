import { describe, expect, it } from 'vitest'
import { parseDecimal, toInputDecimal } from './number-utils'

describe('parseDecimal', () => {
  it.each([
    ['1500000', '1500000'],
    ['1.500.000', '1500000'],
    ['1.500.000,50', '1500000.50'],
    ['1500000,5', '1500000.5'],
    ['1.500', '1500'],
    ['0,75', '0.75'],
    ['  12  ', '12'],
    ['007', '7'],
    ['0', '0'],
    ['000,10', '0.10'],
    // Beyond what a double holds: the digits survive.
    ['9.007.199.254.740.993,01', '9007199254740993.01'],
  ])('%j → %j', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected)
  })

  it.each([
    '',
    '1.5',
    '1500000.50',
    '1.50.000',
    '1,500,000',
    '1.500,000,5',
    ',5',
    '1,',
    '-1',
    '1e3',
    'abc',
    '1 500',
  ])('rejects %j', (input) => {
    expect(parseDecimal(input)).toBeNull()
  })
})

describe('toInputDecimal', () => {
  it.each([
    ['1500000.50', '1.500.000,50'],
    ['1500000.00', '1.500.000'],
    ['11.00', '11'],
    ['1.500', '1,500'],
    ['999', '999'],
    ['1000', '1.000'],
    ['0.75', '0,75'],
  ])('%j → %j', (input, expected) => {
    expect(toInputDecimal(input)).toBe(expected)
  })

  it.each([
    ['1.500', '1,5'],
    ['11.50', '11,5'],
    ['3.000', '3'],
    ['1250.000', '1.250'],
  ])('%j with trimZeros → %j', (input, expected) => {
    expect(toInputDecimal(input, { trimZeros: true })).toBe(expected)
  })

  it('is empty for missing values and leaves odd input alone', () => {
    expect(toInputDecimal(undefined)).toBe('')
    expect(toInputDecimal(null)).toBe('')
    expect(toInputDecimal('-5')).toBe('-5')
  })

  it.each([
    ['1500000.50', '1500000.50'],
    ['12071250.00', '12071250'],
    ['0.75', '0.75'],
    ['1.500', '1.500'],
  ])('%j round-trips through parseDecimal as %j', (api, back) => {
    expect(parseDecimal(toInputDecimal(api))).toBe(back)
  })
})
