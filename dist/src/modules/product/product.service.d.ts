import { PrismaService } from '../../prisma/prisma.service';
import { AssignBrandDto, AssignCategoriesDto, CreateProductDto, CreateProductImageDto, CreateProductKeywordDto, CreateProductVideoDto, ProductQueryDto, UpdateInventoryDto, UpdateProductDto, CreateCategoryDto, UpdateCategoryDto } from './dto';
import { Prisma } from '@prisma/client';
export declare class ProductService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private serializeBigInt;
    findAll(query: ProductQueryDto): Promise<{
        data: ({
            brand: {
                id: string;
                name: string;
                logo: string | null;
                status: boolean;
            } | null;
            productCategories: ({
                category: {
                    id: string;
                    name: string;
                    status: boolean;
                    slug: string;
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
                reservedStock: number;
                availableStock: number;
                warehouse: string;
                totalStock: number;
                productId: string;
                lastSync: Date | null;
            }[];
        } & {
            id: string;
            name: string;
            status: boolean;
            slug: string;
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
            id: string;
            name: string;
            logo: string | null;
            status: boolean;
        } | null;
        productCategories: ({
            category: {
                id: string;
                name: string;
                status: boolean;
                slug: string;
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
            reservedStock: number;
            availableStock: number;
            warehouse: string;
            totalStock: number;
            productId: string;
            lastSync: Date | null;
        }[];
    } & {
        id: string;
        name: string;
        status: boolean;
        slug: string;
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
        archive: boolean;
        deletedAt: Date | null;
    }>;
    create(createProductDto: CreateProductDto): Promise<{
        brand: {
            id: string;
            name: string;
            logo: string | null;
            status: boolean;
        } | null;
        productCategories: ({
            category: {
                id: string;
                name: string;
                status: boolean;
                slug: string;
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
            reservedStock: number;
            availableStock: number;
            warehouse: string;
            totalStock: number;
            productId: string;
            lastSync: Date | null;
        }[];
    } & {
        id: string;
        name: string;
        status: boolean;
        slug: string;
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
        archive: boolean;
        deletedAt: Date | null;
    }>;
    update(id: string, updateProductDto: UpdateProductDto): Promise<{
        brand: {
            id: string;
            name: string;
            logo: string | null;
            status: boolean;
        } | null;
        productCategories: ({
            category: {
                id: string;
                name: string;
                status: boolean;
                slug: string;
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
            reservedStock: number;
            availableStock: number;
            warehouse: string;
            totalStock: number;
            productId: string;
            lastSync: Date | null;
        }[];
    } & {
        id: string;
        name: string;
        status: boolean;
        slug: string;
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
        archive: boolean;
        deletedAt: Date | null;
    }>;
    remove(id: string, permanent?: boolean): Promise<{
        id: string;
        name: string;
        status: boolean;
        slug: string;
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
        archive: boolean;
        deletedAt: Date | null;
    }>;
    archive(id: string): Promise<{
        id: string;
        name: string;
        status: boolean;
        slug: string;
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
        archive: boolean;
        deletedAt: Date | null;
    }>;
    restore(id: string): Promise<{
        id: string;
        name: string;
        status: boolean;
        slug: string;
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
            id: string;
            name: string;
            status: boolean;
            slug: string;
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
            name: string;
            logo: string | null;
            status: boolean;
        } | null;
    } & {
        id: string;
        name: string;
        status: boolean;
        slug: string;
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
        archive: boolean;
        deletedAt: Date | null;
    }>;
    getCategories(): Promise<{
        id: string;
        name: string;
        status: boolean;
        slug: string;
        parentId: string | null;
        image: string | null;
        description: string | null;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getBrands(): Promise<{
        id: string;
        name: string;
        logo: string | null;
        status: boolean;
    }[]>;
    createCategory(dto: CreateCategoryDto): Promise<{
        id: string;
        name: string;
        status: boolean;
        slug: string;
        parentId: string | null;
        image: string | null;
        description: string | null;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateCategory(id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        name: string;
        status: boolean;
        slug: string;
        parentId: string | null;
        image: string | null;
        description: string | null;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteCategory(id: string): Promise<{
        id: string;
        name: string;
        status: boolean;
        slug: string;
        parentId: string | null;
        image: string | null;
        description: string | null;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
