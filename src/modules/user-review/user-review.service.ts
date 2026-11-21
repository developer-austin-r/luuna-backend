import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserReviewDto } from './dto/create-user-review.dto';
import { UpdateUserReviewStatusDto } from './dto/update-user-review-status.dto';
import {
  type ReviewImageUpload,
  ReviewImagesService,
} from './review-images.service';

const pageSize = 6;

@Injectable()
export class UserReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ReviewImagesService,
  ) {}

  async findAll() {
    const reviews = await this.prisma.userReview.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        productId: true,
        starRate: true,
        title: true,
        review: true,
        imageKeys: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { email: true } },
        product: { select: { name: true } },
      },
    });

    return Promise.all(
      reviews.map(async ({ imageKeys, ...review }) => ({
        ...review,
        images: await this.images.getLinks(imageKeys),
      })),
    );
  }

  async findApproved(productId: string, page: number) {
    await this.requireProduct(productId);
    const where: Prisma.UserReviewWhereInput = {
      productId,
      deletedAt: null,
      status: 'APPROVED',
      product: { deletedAt: null },
    };
    const ratingGroups = {
      by: ['starRate'],
      orderBy: { starRate: 'desc' },
      where,
      _count: { _all: true },
    } satisfies Prisma.UserReviewGroupByArgs;
    const groupedRatings = this.prisma.userReview.groupBy(ratingGroups);

    const [reviews, ratings] = await this.prisma.$transaction(
      [
        this.prisma.userReview.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            starRate: true,
            title: true,
            review: true,
            imageKeys: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        }),
        groupedRatings,
      ],
      { isolationLevel: 'RepeatableRead' },
    );

    const count = ratings.reduce((sum, rating) => sum + rating._count._all, 0);
    const stars = ratings.reduce(
      (sum, rating) => sum + rating.starRate * rating._count._all,
      0,
    );
    return {
      reviews: await Promise.all(
        reviews.map(async ({ imageKeys, user, ...review }) => ({
          ...review,
          author: user.name?.trim().split(/\s+/)[0] || 'Luuna customer',
          images: await this.images.getLinks(imageKeys),
        })),
      ),
      summary: {
        count,
        average: count ? stars / count : 0,
        breakdown: [5, 4, 3, 2, 1].map((stars) => ({
          stars,
          count:
            ratings.find(({ starRate }) => starRate === stars)?._count._all ??
            0,
        })),
      },
      page,
      totalPages: Math.ceil(count / pageSize),
    };
  }

  async updateStatus(id: string, dto: UpdateUserReviewStatusDto) {
    const review = await this.prisma.userReview.updateManyAndReturn({
      where: { id, deletedAt: null },
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

    if (!review[0]) {
      throw new NotFoundException(`User review with ID "${id}" not found`);
    }
    return review[0];
  }

  async create(
    userId: string,
    dto: CreateUserReviewDto,
    files: ReviewImageUpload[] = [],
  ) {
    const [user, product] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      this.requireProduct(dto.productId),
    ]);

    if (!user) throw new NotFoundException('User not found');

    const imageKeys = await this.images.upload(user.id, product.id, files);
    try {
      return await this.prisma.userReview.create({
        data: {
          userId: user.id,
          productId: product.id,
          starRate: dto.starRate,
          title: dto.title?.trim() || null,
          review: dto.review?.trim() || null,
          imageKeys,
          status: 'PENDING',
        },
        select: {
          id: true,
          userId: true,
          productId: true,
          starRate: true,
          title: true,
          review: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      await this.images.remove(imageKeys);
      throw error;
    }
  }

  private async requireProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
