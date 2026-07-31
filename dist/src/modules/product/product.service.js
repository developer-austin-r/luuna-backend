"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ProductService = class ProductService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    serializeBigInt(data) {
        return JSON.parse(JSON.stringify(data, (_, value) => {
            if (typeof value === 'bigint') {
                return Number.isSafeInteger(Number(value))
                    ? Number(value)
                    : value.toString();
            }
            return value;
        }));
    }
    async findAll(query) {
        const { page = 1, limit = 10, search, brandId, categoryId, statusId, includeDeleted = false, minPrice, maxPrice, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const skip = (page - 1) * limit;
        const where = {
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
    async findOne(id) {
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
            throw new common_1.NotFoundException(`Product with ID "${id}" not found`);
        }
        return this.serializeBigInt(product);
    }
    async create(createProductDto) {
        const { sku, slug, brandId, brandName, categoryIds, images, videos, keywords, stock = 0, reservedStock = 0, availableStock, basePrice, discountPrice, taxPercentage = 0, rating = 0, ...productData } = createProductDto;
        if (discountPrice !== undefined &&
            discountPrice !== null &&
            discountPrice > basePrice) {
            throw new common_1.BadRequestException('Discount price must be less than or equal to base price');
        }
        if (reservedStock > stock) {
            throw new common_1.BadRequestException('Reserved stock must not exceed total stock');
        }
        if (taxPercentage < 0 || taxPercentage > 100) {
            throw new common_1.BadRequestException('Tax percentage must be between 0 and 100');
        }
        if (rating < 0 || rating > 5) {
            throw new common_1.BadRequestException('Rating must be between 0 and 5');
        }
        if (images && images.length > 7) {
            throw new common_1.BadRequestException('Enforced limit of maximum 7 images per product');
        }
        if (videos && videos.length > 1) {
            throw new common_1.BadRequestException('Enforced limit of maximum 1 video per product');
        }
        const existing = await this.prisma.product.findFirst({
            where: {
                OR: [{ sku }, { slug }],
            },
        });
        if (existing) {
            if (existing.sku === sku) {
                throw new common_1.ConflictException(`Product with SKU "${sku}" already exists`);
            }
            if (existing.slug === slug) {
                throw new common_1.ConflictException(`Product with Slug "${slug}" already exists`);
            }
        }
        if (brandId) {
            const brand = await this.prisma.brand.findUnique({
                where: { id: brandId },
            });
            if (!brand) {
                throw new common_1.BadRequestException(`Brand with ID "${brandId}" not found`);
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
                throw new common_1.BadRequestException('One or more category IDs are invalid or deleted');
            }
        }
        const calculatedAvailableStock = availableStock !== undefined ? availableStock : stock - reservedStock;
        return this.prisma.$transaction(async (tx) => {
            let finalBrandId = brandId;
            if (brandName && brandName.trim()) {
                const existingBrand = await tx.brand.findFirst({
                    where: { name: { equals: brandName.trim(), mode: 'insensitive' } },
                });
                if (existingBrand) {
                    finalBrandId = existingBrand.id;
                }
                else {
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
                    basePrice: new client_1.Prisma.Decimal(basePrice),
                    discountPrice: discountPrice !== undefined && discountPrice !== null
                        ? new client_1.Prisma.Decimal(discountPrice)
                        : null,
                    taxPercentage: new client_1.Prisma.Decimal(taxPercentage),
                    finalPrice: discountPrice !== undefined && discountPrice !== null
                        ? new client_1.Prisma.Decimal(discountPrice)
                        : new client_1.Prisma.Decimal(basePrice),
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
                    ...(stock > 0
                        ? {
                            inventories: {
                                create: {
                                    totalStock: stock,
                                    reservedStock,
                                    availableStock: calculatedAvailableStock,
                                },
                            },
                        }
                        : {}),
                },
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
            return this.serializeBigInt(product);
        });
    }
    async update(id, updateProductDto) {
        const existing = await this.prisma.product.findUnique({
            where: { id },
            include: {
                images: true,
                videos: true,
            },
        });
        if (!existing || existing.deletedAt !== null) {
            throw new common_1.NotFoundException(`Product with ID "${id}" not found`);
        }
        const { sku, slug, brandId, brandName, categoryIds, images, videos, keywords, basePrice, discountPrice, taxPercentage, rating, stock, reservedStock, availableStock, ...productData } = updateProductDto;
        const finalBasePrice = basePrice !== undefined ? basePrice : Number(existing.basePrice);
        const finalDiscountPrice = discountPrice !== undefined
            ? discountPrice
            : existing.discountPrice
                ? Number(existing.discountPrice)
                : undefined;
        if (finalDiscountPrice !== undefined &&
            finalDiscountPrice !== null &&
            finalDiscountPrice > finalBasePrice) {
            throw new common_1.BadRequestException('Discount price must be less than or equal to base price');
        }
        const finalStock = stock !== undefined ? stock : existing.stock;
        const finalReservedStock = reservedStock !== undefined ? reservedStock : existing.reservedStock;
        if (finalReservedStock > finalStock) {
            throw new common_1.BadRequestException('Reserved stock must not exceed total stock');
        }
        if (taxPercentage !== undefined &&
            (taxPercentage < 0 || taxPercentage > 100)) {
            throw new common_1.BadRequestException('Tax percentage must be between 0 and 100');
        }
        if (rating !== undefined && (rating < 0 || rating > 5)) {
            throw new common_1.BadRequestException('Rating must be between 0 and 5');
        }
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
                    throw new common_1.ConflictException(`Product with SKU "${sku}" already exists`);
                }
                if (slug && conflict.slug === slug) {
                    throw new common_1.ConflictException(`Product with Slug "${slug}" already exists`);
                }
            }
        }
        if (brandId) {
            const brand = await this.prisma.brand.findUnique({
                where: { id: brandId },
            });
            if (!brand) {
                throw new common_1.BadRequestException(`Brand with ID "${brandId}" not found`);
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
                throw new common_1.BadRequestException('One or more category IDs are invalid or deleted');
            }
        }
        const finalAvailableStock = availableStock !== undefined
            ? availableStock
            : stock !== undefined || reservedStock !== undefined
                ? finalStock - finalReservedStock
                : existing.availableStock;
        return this.prisma.$transaction(async (tx) => {
            let finalBrandId = brandId;
            if (brandName !== undefined) {
                if (brandName && brandName.trim()) {
                    const existingBrand = await tx.brand.findFirst({
                        where: { name: { equals: brandName.trim(), mode: 'insensitive' } },
                    });
                    if (existingBrand) {
                        finalBrandId = existingBrand.id;
                    }
                    else {
                        const newBrand = await tx.brand.create({
                            data: { name: brandName.trim(), status: true },
                        });
                        finalBrandId = newBrand.id;
                    }
                }
                else {
                    finalBrandId = null;
                }
            }
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
            if (images !== undefined) {
                if (images.length > 7) {
                    throw new common_1.BadRequestException('Enforced limit of maximum 7 images per product');
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
            if (videos !== undefined) {
                if (videos.length > 1) {
                    throw new common_1.BadRequestException('Enforced limit of maximum 1 video per product');
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
                    basePrice: basePrice !== undefined ? new client_1.Prisma.Decimal(basePrice) : undefined,
                    discountPrice: discountPrice !== undefined
                        ? discountPrice !== null
                            ? new client_1.Prisma.Decimal(discountPrice)
                            : null
                        : undefined,
                    taxPercentage: taxPercentage !== undefined
                        ? new client_1.Prisma.Decimal(taxPercentage)
                        : undefined,
                    finalPrice: discountPrice !== undefined
                        ? discountPrice !== null
                            ? new client_1.Prisma.Decimal(discountPrice)
                            : new client_1.Prisma.Decimal(finalBasePrice)
                        : undefined,
                    stock: stock !== undefined ? stock : undefined,
                    reservedStock: reservedStock !== undefined ? reservedStock : undefined,
                    availableStock: finalAvailableStock,
                    rating: rating !== undefined ? rating : undefined,
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
            return this.serializeBigInt(updated);
        });
    }
    async remove(id, permanent = false) {
        await this.findOne(id);
        if (permanent) {
            return this.prisma.product.delete({
                where: { id },
            });
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
    async archive(id) {
        await this.findOne(id);
        const archiveStatus = await this.prisma.status.findUnique({
            where: { slug: 'archive' },
        });
        if (!archiveStatus) {
            throw new common_1.NotFoundException('Archive status not found in database');
        }
        return this.prisma.product.update({
            where: { id },
            data: { statusId: archiveStatus.id },
        });
    }
    async restore(id) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID "${id}" not found`);
        }
        const activeStatus = await this.prisma.status.findUnique({
            where: { slug: 'active' },
        });
        if (!activeStatus) {
            throw new common_1.NotFoundException('Active status not found in database');
        }
        return this.prisma.product.update({
            where: { id },
            data: {
                statusId: activeStatus.id,
                deletedAt: null,
            },
        });
    }
    async addImage(productId, dto) {
        await this.findOne(productId);
        const currentImagesCount = await this.prisma.productImage.count({
            where: { productId },
        });
        if (currentImagesCount >= 7) {
            throw new common_1.BadRequestException('Enforced limit of maximum 7 images per product exceeded');
        }
        return this.prisma.productImage.create({
            data: {
                productId,
                imageUrl: dto.imageUrl,
                displayOrder: dto.displayOrder ?? 0,
            },
        });
    }
    async getImages(productId) {
        await this.findOne(productId);
        return this.prisma.productImage.findMany({
            where: { productId },
            orderBy: { displayOrder: 'asc' },
        });
    }
    async removeImage(productId, imageId) {
        await this.findOne(productId);
        const image = await this.prisma.productImage.findFirst({
            where: { id: imageId, productId },
        });
        if (!image) {
            throw new common_1.NotFoundException(`Image with ID "${imageId}" not found for this product`);
        }
        return this.prisma.productImage.delete({
            where: { id: imageId },
        });
    }
    async addVideo(productId, dto) {
        await this.findOne(productId);
        const currentVideosCount = await this.prisma.productVideo.count({
            where: { productId },
        });
        if (currentVideosCount >= 1) {
            throw new common_1.BadRequestException('Enforced limit of maximum 1 video per product exceeded');
        }
        return this.prisma.productVideo.create({
            data: {
                productId,
                videoUrl: dto.videoUrl,
                fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
            },
        });
    }
    async getVideos(productId) {
        await this.findOne(productId);
        const videos = await this.prisma.productVideo.findMany({
            where: { productId },
        });
        return videos.map((v) => ({
            ...v,
            fileSize: v.fileSize ? Number(v.fileSize) : null,
        }));
    }
    async removeVideo(productId, videoId) {
        await this.findOne(productId);
        const video = await this.prisma.productVideo.findFirst({
            where: { id: videoId, productId },
        });
        if (!video) {
            throw new common_1.NotFoundException(`Video with ID "${videoId}" not found for this product`);
        }
        return this.prisma.productVideo.delete({
            where: { id: videoId },
        });
    }
    async addKeyword(productId, dto) {
        await this.findOne(productId);
        return this.prisma.productKeyword.create({
            data: {
                productId,
                keyword: dto.keyword,
            },
        });
    }
    async getKeywords(productId) {
        await this.findOne(productId);
        return this.prisma.productKeyword.findMany({
            where: { productId },
        });
    }
    async removeKeyword(productId, keywordId) {
        await this.findOne(productId);
        const keyword = await this.prisma.productKeyword.findFirst({
            where: { id: keywordId, productId },
        });
        if (!keyword) {
            throw new common_1.NotFoundException(`Keyword with ID "${keywordId}" not found for this product`);
        }
        return this.prisma.productKeyword.delete({
            where: { id: keywordId },
        });
    }
    async updateInventory(productId, dto) {
        await this.findOne(productId);
        const { totalStock, reservedStock = 0, availableStock } = dto;
        const calcAvailableStock = availableStock !== undefined
            ? availableStock
            : totalStock - reservedStock;
        return this.prisma.$transaction(async (tx) => {
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
                    },
                });
            const allInventories = await tx.inventory.findMany({
                where: { productId },
            });
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
    async assignCategories(productId, dto) {
        await this.findOne(productId);
        return this.prisma.$transaction(async (tx) => {
            await tx.productCategory.deleteMany({
                where: { productId },
            });
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
    async assignBrand(productId, dto) {
        await this.findOne(productId);
        if (dto.brandId) {
            const brand = await this.prisma.brand.findUnique({
                where: { id: dto.brandId },
            });
            if (!brand) {
                throw new common_1.BadRequestException(`Brand with ID "${dto.brandId}" not found`);
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
    async createCategory(dto) {
        const existing = await this.prisma.category.findUnique({
            where: { slug: dto.slug },
        });
        if (existing) {
            throw new common_1.ConflictException(`Category with Slug "${dto.slug}" already exists`);
        }
        if (dto.parentId) {
            const parent = await this.prisma.category.findUnique({
                where: { id: dto.parentId },
            });
            if (!parent || parent.isDeleted) {
                throw new common_1.BadRequestException(`Parent Category with ID "${dto.parentId}" not found`);
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
    async updateCategory(id, dto) {
        const existing = await this.prisma.category.findUnique({
            where: { id },
        });
        if (!existing || existing.isDeleted) {
            throw new common_1.NotFoundException(`Category with ID "${id}" not found`);
        }
        if (dto.slug && dto.slug !== existing.slug) {
            const conflict = await this.prisma.category.findUnique({
                where: { slug: dto.slug },
            });
            if (conflict) {
                throw new common_1.ConflictException(`Category with Slug "${dto.slug}" already exists`);
            }
        }
        if (dto.parentId) {
            if (dto.parentId === id) {
                throw new common_1.BadRequestException('A category cannot be its own parent');
            }
            const parent = await this.prisma.category.findUnique({
                where: { id: dto.parentId },
            });
            if (!parent || parent.isDeleted) {
                throw new common_1.BadRequestException(`Parent Category with ID "${dto.parentId}" not found`);
            }
        }
        return this.prisma.category.update({
            where: { id },
            data: {
                name: dto.name !== undefined ? dto.name : undefined,
                slug: dto.slug !== undefined ? dto.slug : undefined,
                description: dto.description !== undefined ? dto.description : undefined,
                parentId: dto.parentId !== undefined ? dto.parentId || null : undefined,
                image: dto.image !== undefined ? dto.image : undefined,
                status: dto.status !== undefined ? dto.status : undefined,
            },
        });
    }
    async deleteCategory(id) {
        const existing = await this.prisma.category.findUnique({
            where: { id },
        });
        if (!existing || existing.isDeleted) {
            throw new common_1.NotFoundException(`Category with ID "${id}" not found`);
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
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductService);
//# sourceMappingURL=product.service.js.map