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
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Helper to serialize BigInt values to numbers/strings for JSON safety.
   */
  private serializeBigInt<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_, value) =>
        typeof value === 'bigint' ? (Number.isSafeInteger(Number(value)) ? Number(value) : value.toString()) : value,
      ),
    );
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
      categoryIds,
      images,
      videos,
      keywords,
      warehouse,
      stock = 0,
      reservedStock = 0,
      availableStock,
      ...productData
    } = createProductDto;

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
        throw new ConflictException(`Product with Slug "${slug}" already exists`);
      }
    }

    // Verify brand if provided
    if (brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
      if (!brand) {
        throw new BadRequestException(`Brand with ID "${brandId}" not found`);
      }
    }

    const calculatedAvailableStock =
      availableStock !== undefined ? availableStock : stock - reservedStock;

    // Perform atomic transaction
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          sku,
          slug,
          brandId,
          stock,
          reservedStock,
          availableStock: calculatedAvailableStock,
          ...(categoryIds && categoryIds.length > 0
            ? {
              productCategories: {
                createMany: {
                  data: categoryIds.map((catId) => ({ categoryId: catId })),
                },
              },
            }
            : {}),
          ...(images && images.length > 0
            ? {
              images: {
                createMany: {
                  data: images,
                },
              },
            }
            : {}),
          ...(videos && videos.length > 0
            ? {
              videos: {
                createMany: {
                  data: videos,
                },
              },
            }
            : {}),
          ...(keywords && keywords.length > 0
            ? {
              keywords: {
                createMany: {
                  data: keywords.map((kw) => ({ keyword: kw })),
                },
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

      // return product;
      return JSON.parse(
        JSON.stringify(product, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      );
    });
  }

  /**
   * Update product details.
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    const existing = await this.findOne(id);

    const {
      sku,
      slug,
      brandId,
      categoryIds,
      images,
      videos,
      keywords,
      warehouse,
      ...productData
    } = updateProductDto;

    // Check SKU / Slug uniqueness if changed
    if ((sku && sku !== existing.sku) || (slug && slug !== existing.slug)) {
      const conflict = await this.prisma.product.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(sku ? [{ sku }] : []),
                ...(slug ? [{ slug }] : []),
              ],
            },
          ],
        },
      });

      if (conflict) {
        if (sku && conflict.sku === sku) {
          throw new ConflictException(`Product with SKU "${sku}" already exists`);
        }
        if (slug && conflict.slug === slug) {
          throw new ConflictException(`Product with Slug "${slug}" already exists`);
        }
      }
    }

    if (brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
      if (!brand) {
        throw new BadRequestException(`Brand with ID "${brandId}" not found`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Sync categories if provided
      if (categoryIds !== undefined) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: categoryIds.map((catId) => ({ productId: id, categoryId: catId })),
          });
        }
      }

      const updated = await tx.product.update({
        where: { id },
        data: {
          ...productData,
          ...(sku ? { sku } : {}),
          ...(slug ? { slug } : {}),
          ...(brandId !== undefined ? { brandId } : {}),
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

      return updated;
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
      throw new NotFoundException(`Image with ID "${imageId}" not found for this product`);
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
      throw new NotFoundException(`Video with ID "${videoId}" not found for this product`);
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
      throw new NotFoundException(`Keyword with ID "${keywordId}" not found for this product`);
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
    const calcAvailableStock = availableStock !== undefined ? availableStock : totalStock - reservedStock;

    return this.prisma.$transaction(async (tx) => {
      // Find existing inventory record or create new
      const existingInventory = await tx.inventory.findFirst({
        where: { productId, warehouse },
      });

      let inventory;
      if (existingInventory) {
        inventory = await tx.inventory.update({
          where: { id: existingInventory.id },
          data: {
            totalStock,
            reservedStock,
            availableStock: calcAvailableStock,
            lastSync: new Date(),
          },
        });
      } else {
        inventory = await tx.inventory.create({
          data: {
            productId,
            totalStock,
            reservedStock,
            availableStock: calcAvailableStock,
            warehouse,
            lastSync: new Date(),
          },
        });
      }

      // Sync overall product stock
      const allInventories = await tx.inventory.findMany({ where: { productId } });
      const aggregatedTotal = allInventories.reduce((acc, curr) => acc + curr.totalStock, 0);
      const aggregatedReserved = allInventories.reduce((acc, curr) => acc + curr.reservedStock, 0);
      const aggregatedAvailable = allInventories.reduce((acc, curr) => acc + curr.availableStock, 0);

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
        throw new BadRequestException(`Brand with ID "${dto.brandId}" not found`);
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
}
