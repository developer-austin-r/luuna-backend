import { PrismaService } from '../../prisma/prisma.service';
import { AssignBrandDto, AssignCategoriesDto, CreateProductDto, CreateProductImageDto, CreateProductKeywordDto, CreateProductVideoDto, ProductQueryDto, UpdateInventoryDto, UpdateProductDto, CreateCategoryDto, UpdateCategoryDto } from './dto';
import { Prisma } from '@prisma/client';
export declare class ProductService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private serializeBigInt;
    findAll(query: ProductQueryDto): Promise<{
        data: ({
            status: {
                id: string;
                slug: string;
                status: string;
            };
            brand: {
                id: string;
                status: boolean;
                name: string;
                logo: string | null;
            } | null;
            productCategories: ({
                category: {
                    id: string;
                    slug: string;
                    status: boolean;
                    name: string;
                    parentId: string | null;
                    image: string | null;
                    description: string | null;
                    isDeleted: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                categoryId: string;
                productId: string;
            })[];
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
            inventories: {
                id: string;
                updatedAt: Date;
                reservedStock: number;
                availableStock: number;
                totalStock: number;
                productId: string;
            }[];
        } & {
            id: string;
            slug: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            sku: string;
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
            statusId: string;
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
        status: {
            id: string;
            slug: string;
            status: string;
        };
        brand: {
            id: string;
            status: boolean;
            name: string;
            logo: string | null;
        } | null;
        productCategories: ({
            category: {
                id: string;
                slug: string;
                status: boolean;
                name: string;
                parentId: string | null;
                image: string | null;
                description: string | null;
                isDeleted: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            categoryId: string;
            productId: string;
        })[];
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
        inventories: {
            id: string;
            updatedAt: Date;
            reservedStock: number;
            availableStock: number;
            totalStock: number;
            productId: string;
        }[];
    } & {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        sku: string;
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
        statusId: string;
        deletedAt: Date | null;
    }>;
    create(createProductDto: CreateProductDto): Promise<{
        status: {
            id: string;
            slug: string;
            status: string;
        };
        brand: {
            id: string;
            status: boolean;
            name: string;
            logo: string | null;
        } | null;
        productCategories: ({
            category: {
                id: string;
                slug: string;
                status: boolean;
                name: string;
                parentId: string | null;
                image: string | null;
                description: string | null;
                isDeleted: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            categoryId: string;
            productId: string;
        })[];
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
        inventories: {
            id: string;
            updatedAt: Date;
            reservedStock: number;
            availableStock: number;
            totalStock: number;
            productId: string;
        }[];
    } & {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        sku: string;
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
        statusId: string;
        deletedAt: Date | null;
    }>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<{
        status: {
            id: string;
            slug: string;
            status: string;
        };
        brand: {
            id: string;
            status: boolean;
            name: string;
            logo: string | null;
        } | null;
        productCategories: ({
            category: {
                id: string;
                slug: string;
                status: boolean;
                name: string;
                parentId: string | null;
                image: string | null;
                description: string | null;
                isDeleted: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            categoryId: string;
            productId: string;
        })[];
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
        inventories: {
            id: string;
            updatedAt: Date;
            reservedStock: number;
            availableStock: number;
            totalStock: number;
            productId: string;
        }[];
    } & {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        sku: string;
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
        statusId: string;
        deletedAt: Date | null;
    }>;
    remove(id: string, permanent?: boolean): Promise<{
        id: string;
        slug: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        sku: string;
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
        statusId: string;
        deletedAt: Date | null;
    }>;
    archive(id: string): Promise<{
        id: string;
        slug: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        sku: string;
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
        statusId: string;
        deletedAt: Date | null;
    }>;
    restore(id: string): Promise<{
        id: string;
        slug: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        sku: string;
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
        statusId: string;
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
        updatedAt: Date;
        reservedStock: number;
        availableStock: number;
        totalStock: number;
        productId: string;
    }>;
    assignCategories(productId: string, dto: AssignCategoriesDto): Promise<({
        category: {
            id: string;
            slug: string;
            status: boolean;
            name: string;
            parentId: string | null;
            image: string | null;
            description: string | null;
            isDeleted: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        categoryId: string;
        productId: string;
    })[]>;
    assignBrand(productId: string, dto: AssignBrandDto): Promise<{
        brand: {
            id: string;
            status: boolean;
            name: string;
            logo: string | null;
        } | null;
    } & {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        sku: string;
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
        statusId: string;
        deletedAt: Date | null;
    }>;
    getCategories(): Promise<{
        id: string;
        slug: string;
        status: boolean;
        name: string;
        parentId: string | null;
        image: string | null;
        description: string | null;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getBrands(): Promise<{
        id: string;
        status: boolean;
        name: string;
        logo: string | null;
    }[]>;
    createCategory(dto: CreateCategoryDto): Promise<{
        id: string;
        slug: string;
        status: boolean;
        name: string;
        parentId: string | null;
        image: string | null;
        description: string | null;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateCategory(id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        slug: string;
        status: boolean;
        name: string;
        parentId: string | null;
        image: string | null;
        description: string | null;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteCategory(id: string): Promise<{
        id: string;
        slug: string;
        status: boolean;
        name: string;
        parentId: string | null;
        image: string | null;
        description: string | null;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getStatuses(): Promise<{
        id: string;
        slug: string;
        status: string;
    }[]>;
}
