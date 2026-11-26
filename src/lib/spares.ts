import { Prisma } from '@prisma/client'

export interface DeductedPartInput {
  sparePartId: string
  quantity: number
}

export interface LowStockAlert {
  id: string
  name: string
  partNumber: string
  stockQuantity: number
  reorderLevel: number
  suggestedOrderQty: number
}

/**
 * Atomically deducts selected spare parts from inventory within a Prisma transaction,
 * builds a human-readable partsUsed string, and collects any low-stock alerts.
 */
export async function deductSparePartsInTx(
  tx: Prisma.TransactionClient,
  deductedParts: DeductedPartInput[] | undefined | null,
  manualPartsUsed?: string | null
): Promise<{
  formattedPartsUsed: string | null
  lowStockAlerts: LowStockAlert[]
}> {
  const inputParts = deductedParts || []
  const summaryItems: string[] = []
  const lowStockAlerts: LowStockAlert[] = []

  // Aggregate and strictly validate sparePartId + positive integer quantity
  const aggregated = new Map<string, number>()
  for (const item of inputParts) {
    if (!item || typeof item.sparePartId !== 'string' || !item.sparePartId.trim()) {
      throw new Error('Invalid spare part selection: sparePartId is required')
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid spare part quantity (${item.quantity}): must be a positive integer`)
    }
    const id = item.sparePartId.trim()
    aggregated.set(id, (aggregated.get(id) || 0) + item.quantity)
  }

  for (const [sparePartId, quantity] of aggregated.entries()) {
    const spare = await tx.sparePart.findUnique({
      where: { id: sparePartId }
    })

    if (!spare) {
      throw new Error(`Spare part not found (ID: ${sparePartId})`)
    }

    if (spare.stockQuantity < quantity) {
      throw new Error(
        `Insufficient stock for ${spare.name} (${spare.partNumber}): available ${spare.stockQuantity}, requested ${quantity}`
      )
    }

    const updated = await tx.sparePart.update({
      where: { id: sparePartId },
      data: {
        stockQuantity: {
          decrement: quantity
        }
      }
    })

    summaryItems.push(`${updated.name} [${updated.partNumber}] x${quantity}`)

    if (updated.stockQuantity <= updated.reorderLevel) {
      const targetStock = Math.max(updated.reorderLevel * 2, updated.reorderLevel + 5)
      lowStockAlerts.push({
        id: updated.id,
        name: updated.name,
        partNumber: updated.partNumber,
        stockQuantity: updated.stockQuantity,
        reorderLevel: updated.reorderLevel,
        suggestedOrderQty: Math.max(1, targetStock - updated.stockQuantity)
      })
    }
  }

  const trimmedManual = manualPartsUsed?.trim()
  if (trimmedManual) {
    summaryItems.push(trimmedManual)
  }

  return {
    formattedPartsUsed: summaryItems.length > 0 ? summaryItems.join(', ') : null,
    lowStockAlerts
  }
}
