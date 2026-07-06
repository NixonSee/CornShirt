export async function createResaleListing(userId: string, ticketId: string, price: number): Promise<{ body: unknown; status: number }> {
  return { body: null, status: 200 };
}
export async function cancelResaleListing(userId: string, listingId: string): Promise<{ body: unknown; status: number }> {
  return { body: null, status: 200 };
}
