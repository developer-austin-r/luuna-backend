import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignBrandDto,
  AssignCategoriesDto,
  CreateProductDto,
  CreateProductImageDto,
  CreateProductKeywordDto,
  CreateProductVideoDto,
  ProductQueryDto,
  UpdateInventoryDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeBigInt<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_, value: unknown) => {
        if (typeof value === 'bigint') {
          return Number.isSafeInteger(Number(value))
            ? Number(value)
            : value.toString();
        }
        return value;
      }),
    ) as T;
  }

  /**
   * Get paginated list of products with filters, search, and sorting.
   */
  async findAll(query: ProductQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      brandId,
      categoryId,
      status,
      archive,
      includeDeleted = false,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(status !== undefined ? { status } : {}),
      ...(archive !== undefined ? { archive } : {}),
      ...(brandId ? { brandId } : {}),
      ...(categoryId
        ? {
            productCategories: {
              some: {
                categoryId,
              },
            },
          }
        : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            finalPrice: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          brand: true,
          productCategories: {
            include: {
              category: true,
            },
          },
          images: {
            orderBy: { displayOrder: 'asc' },
          },
          videos: true,
          inventories: true,
          keywords: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return this.serializeBigInt({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  }

  /**
   * Get single product by ID with full relations.
   */
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        productCategories: {
          include: {
            category: true,
          },
        },
        images: {
          orderBy: { displayOrder: 'asc' },
        },
        videos: true,
        inventories: true,
        keywords: true,
      },
    });

    if (!product || product.deletedAt !== null) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return this.serializeBigInt(product);
  }

  /**
   * Create a new product with relations in a transaction.
   */
  async create(createProductDto: CreateProductDto) {
    const {
      sku,
      slug,
      brandId,
      brandName,
      categoryIds,
      images,
      videos,
      keywords,
      warehouse,
      stock = 0,
      reservedStock = 0,
      availableStock,
      basePrice,
      discountPrice,
      taxPercentage = 0,
      rating = 0,
      ...productData
    } = createProductDto;

    // Business validations
    if (
      discountPrice !== undefined &&
      discountPrice !== null &&
      discountPrice > basePrice
    ) {
      throw new BadRequestException(
        'Discount price must be less than or equal to base price',
      );
    }

    if (reservedStock > stock) {
      throw new BadRequestException(
        'Reserved stock must not exceed total stock',
      );
    }

    if (taxPercentage < 0 || taxPercentage > 100) {
      throw new BadRequestException('Tax percentage must be between 0 and 100');
    }

    if (rating < 0 || rating > 5) {
      throw new BadRequestException('Rating must be between 0 and 5');
    }

    if (images && images.length > 7) {
      throw new BadRequestException(
        'Enforced limit of maximum 7 images per product',
      );
    }

    if (videos && videos.length > 1) {
      throw new BadRequestException(
        'Enforced limit of maximum 1 video per product',
      );
    }

    // Check for SKU / Slug conflicts
    const existing = await this.prisma.product.findFirst({
      where: {
        OR: [{ sku }, { slug }],
      },
    });

    if (existing) {
      if (existing.sku === sku) {
        throw new ConflictException(`Product with SKU "${sku}" already exists`);
      }
      if (existing.slug === slug) {
        throw new ConflictException(
          `Product with Slug "${slug}" already exists`,
        );
      }
    }

    // Verify brand if provided directly via brandId
    if (brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: brandId },
      });
      if (!brand) {
        throw new BadRequestException(`Brand with ID "${brandId}" not found`);
      }
    }

    // Verify categories if provided
    if (categoryIds && categoryIds.length > 0) {
      const uniqueCategoryIds = Array.from(new Set(categoryIds));
      const categoriesCount = await this.prisma.category.count({
        where: {
          id: { in: uniqueCategoryIds },
          isDeleted: false,
        },
      });
      if (categoriesCount !== uniqueCategoryIds.length) {
        throw new BadRequestException(
          'One or more category IDs are invalid or deleted',
        );
      }
    }

    const calculatedAvailableStock =
      availableStock !== undefined ? availableStock : stock - reservedStock;

    // Perform atomic transaction
    return this.prisma.$transaction(async (tx) => {
      let finalBrandId = brandId;
      if (brandName && brandName.trim()) {
        const existingBrand = await tx.brand.findFirst({
          where: { name: { equals: brandName.trim(), mode: 'insensitive' } },
        });
        if (existingBrand) {
          finalBrandId = existingBrand.id;
        } else {
          const newBrand = await tx.brand.create({
            data: { name: brandName.trim(), status: true },
          });
          finalBrandId = newBrand.id;
        }
      }

      const product = await tx.product.create({
        data: {
          ...productData,
          sku,
          slug,
          brandId: finalBrandId,
          basePrice: new Prisma.Decimal(basePrice),
          discountPrice:
            discountPrice !== undefined && discountPrice !== null
              ? new Prisma.Decimal(discountPrice)
              : null,
          taxPercentage: new Prisma.Decimal(taxPercentage),
          finalPrice:
            discountPrice !== undefined && discountPrice !== null
              ? new Prisma.Decimal(discountPrice)
              : new Prisma.Decimal(basePrice),
          stock,
          reservedStock,
          availableStock: calculatedAvailableStock,
          rating,
          ...(categoryIds && categoryIds.length > 0
            ? {
                productCategories: {
                  create: categoryIds.map((catId) => ({ categoryId: catId })),
                },
              }
            : {}),
          ...(images && images.length > 0
            ? {
                images: {
                  create: images.map((img) => ({
                    imageUrl: img.imageUrl,
                    displayOrder: img.displayOrder,
                  })),
                },
              }
            : {}),
          ...(videos && videos.length > 0
            ? {
                videos: {
                  create: videos.map((v) => ({
                    videoUrl: v.videoUrl,
                    fileSize: v.fileSize ? BigInt(v.fileSize) : null,
                  })),
                },
              }
            : {}),
          ...(keywords && keywords.length > 0
            ? {
                keywords: {
                  create: keywords.map((kw) => ({ keyword: kw })),
                },
              }
            : {}),
          ...(warehouse || stock > 0
            ? {
                inventories: {
                  create: {
                    totalStock: stock,
                    reservedStock,
                    availableStock: calculatedAvailableStock,
                    warehouse: warehouse || 'Default Warehouse',
                    lastSync: new Date(),
                  },
                },
              }
            : {}),
        },
        include: {
          brand: true,
          productCategories: { include: { category: true } },
          images: true,
          videos: true,
          inventories: true,
          keywords: true,
        },
      });

      return this.serializeBigInt(product);
    });
  }

  /**
   * Update product details.
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        videos: true,
      },
    });

    if (!existing || existing.deletedAt !== null) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const {
      sku,
      slug,
      brandId,
      brandName,
      categoryIds,
      images,
      videos,
      keywords,
      warehouse,
      basePrice,
      discountPrice,
      taxPercentage,
      rating,
      stock,
      reservedStock,
      availableStock,
      ...productData
    } = updateProductDto;
    void warehouse;

    // Business validations
    const finalBasePrice =
      basePrice !== undefined ? basePrice : Number(existing.basePrice);
    const finalDiscountPrice =
      discountPrice !== undefined
        ? discountPrice
        : existing.discountPrice
          ? Number(existing.discountPrice)
          : undefined;
    if (
      finalDiscountPrice !== undefined &&
      finalDiscountPrice !== null &&
      finalDiscountPrice > finalBasePrice
    ) {
      throw new BadRequestException(
        'Discount price must be less than or equal to base price',
      );
    }

    const finalStock = stock !== undefined ? stock : existing.stock;
    const finalReservedStock =
      reservedStock !== undefined ? reservedStock : existing.reservedStock;
    if (finalReservedStock > finalStock) {
      throw new BadRequestException(
        'Reserved stock must not exceed total stock',
      );
    }

    if (
      taxPercentage !== undefined &&
      (taxPercentage < 0 || taxPercentage > 100)
    ) {
      throw new BadRequestException('Tax percentage must be between 0 and 100');
    }

    if (rating !== undefined && (rating < 0 || rating > 5)) {
      throw new BadRequestException('Rating must be between 0 and 5');
    }

    // Check SKU / Slug uniqueness if changed
    if ((sku && sku !== existing.sku) || (slug && slug !== existing.slug)) {
      const conflict = await this.prisma.product.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [...(sku ? [{ sku }] : []), ...(slug ? [{ slug }] : [])],
            },
          ],
        },
      });

      if (conflict) {
        if (sku && conflict.sku === sku) {
          throw new ConflictException(
            `Product with SKU "${sku}" already exists`,
          );
        }
        if (slug && conflict.slug === slug) {
          throw new ConflictException(
            `Product with Slug "${slug}" already exists`,
          );
        }
      }
    }

    if (brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: brandId },
      });
      if (!brand) {
        throw new BadRequestException(`Brand with ID "${brandId}" not found`);
      }
    }

    if (categoryIds && categoryIds.length > 0) {
      const uniqueCategoryIds = Array.from(new Set(categoryIds));
      const categoriesCount = await this.prisma.category.count({
        where: {
          id: { in: uniqueCategoryIds },
          isDeleted: false,
        },
      });
      if (categoriesCount !== uniqueCategoryIds.length) {
        throw new BadRequestException(
          'One or more category IDs are invalid or deleted',
        );
      }
    }

    const finalAvailableStock =
      availableStock !== undefined
        ? availableStock
        : stock !== undefined || reservedStock !== undefined
          ? finalStock - finalReservedStock
          : existing.availableStock;

    return this.prisma.$transaction(async (tx) => {
      let finalBrandId: string | null | undefined = brandId;
      if (brandName !== undefined) {
        if (brandName && brandName.trim()) {
          const existingBrand = await tx.brand.findFirst({
            where: { name: { equals: brandName.trim(), mode: 'insensitive' } },
          });
          if (existingBrand) {
            finalBrandId = existingBrand.id;
          } else {
            const newBrand = await tx.brand.create({
              data: { name: brandName.trim(), status: true },
            });
            finalBrandId = newBrand.id;
          }
        } else {
          finalBrandId = null;
        }
      }

      // Sync categories if provided
      if (categoryIds !== undefined) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: categoryIds.map((catId) => ({
              productId: id,
              categoryId: catId,
            })),
          });
        }
      }

      // Sync keywords if provided
      if (keywords !== undefined) {
        await tx.productKeyword.deleteMany({ where: { productId: id } });
        if (keywords.length > 0) {
          await tx.productKeyword.createMany({
            data: keywords.map((kw) => ({
              productId: id,
              keyword: kw,
            })),
          });
        }
      }

      // Sync images if provided
      if (images !== undefined) {
        if (images.length > 7) {
          throw new BadRequestException(
            'Enforced limit of maximum 7 images per product',
          );
        }
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((img) => ({
              productId: id,
              imageUrl: img.imageUrl,
              displayOrder: img.displayOrder ?? 0,
            })),
          });
        }
      }

      // Sync videos if provided
      if (videos !== undefined) {
        if (videos.length > 1) {
          throw new BadRequestException(
            'Enforced limit of maximum 1 video per product',
          );
        }
        await tx.productVideo.deleteMany({ where: { productId: id } });
        if (videos.length > 0) {
          await tx.productVideo.createMany({
            data: videos.map((vid) => ({
              productId: id,
              videoUrl: vid.videoUrl,
              fileSize: vid.fileSize ? BigInt(vid.fileSize) : null,
            })),
          });
        }
      }

      const updated = await tx.product.update({
        where: { id },
        data: {
          ...productData,
          sku,
          slug,
          brandId: finalBrandId !== undefined ? finalBrandId : undefined,
          basePrice:
            basePrice !== undefined ? new Prisma.Decimal(basePrice) : undefined,
          discountPrice:
            discountPrice !== undefined
              ? discountPrice !== null
                ? new Prisma.Decimal(discountPrice)
                : null
              : undefined,
          taxPercentage:
            taxPercentage !== undefined
              ? new Prisma.Decimal(taxPercentage)
              : undefined,
          finalPrice:
            discountPrice !== undefined
              ? discountPrice !== null
                ? new Prisma.Decimal(discountPrice)
                : new Prisma.Decimal(finalBasePrice)
              : undefined,
          stock: stock !== undefined ? stock : undefined,
          reservedStock:
            reservedStock !== undefined ? reservedStock : undefined,
          availableStock: finalAvailableStock,
          rating: rating !== undefined ? rating : undefined,
        },
        include: {
          brand: true,
          productCategories: { include: { category: true } },
          images: { orderBy: { displayOrder: 'asc' } },
          videos: true,
          inventories: true,
          keywords: true,
        },
      });

      return this.serializeBigInt(updated);
    });
  }

  /**
   * Delete product (soft delete by default, hard delete if permanent = true).
   */
  async remove(id: string, permanent = false) {
    await this.findOne(id);

    if (permanent) {
      return this.prisma.product.delete({
        where: { id },
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: false,
      },
    });
  }

  /**
   * Archive a product.
   */
  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { archive: true },
    });
  }

  /**
   * Restore an archived or soft-deleted product.
   */
  async restore(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        archive: false,
        deletedAt: null,
        status: true,
      },
    });
  }

  // ==========================================
  // PRODUCT IMAGES CRUD
  // ==========================================

  async addImage(productId: string, dto: CreateProductImageDto) {
    await this.findOne(productId);
    const currentImagesCount = await this.prisma.productImage.count({
      where: { productId },
    });
    if (currentImagesCount >= 7) {
      throw new BadRequestException(
        'Enforced limit of maximum 7 images per product exceeded',
      );
    }
    return this.prisma.productImage.create({
      data: {
        productId,
        imageUrl: dto.imageUrl,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async getImages(productId: string) {
    await this.findOne(productId);
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async removeImage(productId: string, imageId: string) {
    await this.findOne(productId);
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException(
        `Image with ID "${imageId}" not found for this product`,
      );
    }

    return this.prisma.productImage.delete({
      where: { id: imageId },
    });
  }

  // ==========================================
  // PRODUCT VIDEOS CRUD
  // ==========================================

  async addVideo(productId: string, dto: CreateProductVideoDto) {
    await this.findOne(productId);
    const currentVideosCount = await this.prisma.productVideo.count({
      where: { productId },
    });
    if (currentVideosCount >= 1) {
      throw new BadRequestException(
        'Enforced limit of maximum 1 video per product exceeded',
      );
    }
    return this.prisma.productVideo.create({
      data: {
        productId,
        videoUrl: dto.videoUrl,
        fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
      },
    });
  }

  async getVideos(productId: string) {
    await this.findOne(productId);
    const videos = await this.prisma.productVideo.findMany({
      where: { productId },
    });

    return videos.map((v) => ({
      ...v,
      fileSize: v.fileSize ? Number(v.fileSize) : null,
    }));
  }

  async removeVideo(productId: string, videoId: string) {
    await this.findOne(productId);
    const video = await this.prisma.productVideo.findFirst({
      where: { id: videoId, productId },
    });

    if (!video) {
      throw new NotFoundException(
        `Video with ID "${videoId}" not found for this product`,
      );
    }

    return this.prisma.productVideo.delete({
      where: { id: videoId },
    });
  }

  // ==========================================
  // PRODUCT KEYWORDS CRUD
  // ==========================================

  async addKeyword(productId: string, dto: CreateProductKeywordDto) {
    await this.findOne(productId);
    return this.prisma.productKeyword.create({
      data: {
        productId,
        keyword: dto.keyword,
      },
    });
  }

  async getKeywords(productId: string) {
    await this.findOne(productId);
    return this.prisma.productKeyword.findMany({
      where: { productId },
    });
  }

  async removeKeyword(productId: string, keywordId: string) {
    await this.findOne(productId);
    const keyword = await this.prisma.productKeyword.findFirst({
      where: { id: keywordId, productId },
    });

    if (!keyword) {
      throw new NotFoundException(
        `Keyword with ID "${keywordId}" not found for this product`,
      );
    }

    return this.prisma.productKeyword.delete({
      where: { id: keywordId },
    });
  }

  // ==========================================
  // INVENTORY UPDATE
  // ==========================================

  async updateInventory(productId: string, dto: UpdateInventoryDto) {
    await this.findOne(productId);

    const { totalStock, reservedStock = 0, availableStock, warehouse } = dto;
    const calcAvailableStock =
      availableStock !== undefined
        ? availableStock
        : totalStock - reservedStock;

    return this.prisma.$transaction(async (tx) => {
      // Find existing inventory record or create new
      const existingInventory = await tx.inventory.findFirst({
        where: { productId, warehouse },
      });

      const inventory = existingInventory
        ? await tx.inventory.update({
            where: { id: existingInventory.id },
            data: {
              totalStock,
              reservedStock,
              availableStock: calcAvailableStock,
              lastSync: new Date(),
            },
          })
        : await tx.inventory.create({
            data: {
              productId,
              totalStock,
              reservedStock,
              availableStock: calcAvailableStock,
              warehouse,
              lastSync: new Date(),
            },
          });

      // Sync overall product stock
      const allInventories = await tx.inventory.findMany({
        where: { productId },
      });
      const aggregatedTotal = allInventories.reduce(
        (acc, curr) => acc + curr.totalStock,
        0,
      );
      const aggregatedReserved = allInventories.reduce(
        (acc, curr) => acc + curr.reservedStock,
        0,
      );
      const aggregatedAvailable = allInventories.reduce(
        (acc, curr) => acc + curr.availableStock,
        0,
      );

      await tx.product.update({
        where: { id: productId },
        data: {
          stock: aggregatedTotal,
          reservedStock: aggregatedReserved,
          availableStock: aggregatedAvailable,
        },
      });

      return inventory;
    });
  }

  // ==========================================
  // CATEGORY ASSIGNMENT
  // ==========================================

  async assignCategories(productId: string, dto: AssignCategoriesDto) {
    await this.findOne(productId);

    return this.prisma.$transaction(async (tx) => {
      // Clear existing assignments
      await tx.productCategory.deleteMany({
        where: { productId },
      });

      // Add new assignments
      if (dto.categoryIds && dto.categoryIds.length > 0) {
        await tx.productCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({
            productId,
            categoryId,
          })),
        });
      }

      return tx.productCategory.findMany({
        where: { productId },
        include: { category: true },
      });
    });
  }

  // ==========================================
  // BRAND ASSIGNMENT
  // ==========================================

  async assignBrand(productId: string, dto: AssignBrandDto) {
    await this.findOne(productId);

    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: dto.brandId },
      });
      if (!brand) {
        throw new BadRequestException(
          `Brand with ID "${dto.brandId}" not found`,
        );
      }
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        brandId: dto.brandId ?? null,
      },
      include: {
        brand: true,
      },
    });
  }

  async getCategories() {
    return this.prisma.category.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async getBrands() {
    return this.prisma.brand.findMany({
      where: { status: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Category with Slug "${dto.slug}" already exists`,
      );
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.isDeleted) {
        throw new BadRequestException(
          `Parent Category with ID "${dto.parentId}" not found`,
        );
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentId: dto.parentId || null,
        image: dto.image,
        status: dto.status !== undefined ? dto.status : true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const conflict = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });
      if (conflict) {
        throw new ConflictException(
          `Category with Slug "${dto.slug}" already exists`,
        );
      }
    }

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.isDeleted) {
        throw new BadRequestException(
          `Parent Category with ID "${dto.parentId}" not found`,
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name : undefined,
        slug: dto.slug !== undefined ? dto.slug : undefined,
        description:
          dto.description !== undefined ? dto.description : undefined,
        parentId: dto.parentId !== undefined ? dto.parentId || null : undefined,
        image: dto.image !== undefined ? dto.image : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
      },
    });
  }

  async deleteCategory(id: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    return this.prisma.category.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
