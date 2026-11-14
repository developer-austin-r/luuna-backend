import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all wishlist items for the authenticated user with product details.
   */
  async getUserWishlist(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: {
        userId,
        product: {
          deletedAt: null,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: {
              orderBy: { displayOrder: 'asc' },
            },
            brand: true,
            status: true,
            productCategories: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    return items;
  }

  /**
   * Adds a product to the user's wishlist.
   * If already added, returns the existing record idempotently.
   */
  async addToWishlist(userId: string, productId: string) {
    // Check if product exists and is active
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if already in wishlist
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: { displayOrder: 'asc' },
            },
            brand: true,
            status: true,
          },
        },
      },
    });

    if (existing) {
      return {
        message: 'Product already in wishlist',
        item: existing,
      };
    }

    const created = await this.prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: { displayOrder: 'asc' },
            },
            brand: true,
            status: true,
          },
        },
      },
    });

    return {
      message: 'Product added to wishlist successfully',
      item: created,
    };
  }

  /**
   * Removes a product from the user's wishlist.
   */
  async removeFromWishlist(userId: string, productId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Product is not in your wishlist');
    }

    await this.prisma.wishlist.delete({
      where: {
        userId_productId: { userId, productId },
      },
    });

    return {
      success: true,
      message: 'Product removed from wishlist successfully',
      productId,
    };
  }

  /**
   * Checks whether a specific product is in the user's wishlist.
   */
  async checkWishlistStatus(userId: string, productId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
      select: { id: true },
    });

    return {
      productId,
      inWishlist: !!existing,
    };
  }

  /**
   * Clears all products from user's wishlist.
   */
  async clearWishlist(userId: string) {
    const { count } = await this.prisma.wishlist.deleteMany({
      where: { userId },
    });

    return {
      success: true,
      message: 'Wishlist cleared successfully',
      deletedCount: count,
    };
  }
}
