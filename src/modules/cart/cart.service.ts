import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import { StorageService } from '../../common/storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';

export const CART_COOKIE_AGE = 30 * 24 * 60 * 60 * 1000;

export type CartChange =
  | { kind: 'add' | 'set'; productId: string; quantity: number }
  | { kind: 'remove'; productId: string };

const productSelect = {
  id: true,
  name: true,
  finalPrice: true,
  availableStock: true,
  deletedAt: true,
  status: { select: { slug: true } },
  images: {
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    take: 1,
    select: { displayUrl: true, imageUrl: true, originalUrl: true },
  },
} satisfies Prisma.ProductSelect;

const itemSelect = {
  quantity: true,
  product: { select: productSelect },
} satisfies Prisma.CartItemSelect;

type CartProduct = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function stockFor(product: CartProduct) {
  return product.deletedAt === null && product.status.slug === 'active'
    ? Math.max(0, product.availableStock)
    : 0;
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async access(userId?: string, guestToken?: string, change?: CartChange) {
    const guestTokenHash = guestToken ? hashToken(guestToken) : undefined;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const result = await this.prisma.$transaction(
          async (tx) => {
            const guest = guestTokenHash
              ? await tx.cart.findFirst({
                  where: { guestTokenHash, expiresAt: { gt: new Date() } },
                  select: { id: true },
                })
              : null;

            let cart = userId
              ? await tx.cart.findUnique({
                  where: { userId },
                  select: { id: true },
                })
              : guest;
            let newToken: string | undefined;
            const notices: string[] = [];

            if (userId && guest) {
              cart ??= await tx.cart.create({
                data: { userId },
                select: { id: true },
              });
              await this.merge(tx, guest.id, cart.id, notices);
            }

            if (!cart && change?.kind === 'add') {
              if (userId) {
                cart = await tx.cart.create({
                  data: { userId },
                  select: { id: true },
                });
              } else {
                newToken = randomBytes(32).toString('hex');
                cart = await tx.cart.create({
                  data: {
                    guestTokenHash: hashToken(newToken),
                    expiresAt: new Date(Date.now() + CART_COOKIE_AGE),
                  },
                  select: { id: true },
                });
              }
            }

            if (change?.kind === 'set' && !cart)
              throw new NotFoundException('Cart item not found');
            if (cart && change) await this.applyChange(tx, cart.id, change);
            const items = cart
              ? await tx.cartItem.findMany({
                  where: { cartId: cart.id },
                  orderBy: [{ createdAt: 'asc' }, { productId: 'asc' }],
                  select: itemSelect,
                })
              : [];

            return {
              items,
              notices,
              newToken,
              hasGuestCart: Boolean(!userId && cart),
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return {
          ...result,
          items: result.items.map(({ product, quantity }) => {
            const image = product.images[0];
            const imagePath =
              image?.displayUrl || image?.imageUrl || image?.originalUrl;
            const availableStock = stockFor(product);
            return {
              id: product.id,
              name: product.name,
              price: Number(product.finalPrice),
              quantity,
              image: imagePath
                ? /^https?:\/\//i.test(imagePath)
                  ? imagePath
                  : this.storage.generatePublicUrl(imagePath)
                : null,
              availableStock,
            };
          }),
        };
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2034' || error.code === 'P2002');
        if (!retryable) throw error;
        if (attempt === 3)
          throw new ServiceUnavailableException(
            'Your cart changed concurrently. Please try again.',
          );
      }
    }
    throw new ServiceUnavailableException('Could not load your cart.');
  }

  private async applyChange(
    tx: Prisma.TransactionClient,
    cartId: string,
    change: CartChange,
  ) {
    const key = { cartId, productId: change.productId };
    if (change.kind === 'remove') {
      await tx.cartItem.deleteMany({ where: key });
      return;
    }

    const line = await tx.cartItem.findUnique({
      where: { cartId_productId: key },
    });
    if (change.kind === 'set' && !line)
      throw new NotFoundException('Cart item not found');

    const product = await tx.product.findUnique({
      where: { id: change.productId },
      select: productSelect,
    });
    if (!product || product.deletedAt !== null)
      throw new NotFoundException('Product not found');
    const limit = stockFor(product);
    const quantity =
      change.kind === 'add'
        ? (line?.quantity ?? 0) + change.quantity
        : change.quantity;
    if (quantity > limit) {
      throw new ConflictException(
        limit
          ? `Only ${limit} currently available.`
          : 'This product is unavailable.',
      );
    }

    await tx.cartItem.upsert({
      where: { cartId_productId: key },
      create: { ...key, quantity },
      update: { quantity },
    });
  }

  private async merge(
    tx: Prisma.TransactionClient,
    guestId: string,
    accountId: string,
    notices: string[],
  ) {
    const [incoming, existing] = await Promise.all([
      tx.cartItem.findMany({ where: { cartId: guestId }, select: itemSelect }),
      tx.cartItem.findMany({
        where: { cartId: accountId },
        select: { productId: true, quantity: true },
      }),
    ]);
    const quantities = new Map(
      existing.map((item) => [item.productId, item.quantity]),
    );

    for (const { product, quantity } of incoming) {
      const current = quantities.get(product.id) ?? 0;
      const toAdd = Math.min(
        quantity,
        Math.max(0, stockFor(product) - current),
      );
      if (toAdd < quantity) {
        notices.push(
          `${product.name}: added ${toAdd} of ${quantity} guest cart items due to availability.`,
        );
      }
      if (!toAdd) continue;

      await tx.cartItem.upsert({
        where: {
          cartId_productId: { cartId: accountId, productId: product.id },
        },
        create: { cartId: accountId, productId: product.id, quantity: toAdd },
        update: { quantity: current + toAdd },
      });
    }

    await tx.cart.delete({ where: { id: guestId } });
  }
}
