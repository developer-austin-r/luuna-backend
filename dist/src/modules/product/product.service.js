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
        const { page = 1, limit = 10, search, brandId, categoryId, status, archive, includeDeleted = false, minPrice, maxPrice, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const skip = (page - 1) * limit;
        const where = {
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
    async findOne(id) {
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
            throw new common_1.NotFoundException(`Product with ID "${id}" not found`);
        }
        return this.serializeBigInt(product);
    }
    async create(createProductDto) {
        const { sku, slug, brandId, categoryIds, images, videos, keywords, warehouse, stock = 0, reservedStock = 0, availableStock, ...productData } = createProductDto;
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
        const calculatedAvailableStock = availableStock !== undefined ? availableStock : stock - reservedStock;
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
            return this.serializeBigInt(product);
        });
    }
    async update(id, updateProductDto) {
        const existing = await this.findOne(id);
        const { sku, slug, brandId, categoryIds, images, videos, keywords, warehouse, ...productData } = updateProductDto;
        void images;
        void videos;
        void keywords;
        void warehouse;
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
        return this.prisma.$transaction(async (tx) => {
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
    async remove(id, permanent = false) {
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
    async archive(id) {
        await this.findOne(id);
        return this.prisma.product.update({
            where: { id },
            data: { archive: true },
        });
    }
    async restore(id) {
        const product = await this.prisma.product.findUnique({ where: { id } });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID "${id}" not found`);
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
    async addImage(productId, dto) {
        await this.findOne(productId);
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
        const { totalStock, reservedStock = 0, availableStock, warehouse } = dto;
        const calcAvailableStock = availableStock !== undefined
            ? availableStock
            : totalStock - reservedStock;
        return this.prisma.$transaction(async (tx) => {
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
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductService);
//# sourceMappingURL=product.service.js.map