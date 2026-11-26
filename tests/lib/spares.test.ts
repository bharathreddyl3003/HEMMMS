// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { deductSparePartsInTx } from '@/lib/spares'

function createMockTx(initialStock: Record<string, { id: string; name: string; partNumber: string; stockQuantity: number; reorderLevel: number }>) {
  const store = structuredClone(initialStock)
  return {
    store,
    tx: {
      sparePart: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          return store[where.id] ? { ...store[where.id] } : null
        }),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: { stockQuantity: { decrement: number } } }) => {
          const item = store[where.id]
          item.stockQuantity -= data.stockQuantity.decrement
          return { ...item }
        }),
      },
    } as unknown as Parameters<typeof deductSparePartsInTx>[0],
  }
}

describe('lib/spares - deductSparePartsInTx', () => {
  it('handles empty or null deductedParts with and without manual notes', async () => {
    const { tx } = createMockTx({})

    const emptyRes = await deductSparePartsInTx(tx, null, null)
    expect(emptyRes).toEqual({ formattedPartsUsed: null, lowStockAlerts: [] })

    const manualRes = await deductSparePartsInTx(tx, [], '  Grease 2kg, Cotton Waste  ')
    expect(manualRes).toEqual({
      formattedPartsUsed: 'Grease 2kg, Cotton Waste',
      lowStockAlerts: [],
    })
  })

  it('aggregates duplicate selections, deducts stock, and formats partsUsed', async () => {
    const { tx, store } = createMockTx({
      p1: { id: 'p1', name: 'Engine Oil Filter', partNumber: 'LF-9009', stockQuantity: 15, reorderLevel: 4 },
      p2: { id: 'p2', name: '15W40 Oil Drum', partNumber: 'OIL-15W40', stockQuantity: 8, reorderLevel: 2 },
    })

    const res = await deductSparePartsInTx(
      tx,
      [
        { sparePartId: 'p1', quantity: 2 },
        { sparePartId: 'p1', quantity: 1 },
        { sparePartId: 'p2', quantity: 2 },
      ],
      'Shop rags'
    )

    expect(store.p1.stockQuantity).toBe(12)
    expect(store.p2.stockQuantity).toBe(6)
    expect(res.formattedPartsUsed).toBe(
      'Engine Oil Filter [LF-9009] x3, 15W40 Oil Drum [OIL-15W40] x2, Shop rags'
    )
    expect(res.lowStockAlerts).toEqual([])
  })

  it('triggers lowStockAlerts when stock drops to or below reorderLevel', async () => {
    const { tx } = createMockTx({
      p1: { id: 'p1', name: 'Fuel Filter', partNumber: 'FF-500', stockQuantity: 6, reorderLevel: 5 },
      p2: { id: 'p2', name: 'Hydraulic Filter', partNumber: 'HF-10', stockQuantity: 3, reorderLevel: 2 },
    })

    const res = await deductSparePartsInTx(tx, [
      { sparePartId: 'p1', quantity: 1 }, // hits exact reorderLevel 5
      { sparePartId: 'p2', quantity: 2 }, // drops to 1 (< 2)
    ])

    expect(res.lowStockAlerts).toHaveLength(2)
    expect(res.lowStockAlerts[0]).toEqual({
      id: 'p1',
      name: 'Fuel Filter',
      partNumber: 'FF-500',
      stockQuantity: 5,
      reorderLevel: 5,
      suggestedOrderQty: 5, // max(10, 10) - 5
    })
    expect(res.lowStockAlerts[1]).toEqual({
      id: 'p2',
      name: 'Hydraulic Filter',
      partNumber: 'HF-10',
      stockQuantity: 1,
      reorderLevel: 2,
      suggestedOrderQty: 6, // max(4, 7) - 1
    })
  })

  it('rejects invalid sparePartId, zero/negative, or fractional quantities', async () => {
    const { tx } = createMockTx({})

    await expect(
      deductSparePartsInTx(tx, [{ sparePartId: '', quantity: 1 }])
    ).rejects.toThrow('Invalid spare part selection')

    await expect(
      deductSparePartsInTx(tx, [{ sparePartId: 'p1', quantity: 0 }])
    ).rejects.toThrow('must be a positive integer')

    await expect(
      deductSparePartsInTx(tx, [{ sparePartId: 'p1', quantity: -2 }])
    ).rejects.toThrow('must be a positive integer')

    await expect(
      deductSparePartsInTx(tx, [{ sparePartId: 'p1', quantity: 1.5 }])
    ).rejects.toThrow('must be a positive integer')
  })

  it('throws when spare part is not found or stock is insufficient', async () => {
    const { tx, store } = createMockTx({
      p1: { id: 'p1', name: 'Air Filter', partNumber: 'AF-1', stockQuantity: 2, reorderLevel: 1 },
    })

    await expect(
      deductSparePartsInTx(tx, [{ sparePartId: 'missing', quantity: 1 }])
    ).rejects.toThrow('Spare part not found')

    await expect(
      deductSparePartsInTx(tx, [{ sparePartId: 'p1', quantity: 3 }])
    ).rejects.toThrow('Insufficient stock for Air Filter (AF-1): available 2, requested 3')

    expect(store.p1.stockQuantity).toBe(2)
  })
})
