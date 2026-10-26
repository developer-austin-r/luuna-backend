import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserReviewDto } from './dto/create-user-review.dto';
import { UpdateUserReviewStatusDto } from './dto/update-user-review-status.dto';

@Injectable()
export class UserReviewService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.userReview.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        productId: true,
        starRate: true,
        review: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, dto: UpdateUserReviewStatusDto) {
    const review = await this.prisma.userReview.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException(`User review with ID "${id}" not found`);
    }

    return this.prisma.userReview.update({
      where: { id },
      data: { status: dto.status },
      select: {
        id: true,
        userId: true,
        productId: true,
        starRate: true,
        review: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(userId: string, dto: CreateUserReviewDto) {
    const [user, product] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: { id: true },
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    if (!product) {
      throw new NotFoundException(
        `Product with ID "${dto.productId}" not found`,
      );
    }

    return this.prisma.userReview.create({
      data: {
        userId,
        productId: product.id,
        starRate: dto.starRate,
        review: dto.review,
      },
      select: {
        id: true,
        userId: true,
        productId: true,
        starRate: true,
        review: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
