import { PrismaService } from '../../prisma/prisma.service';
import { AssignBrandDto, AssignCategoriesDto, CreateProductDto, CreateProductImageDto, CreateProductKeywordDto, CreateProductVideoDto, ProductQueryDto, UpdateInventoryDto, UpdateProductDto } from './dto';
import { Prisma } from '@prisma/client';
export declare class ProductService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private serializeBigInt;
    findAll(query: ProductQueryDto): Promise<{
        data: ({
            brand: {
                name: string;
                id: string;
                status: boolean;
                logo: string | null;
            } | null;
            images: {
                id: string;
                imageUrl: string;
                displayOrder: number;
                productId: string;
            }[];
            videos: {
                id: string;
                videoUrl: string;
                fileSize: bigint | null;
                productId: string;
            }[];
            keywords: {
                id: string;
                keyword: string;
                productId: string;
            }[];
            productCategories: ({
                category: {
                    description: string | null;
                    name: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    status: boolean;
                    slug: string;
                    parentId: string | null;
                    image: string | null;
                    isDeleted: boolean;
                };
            } & {
                id: string;
                categoryId: string;
                productId: string;
            })[];
            inventories: {
                id: string;
                reservedStock: number;
                availableStock: number;
                warehouse: string;
                totalStock: number;
                productId: string;
                lastSync: Date | null;
            }[];
        } & {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: boolean;
            sku: string;
            slug: string;
            shortDescription: string | null;
            brandId: string | null;
            basePrice: Prisma.Decimal;
            discountPrice: Prisma.Decimal | null;
            taxPercentage: Prisma.Decimal;
            finalPrice: Prisma.Decimal;
            stock: number;
            reservedStock: number;
            availableStock: number;
            rating: number;
            archive: boolean;
            deletedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    findOne(id: string): Promise<{
        brand: {
            name: string;
            id: string;
            status: boolean;
            logo: string | null;
        } | null;
        images: {
            id: string;
            imageUrl: string;
            displayOrder: number;
            productId: string;
        }[];
        videos: {
            id: string;
            videoUrl: string;
            fileSize: bigint | null;
            productId: string;
        }[];
        keywords: {
            id: string;
            keyword: string;
            productId: string;
        }[];
        productCategories: ({
            category: {
                description: string | null;
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: boolean;
                slug: string;
                parentId: string | null;
                image: string | null;
                isDeleted: boolean;
            };
        } & {
            id: string;
            categoryId: string;
            productId: string;
        })[];
        inventories: {
            id: string;
            reservedStock: number;
            availableStock: number;
            warehouse: string;
            totalStock: number;
            productId: string;
            lastSync: Date | null;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: boolean;
        sku: string;
        slug: string;
        shortDescription: string | null;
        brandId: string | null;
        basePrice: Prisma.Decimal;
        discountPrice: Prisma.Decimal | null;
        taxPercentage: Prisma.Decimal;
        finalPrice: Prisma.Decimal;
        stock: number;
        reservedStock: number;
        availableStock: number;
        rating: number;
        archive: boolean;
        deletedAt: Date | null;
    }>;
    create(createProductDto: CreateProductDto): Promise<{
        brand: {
            name: string;
            id: string;
            status: boolean;
            logo: string | null;
        } | null;
        images: {
            id: string;
            imageUrl: string;
            displayOrder: number;
            productId: string;
        }[];
        videos: {
            id: string;
            videoUrl: string;
            fileSize: bigint | null;
            productId: string;
        }[];
        keywords: {
            id: string;
            keyword: string;
            productId: string;
        }[];
        productCategories: ({
            category: {
                description: string | null;
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: boolean;
                slug: string;
                parentId: string | null;
                image: string | null;
                isDeleted: boolean;
            };
        } & {
            id: string;
            categoryId: string;
            productId: string;
        })[];
        inventories: {
            id: string;
            reservedStock: number;
            availableStock: number;
            warehouse: string;
            totalStock: number;
            productId: string;
            lastSync: Date | null;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: boolean;
        sku: string;
        slug: string;
        shortDescription: string | null;
        brandId: string | null;
        basePrice: Prisma.Decimal;
        discountPrice: Prisma.Decimal | null;
        taxPercentage: Prisma.Decimal;
        finalPrice: Prisma.Decimal;
        stock: number;
        reservedStock: number;
        availableStock: number;
        rating: number;
        archive: boolean;
        deletedAt: Date | null;
    }>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<{
        brand: {
            name: string;
            id: string;
            status: boolean;
            logo: string | null;
        } | null;
        images: {
            id: string;
            imageUrl: string;
            displayOrder: number;
            productId: string;
        }[];
        videos: {
            id: string;
            videoUrl: string;
            fileSize: bigint | null;
            productId: string;
        }[];
        keywords: {
            id: string;
            keyword: string;
            productId: string;
        }[];
        productCategories: ({
            category: {
                description: string | null;
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: boolean;
                slug: string;
                parentId: string | null;
                image: string | null;
                isDeleted: boolean;
            };
        } & {
            id: string;
            categoryId: string;
            productId: string;
        })[];
        inventories: {
            id: string;
            reservedStock: number;
            availableStock: number;
            warehouse: string;
            totalStock: number;
            productId: string;
            lastSync: Date | null;
        }[];
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: boolean;
        sku: string;
        slug: string;
        shortDescription: string | null;
        brandId: string | null;
        basePrice: Prisma.Decimal;
        discountPrice: Prisma.Decimal | null;
        taxPercentage: Prisma.Decimal;
        finalPrice: Prisma.Decimal;
        stock: number;
        reservedStock: number;
        availableStock: number;
        rating: number;
        archive: boolean;
        deletedAt: Date | null;
    }>;
    remove(id: string, permanent?: boolean): Promise<{
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: boolean;
        sku: string;
        slug: string;
        shortDescription: string | null;
        brandId: string | null;
        basePrice: Prisma.Decimal;
        discountPrice: Prisma.Decimal | null;
        taxPercentage: Prisma.Decimal;
        finalPrice: Prisma.Decimal;
        stock: number;
        reservedStock: number;
        availableStock: number;
        rating: number;
        archive: boolean;
        deletedAt: Date | null;
    }>;
    archive(id: string): Promise<{
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: boolean;
        sku: string;
        slug: string;
        shortDescription: string | null;
        brandId: string | null;
        basePrice: Prisma.Decimal;
        discountPrice: Prisma.Decimal | null;
        taxPercentage: Prisma.Decimal;
        finalPrice: Prisma.Decimal;
        stock: number;
        reservedStock: number;
        availableStock: number;
        rating: number;
        archive: boolean;
        deletedAt: Date | null;
    }>;
    restore(id: string): Promise<{
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: boolean;
        sku: string;
        slug: string;
        shortDescription: string | null;
        brandId: string | null;
        basePrice: Prisma.Decimal;
        discountPrice: Prisma.Decimal | null;
        taxPercentage: Prisma.Decimal;
        finalPrice: Prisma.Decimal;
        stock: number;
        reservedStock: number;
        availableStock: number;
        rating: number;
        archive: boolean;
        deletedAt: Date | null;
    }>;
    addImage(productId: string, dto: CreateProductImageDto): Promise<{
        id: string;
        imageUrl: string;
        displayOrder: number;
        productId: string;
    }>;
    getImages(productId: string): Promise<{
        id: string;
        imageUrl: string;
        displayOrder: number;
        productId: string;
    }[]>;
    removeImage(productId: string, imageId: string): Promise<{
        id: string;
        imageUrl: string;
        displayOrder: number;
        productId: string;
    }>;
    addVideo(productId: string, dto: CreateProductVideoDto): Promise<{
        id: string;
        videoUrl: string;
        fileSize: bigint | null;
        productId: string;
    }>;
    getVideos(productId: string): Promise<{
        fileSize: number | null;
        id: string;
        videoUrl: string;
        productId: string;
    }[]>;
    removeVideo(productId: string, videoId: string): Promise<{
        id: string;
        videoUrl: string;
        fileSize: bigint | null;
        productId: string;
    }>;
    addKeyword(productId: string, dto: CreateProductKeywordDto): Promise<{
        id: string;
        keyword: string;
        productId: string;
    }>;
    getKeywords(productId: string): Promise<{
        id: string;
        keyword: string;
        productId: string;
    }[]>;
    removeKeyword(productId: string, keywordId: string): Promise<{
        id: string;
        keyword: string;
        productId: string;
    }>;
    updateInventory(productId: string, dto: UpdateInventoryDto): Promise<{
        id: string;
        reservedStock: number;
        availableStock: number;
        warehouse: string;
        totalStock: number;
        productId: string;
        lastSync: Date | null;
    }>;
    assignCategories(productId: string, dto: AssignCategoriesDto): Promise<({
        category: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: boolean;
            slug: string;
            parentId: string | null;
            image: string | null;
            isDeleted: boolean;
        };
    } & {
        id: string;
        categoryId: string;
        productId: string;
    })[]>;
    assignBrand(productId: string, dto: AssignBrandDto): Promise<{
        brand: {
            name: string;
            id: string;
            status: boolean;
            logo: string | null;
        } | null;
    } & {
        description: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: boolean;
        sku: string;
        slug: string;
        shortDescription: string | null;
        brandId: string | null;
        basePrice: Prisma.Decimal;
        discountPrice: Prisma.Decimal | null;
        taxPercentage: Prisma.Decimal;
        finalPrice: Prisma.Decimal;
        stock: number;
        reservedStock: number;
        availableStock: number;
        rating: number;
        archive: boolean;
        deletedAt: Date | null;
    }>;
}
