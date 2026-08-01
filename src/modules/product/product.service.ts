import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
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
import { StorageService } from '../../common/storage/storage.service';
import { randomUUID } from 'crypto';

type UploadedImage = { buffer: Buffer; mimetype: string };
const DEFAULT_WAREHOUSE = 'Main Warehouse';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /** Stores a binary multipart image and returns the public URL for JSON DTOs. */
  async uploadImage(file: UploadedImage): Promise<{ url: string }> {
    const extension = file.mimetype.split('/')[1] || 'bin';
    const key = `uploads/${randomUUID()}.${extension}`;
    await this.storageService.uploadFile({
      key,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });
    return { url: this.storageService.generatePublicUrl(key) };
  }

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
   * Resolve a stored DB value (object key OR legacy full URL) into a public URL
   * suitable for returning in API responses.
   *
   * Rules:
   *  - null / empty → returned as-is
   *  - S3 object key (products/...) → converted to full public URL using AWS_S3_BASE_URL
   *  - Full URL already containing the S3 base URL → key is extracted, then resolved
   *  - Any other full URL (legacy external URL) → returned unchanged (backward compat)
   */
  /**
   * Resolve a stored DB value into a public URL suitable for returning in API responses.
   *
   * Rules:
   *  - null / empty → returned as-is
   *  - Full URL (starts with http) → returned as-is (new style plain path)
   *  - Relative path (legacy style) → converted to full public URL using AWS_S3_BASE_URL
   */
  private resolveUrl(value: string | null | undefined): string | null {
    if (!value) return null;
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    return this.storageService.generatePublicUrl(value);
  }

  /**
   * Helper to detect and upload base64 file payloads to S3, returning the plain full S3 URL.
   * If value is not base64, returns it as-is.
   */
  private async uploadIfBase64(
    value: string | null | undefined,
    productId: string,
    fileType: 'image' | 'video',
  ): Promise<string | null> {
    if (!value) return null;
    if (!value.startsWith('data:')) {
      return value;
    }

    try {
      const match = value.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return value;
      }

      const mimeType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Determine extension from mimeType
      let extension = 'bin';
      if (mimeType.includes('/')) {
        extension = mimeType.split('/')[1];
      }

      // Generate a unique filename key: products/{productId}/{fileType}-{random}.{ext}
      const randomId = Math.random().toString(36).substring(2, 10);
      const key = `products/${productId}/${fileType}-${randomId}.${extension}`;

      await this.storageService.uploadFile({
        key,
        buffer,
        mimeType,
      });

      // Return the plain full URL path directly to be saved in the database
      return this.storageService.generatePublicUrl(key);
    } catch (err) {
      this.logger.error(
        `Failed to upload base64 ${fileType} to S3`,
        err instanceof Error ? err.stack : String(err),
      );
      return value;
    }
  }

  /**
   * Apply URL resolution to all image/video fields within a product object
   * returned from Prisma, so responses always contain full public URLs.
   */
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
  private resolveProductMedia<T>(product: T): T {
    const p = product as any;
    if (p.images) {
      p.images = p.images.map((img: any) => ({
        ...img,
        imageUrl: this.resolveUrl(img.imageUrl) ?? img.imageUrl,
      }));
    }
    if (p.videos) {
      p.videos = p.videos.map((vid: any) => ({
        ...vid,
        videoUrl: this.resolveUrl(vid.videoUrl) ?? vid.videoUrl,
      }));
    }
    if (p.productCategories) {
      p.productCategories = p.productCategories.map((pc: any) => {
        if (pc.category && pc.category.image) {
          pc.category = {
            ...pc.category,
            image: this.resolveUrl(pc.category.image) ?? pc.category.image,
          };
        }
        return pc;
      });
    }
    if (p.brand && p.brand.logo) {
      p.brand = {
        ...p.brand,
        logo: this.resolveUrl(p.brand.logo) ?? p.brand.logo,
      };
    }
    return product;
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

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
      statusId,
      includeDeleted = false,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(statusId ? { statusId } : {}),
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
          status: true,
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

    const resolvedData = data.map((p) => this.resolveProductMedia(p));

    return this.serializeBigInt({
      data: resolvedData,
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
        status: true,
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

    return this.serializeBigInt(this.resolveProductMedia(product));
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

    // Sanitise numeric fields — valueAsNumber on empty inputs sends NaN
    const safeDiscountPrice =
      discountPrice !== undefined &&
      discountPrice !== null &&
      !Number.isNaN(discountPrice)
        ? discountPrice
        : undefined;
    const safeTaxPercentage = Number.isNaN(taxPercentage) ? 0 : taxPercentage;
    const safeRating = Number.isNaN(rating) ? 0 : rating;

    const productId = randomUUID();

    // Map base64 images and upload to S3 BEFORE database transaction
    const imageCreates: Array<{ imageUrl: string; displayOrder?: number }> = [];
    if (images && images.length > 0) {
      for (const img of images) {
        const storedUrl = await this.uploadIfBase64(
          img.imageUrl,
          productId,
          'image',
        );
        imageCreates.push({
          imageUrl: storedUrl ?? img.imageUrl,
          displayOrder: img.displayOrder,
        });
      }
    }

    // Map base64 videos and upload to S3 BEFORE database transaction
    const videoCreates: Array<{ videoUrl: string; fileSize?: bigint | null }> =
      [];
    if (videos && videos.length > 0) {
      for (const v of videos) {
        const storedUrl = await this.uploadIfBase64(
          v.videoUrl,
          productId,
          'video',
        );
        videoCreates.push({
          videoUrl: storedUrl ?? v.videoUrl,
          fileSize: v.fileSize ? BigInt(v.fileSize) : null,
        });
      }
    }

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: {
          ...productData,
          id: productId,
          sku,
          slug,
          brandId: finalBrandId,
          basePrice: new Prisma.Decimal(basePrice),
          discountPrice:
            safeDiscountPrice !== undefined
              ? new Prisma.Decimal(safeDiscountPrice)
              : null,
          taxPercentage: new Prisma.Decimal(safeTaxPercentage),
          finalPrice:
            safeDiscountPrice !== undefined
              ? new Prisma.Decimal(safeDiscountPrice)
              : new Prisma.Decimal(basePrice),
          stock,
          reservedStock,
          availableStock: calculatedAvailableStock,
          rating: safeRating,
          ...(categoryIds && categoryIds.length > 0
            ? {
                productCategories: {
                  create: categoryIds.map((catId) => ({ categoryId: catId })),
                },
              }
            : {}),
          ...(imageCreates.length > 0
            ? {
                images: {
                  create: imageCreates,
                },
              }
            : {}),
          ...(videoCreates.length > 0
            ? {
                videos: {
                  create: videoCreates,
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
          ...(stock > 0
            ? {
                inventories: {
                  create: {
                    totalStock: stock,
                    reservedStock,
                    availableStock: calculatedAvailableStock,
                    warehouse: DEFAULT_WAREHOUSE,
                  },
                },
              }
            : {}),
        } as any,
        include: {
          brand: true,
          status: true,
          productCategories: { include: { category: true } },
          images: true,
          videos: true,
          inventories: true,
          keywords: true,
        },
      });

      return this.serializeBigInt(this.resolveProductMedia(product));
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
      basePrice,
      discountPrice,
      taxPercentage,
      rating,
      stock,
      reservedStock,
      availableStock,
      ...productData
    } = updateProductDto;

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

    // Sync images: upload base64 to S3 BEFORE database transaction
    const imageUpdates: Array<{
      productId: string;
      imageUrl: string;
      displayOrder: number;
    }> = [];
    if (images !== undefined) {
      if (images.length > 7) {
        throw new BadRequestException(
          'Enforced limit of maximum 7 images per product',
        );
      }
      for (const img of images) {
        const storedUrl = await this.uploadIfBase64(img.imageUrl, id, 'image');
        imageUpdates.push({
          productId: id,
          imageUrl: storedUrl ?? img.imageUrl,
          displayOrder: img.displayOrder ?? 0,
        });
      }
    }

    // Sync videos: upload base64 to S3 BEFORE database transaction
    const videoUpdates: Array<{
      productId: string;
      videoUrl: string;
      fileSize: bigint | null;
    }> = [];
    if (videos !== undefined) {
      if (videos.length > 1) {
        throw new BadRequestException(
          'Enforced limit of maximum 1 video per product',
        );
      }
      for (const vid of videos) {
        const storedUrl = await this.uploadIfBase64(vid.videoUrl, id, 'video');
        videoUpdates.push({
          productId: id,
          videoUrl: storedUrl ?? vid.videoUrl,
          fileSize: vid.fileSize ? BigInt(vid.fileSize) : null,
        });
      }
    }

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
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (imageUpdates.length > 0) {
          await tx.productImage.createMany({
            data: imageUpdates,
          });
        }
      }

      // Sync videos if provided
      if (videos !== undefined) {
        await tx.productVideo.deleteMany({ where: { productId: id } });
        if (videoUpdates.length > 0) {
          await tx.productVideo.createMany({
            data: videoUpdates,
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
            basePrice !== undefined && !Number.isNaN(basePrice)
              ? new Prisma.Decimal(basePrice)
              : undefined,
          discountPrice:
            discountPrice !== undefined
              ? discountPrice !== null && !Number.isNaN(discountPrice)
                ? new Prisma.Decimal(discountPrice)
                : null
              : undefined,
          taxPercentage:
            taxPercentage !== undefined && !Number.isNaN(taxPercentage)
              ? new Prisma.Decimal(taxPercentage)
              : undefined,
          finalPrice:
            discountPrice !== undefined
              ? discountPrice !== null && !Number.isNaN(discountPrice)
                ? new Prisma.Decimal(discountPrice)
                : new Prisma.Decimal(finalBasePrice)
              : undefined,
          stock:
            stock !== undefined && !Number.isNaN(stock) ? stock : undefined,
          reservedStock:
            reservedStock !== undefined && !Number.isNaN(reservedStock)
              ? reservedStock
              : undefined,
          availableStock: finalAvailableStock,
          rating:
            rating !== undefined && !Number.isNaN(rating) ? rating : undefined,
        },
        include: {
          brand: true,
          status: true,
          productCategories: { include: { category: true } },
          images: { orderBy: { displayOrder: 'asc' } },
          videos: true,
          inventories: true,
          keywords: true,
        },
      });

      return this.serializeBigInt(this.resolveProductMedia(updated));
    });
  }

  async remove(id: string, permanent = false) {
    const product: any = await this.findOne(id);

    if (permanent) {
      // Collect all stored media keys for S3 cleanup (best-effort, after DB delete)
      const mediaKeys: string[] = [
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        ...(product.images ?? []).map(
          (img: { imageUrl: string }) => img.imageUrl,
        ),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        ...(product.videos ?? []).map(
          (vid: { videoUrl: string }) => vid.videoUrl,
        ),
      ].filter((v): v is string => !!v);

      const deleted = await this.prisma.product.delete({ where: { id } });

      // Best-effort S3 cleanup — do not throw if this fails
      if (mediaKeys.length) {
        this.storageService
          .deleteMultipleFiles(mediaKeys)
          .catch((err: unknown) => {
            this.logger.error(
              `Failed to clean up S3 objects for permanently deleted product ${id}`,
              err instanceof Error ? err.stack : String(err),
            );
          });
      }

      return deleted;
    }

    const inactiveStatus = await this.prisma.status.findUnique({
      where: { slug: 'inactive' },
    });

    return this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        statusId: inactiveStatus ? inactiveStatus.id : undefined,
      },
    });
  }

  /**
   * Archive a product.
   */
  async archive(id: string) {
    await this.findOne(id);
    const archiveStatus = await this.prisma.status.findUnique({
      where: { slug: 'archive' },
    });
    if (!archiveStatus) {
      throw new NotFoundException('Archive status not found in database');
    }
    return this.prisma.product.update({
      where: { id },
      data: { statusId: archiveStatus.id },
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

    const activeStatus = await this.prisma.status.findUnique({
      where: { slug: 'active' },
    });
    if (!activeStatus) {
      throw new NotFoundException('Active status not found in database');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        statusId: activeStatus.id,
        deletedAt: null,
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
    const storedUrl = await this.uploadIfBase64(
      dto.imageUrl,
      productId,
      'image',
    );

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        imageUrl: storedUrl ?? dto.imageUrl,
        displayOrder: dto.displayOrder ?? 0,
      },
    });

    return {
      ...image,
      imageUrl: this.resolveUrl(image.imageUrl) ?? image.imageUrl,
    };
  }

  async getImages(productId: string) {
    await this.findOne(productId);
    const images = await this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { displayOrder: 'asc' },
    });
    return images.map((img) => ({
      ...img,
      imageUrl: this.resolveUrl(img.imageUrl) ?? img.imageUrl,
    }));
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

    const deleted = await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    // Best-effort S3 cleanup
    this.storageService.deleteFile(image.imageUrl).catch((err: unknown) => {
      this.logger.error(
        `Failed to delete S3 object for image ${imageId}: ${image.imageUrl}`,
        err instanceof Error ? err.stack : String(err),
      );
    });

    return {
      ...deleted,
      imageUrl: this.resolveUrl(deleted.imageUrl) ?? deleted.imageUrl,
    };
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
    const storedVideoUrl = await this.uploadIfBase64(
      dto.videoUrl,
      productId,
      'video',
    );

    const video = await this.prisma.productVideo.create({
      data: {
        productId,
        videoUrl: storedVideoUrl ?? dto.videoUrl,
        fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
      },
    });

    return {
      ...video,
      videoUrl: this.resolveUrl(video.videoUrl) ?? video.videoUrl,
      fileSize: video.fileSize ? Number(video.fileSize) : null,
    };
  }

  async getVideos(productId: string) {
    await this.findOne(productId);
    const videos = await this.prisma.productVideo.findMany({
      where: { productId },
    });

    return videos.map((v) => ({
      ...v,
      videoUrl: this.resolveUrl(v.videoUrl) ?? v.videoUrl,
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

    const deleted = await this.prisma.productVideo.delete({
      where: { id: videoId },
    });

    // Best-effort S3 cleanup
    this.storageService.deleteFile(video.videoUrl).catch((err: unknown) => {
      this.logger.error(
        `Failed to delete S3 object for video ${videoId}: ${video.videoUrl}`,
        err instanceof Error ? err.stack : String(err),
      );
    });

    return {
      ...deleted,
      videoUrl: this.resolveUrl(deleted.videoUrl) ?? deleted.videoUrl,
      fileSize: deleted.fileSize ? Number(deleted.fileSize) : null,
    };
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

    const { totalStock, reservedStock = 0, availableStock } = dto;
    const calcAvailableStock =
      availableStock !== undefined
        ? availableStock
        : totalStock - reservedStock;

    return this.prisma.$transaction(async (tx) => {
      // Find existing inventory record or create new
      const existingInventory = await tx.inventory.findFirst({
        where: { productId },
      });

      const inventory = existingInventory
        ? await tx.inventory.update({
            where: { id: existingInventory.id },
            data: {
              totalStock,
              reservedStock,
              availableStock: calcAvailableStock,
            },
          })
        : await tx.inventory.create({
            data: {
              productId,
              totalStock,
              reservedStock,
              availableStock: calcAvailableStock,
              warehouse: DEFAULT_WAREHOUSE,
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
    const categories = await this.prisma.category.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });
    return categories.map((cat) => ({
      ...cat,
      image: this.resolveUrl(cat.image) ?? cat.image,
    }));
  }

  async getBrands() {
    const brands = await this.prisma.brand.findMany({
      where: { status: true },
      orderBy: { name: 'asc' },
    });
    return brands.map((brand) => ({
      ...brand,
      logo: this.resolveUrl(brand.logo) ?? brand.logo,
    }));
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

    const categoryId = randomUUID();
    const storedImage = await this.uploadIfBase64(
      dto.image,
      categoryId,
      'image',
    );

    const created = await this.prisma.category.create({
      data: {
        id: categoryId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentId: dto.parentId || null,
        image: storedImage ?? dto.image,
        status: dto.status !== undefined ? dto.status : true,
      },
    });

    return {
      ...created,
      image: this.resolveUrl(created.image) ?? created.image,
    };
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

    const storedImage =
      dto.image !== undefined
        ? await this.uploadIfBase64(dto.image, id, 'image')
        : undefined;

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name : undefined,
        slug: dto.slug !== undefined ? dto.slug : undefined,
        description:
          dto.description !== undefined ? dto.description : undefined,
        parentId: dto.parentId !== undefined ? dto.parentId || null : undefined,
        image: dto.image !== undefined ? (storedImage ?? dto.image) : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
      },
    });

    return {
      ...updated,
      image: this.resolveUrl(updated.image) ?? updated.image,
    };
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

  async getStatuses() {
    return this.prisma.status.findMany({
      orderBy: { status: 'asc' },
    });
  }
}
