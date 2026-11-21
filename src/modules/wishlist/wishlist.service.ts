import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { GetWishlistQueryDto } from './dto/get-wishlist-query.dto';

export const WISHLIST_COOKIE_AGE = 30 * 24 * 60 * 60 * 1000;

export type WishlistAction =
  | { kind: 'list'; query: GetWishlistQueryDto }
  | { kind: 'check' | 'add' | 'remove'; productId: string }
  | { kind: 'summary' | 'clear' };

const itemSelect = {
  id: true,
  userId: true,
  productId: true,
  createdAt: true,
  product: {
    include: {
      images: { orderBy: { displayOrder: 'asc' } },
      brand: true,
      status: true,
      productCategories: { include: { category: true } },
    },
  },
} satisfies Prisma.WishlistSelect;

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async access(action: WishlistAction, userId?: string, guestToken?: string) {
    const token =
      guestToken ??
      (!userId && action.kind === 'add'
        ? randomBytes(32).toString('hex')
        : undefined);
    const guestTokenHash = token
      ? createHash('sha256').update(token).digest('hex')
      : undefined;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const now = new Date();
            const guest = guestTokenHash
              ? { guestTokenHash, expiresAt: { gt: now } }
              : undefined;
            if (userId && guest) await this.mergeGuest(tx, userId, guest);

            const owner: Prisma.WishlistWhereInput = userId
              ? { userId }
              : (guest ?? { id: { in: [] } });
            const visible = { ...owner, product: { deletedAt: null } };
            const data = await this.execute(
              tx,
              action,
              owner,
              visible,
              userId,
              guestTokenHash,
              now,
            );

            return {
              data,
              cookie: !userId && action.kind === 'add' ? token : undefined,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          !['P2002', 'P2034'].includes(error.code)
        ) {
          throw error;
        }
        if (attempt === 3)
          throw new ServiceUnavailableException(
            'Your wishlist changed concurrently. Please try again.',
          );
      }
    }
    throw new ServiceUnavailableException('Could not load your wishlist.');
  }

  private async execute(
    tx: Prisma.TransactionClient,
    action: WishlistAction,
    owner: Prisma.WishlistWhereInput,
    visible: Prisma.WishlistWhereInput,
    userId: string | undefined,
    guestTokenHash: string | undefined,
    now: Date,
  ) {
    switch (action.kind) {
      case 'summary':
        return this.summary(tx, visible);
      case 'list': {
        const page = action.query.page ?? 1;
        const limit = action.query.limit ?? 10;
        const items = await tx.wishlist.findMany({
          where: visible,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: itemSelect,
        });
        const total = await tx.wishlist.count({ where: visible });
        const totalPages = Math.max(1, Math.ceil(total / limit));
        return {
          data: items,
          authenticated: Boolean(userId),
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        };
      }
      case 'check': {
        const item = await tx.wishlist.findFirst({
          where: { ...visible, productId: action.productId },
          select: { id: true },
        });
        return { productId: action.productId, inWishlist: Boolean(item) };
      }
      case 'add': {
        const productId = action.productId;
        const product = await tx.product.findFirst({
          where: { id: productId, deletedAt: null, status: { slug: 'active' } },
          select: { id: true },
        });
        if (!product)
          throw new NotFoundException('Product not found or unavailable.');
        const expiresAt = new Date(now.getTime() + WISHLIST_COOKIE_AGE);
        if (!userId && guestTokenHash) {
          await tx.wishlist.deleteMany({
            where: { guestTokenHash, expiresAt: { lte: now } },
          });
          await tx.wishlist.updateMany({ where: owner, data: { expiresAt } });
        }
        await tx.wishlist.createMany({
          data: userId
            ? { userId, productId }
            : { guestTokenHash, productId, expiresAt },
          skipDuplicates: true,
        });
        const item = await tx.wishlist.findFirstOrThrow({
          where: { ...owner, productId },
          select: itemSelect,
        });
        return {
          message: 'Product added to wishlist',
          item,
          ...(await this.summary(tx, visible)),
        };
      }
      case 'remove':
        await tx.wishlist.deleteMany({
          where: { ...owner, productId: action.productId },
        });
        return {
          success: true,
          message: 'Product removed from wishlist',
          productId: action.productId,
          ...(await this.summary(tx, visible)),
        };
      case 'clear': {
        const { count } = await tx.wishlist.deleteMany({ where: owner });
        return {
          success: true,
          message: 'Wishlist cleared',
          deletedCount: count,
          productIds: [],
        };
      }
    }
  }

  private async summary(
    tx: Prisma.TransactionClient,
    where: Prisma.WishlistWhereInput,
  ) {
    const rows = await tx.wishlist.findMany({
      where,
      select: { productId: true },
    });
    return { productIds: rows.map(({ productId }) => productId) };
  }

  private async mergeGuest(
    tx: Prisma.TransactionClient,
    userId: string,
    guest: { guestTokenHash: string; expiresAt: { gt: Date } },
  ) {
    const rows = await tx.wishlist.findMany({
      where: { ...guest, product: { deletedAt: null } },
      select: { productId: true, createdAt: true },
    });
    if (rows.length) {
      await tx.wishlist.createMany({
        data: rows.map((row) => ({ ...row, userId })),
        skipDuplicates: true,
      });
    }
    await tx.wishlist.deleteMany({
      where: { guestTokenHash: guest.guestTokenHash },
    });
  }
}
