import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetWishlistQueryDto } from './dto/get-wishlist-query.dto';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves paginated wishlist items for the authenticated user with product details.
   */
  async getUserWishlist(userId: string, query?: GetWishlistQueryDto) {
    const page = query?.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query?.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      product: {
        deletedAt: null,
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.wishlist.findMany({
        where,
        skip,
        take: limit,
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
      }),
      this.prisma.wishlist.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: items,
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

  /**
   * Adds a product to the user's wishlist idempotently using upsert.
   * Handles concurrent additions safely without unique constraint errors (P2002).
   */
  async addToWishlist(userId: string, productId: string) {
    // Check if product exists, is not soft-deleted, and has an active status.
    // Note: Out-of-stock products with active status remain wish-listable.
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        status: {
          slug: 'active',
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Product not found or is currently not available',
      );
    }

    const item = await this.prisma.wishlist.upsert({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      update: {},
      create: {
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
      item,
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
