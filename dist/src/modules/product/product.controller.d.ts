import { ProductService } from './product.service';
import { AssignBrandDto, AssignCategoriesDto, CreateProductDto, CreateProductImageDto, CreateProductKeywordDto, CreateProductVideoDto, ProductQueryDto, UpdateInventoryDto, UpdateProductDto } from './dto';
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
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
            basePrice: import("@prisma/client-runtime-utils").Decimal;
            discountPrice: import("@prisma/client-runtime-utils").Decimal | null;
            taxPercentage: import("@prisma/client-runtime-utils").Decimal;
            finalPrice: import("@prisma/client-runtime-utils").Decimal;
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
        basePrice: import("@prisma/client-runtime-utils").Decimal;
        discountPrice: import("@prisma/client-runtime-utils").Decimal | null;
        taxPercentage: import("@prisma/client-runtime-utils").Decimal;
        finalPrice: import("@prisma/client-runtime-utils").Decimal;
        stock: number;
        reservedStock: number;
        availableStock: number;
        rating: number;
        archive: boolean;
        deletedAt: Date | null;
    }>;
    create(createProductDto: CreateProductDto): Promise<any>;
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
        basePrice: import("@prisma/client-runtime-utils").Decimal;
        discountPrice: import("@prisma/client-runtime-utils").Decimal | null;
        taxPercentage: import("@prisma/client-runtime-utils").Decimal;
        finalPrice: import("@prisma/client-runtime-utils").Decimal;
        stock: number;
        reservedStock: number;
        availableStock: number;
        rating: number;
        archive: boolean;
        deletedAt: Date | null;
    }>;
    remove(id: string, permanent?: string): Promise<{
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
        basePrice: import("@prisma/client-runtime-utils").Decimal;
        discountPrice: import("@prisma/client-runtime-utils").Decimal | null;
        taxPercentage: import("@prisma/client-runtime-utils").Decimal;
        finalPrice: import("@prisma/client-runtime-utils").Decimal;
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
        basePrice: import("@prisma/client-runtime-utils").Decimal;
        discountPrice: import("@prisma/client-runtime-utils").Decimal | null;
        taxPercentage: import("@prisma/client-runtime-utils").Decimal;
        finalPrice: import("@prisma/client-runtime-utils").Decimal;
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
        basePrice: import("@prisma/client-runtime-utils").Decimal;
        discountPrice: import("@prisma/client-runtime-utils").Decimal | null;
        taxPercentage: import("@prisma/client-runtime-utils").Decimal;
        finalPrice: import("@prisma/client-runtime-utils").Decimal;
        stock: number;
        reservedStock: number;
        availableStock: number;
        rating: number;
        archive: boolean;
        deletedAt: Date | null;
    }>;
    addImage(id: string, dto: CreateProductImageDto): Promise<{
        id: string;
        imageUrl: string;
        displayOrder: number;
        productId: string;
    }>;
    getImages(id: string): Promise<{
        id: string;
        imageUrl: string;
        displayOrder: number;
        productId: string;
    }[]>;
    removeImage(id: string, imageId: string): Promise<{
        id: string;
        imageUrl: string;
        displayOrder: number;
        productId: string;
    }>;
    addVideo(id: string, dto: CreateProductVideoDto): Promise<{
        id: string;
        videoUrl: string;
        fileSize: bigint | null;
        productId: string;
    }>;
    getVideos(id: string): Promise<{
        fileSize: number | null;
        id: string;
        videoUrl: string;
        productId: string;
    }[]>;
    removeVideo(id: string, videoId: string): Promise<{
        id: string;
        videoUrl: string;
        fileSize: bigint | null;
        productId: string;
    }>;
    addKeyword(id: string, dto: CreateProductKeywordDto): Promise<{
        id: string;
        keyword: string;
        productId: string;
    }>;
    getKeywords(id: string): Promise<{
        id: string;
        keyword: string;
        productId: string;
    }[]>;
    removeKeyword(id: string, keywordId: string): Promise<{
        id: string;
        keyword: string;
        productId: string;
    }>;
    updateInventory(id: string, dto: UpdateInventoryDto): Promise<any>;
    assignCategories(id: string, dto: AssignCategoriesDto): Promise<({
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
    assignBrand(id: string, dto: AssignBrandDto): Promise<{
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
        basePrice: import("@prisma/client-runtime-utils").Decimal;
        discountPrice: import("@prisma/client-runtime-utils").Decimal | null;
        taxPercentage: import("@prisma/client-runtime-utils").Decimal;
        finalPrice: import("@prisma/client-runtime-utils").Decimal;
        stock: number;
        reservedStock: number;
        availableStock: number;
        rating: number;
        archive: boolean;
        deletedAt: Date | null;
    }>;
}
