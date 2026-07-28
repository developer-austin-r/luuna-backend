import { ProductService } from './product.service';
import { AssignBrandDto, AssignCategoriesDto, CreateProductDto, CreateProductImageDto, CreateProductKeywordDto, CreateProductVideoDto, ProductQueryDto, UpdateInventoryDto, UpdateProductDto, CreateCategoryDto, UpdateCategoryDto } from './dto';
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
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
    updateInventory(id: string, dto: UpdateInventoryDto): Promise<{
        id: string;
        reservedStock: number;
        availableStock: number;
        warehouse: string;
        totalStock: number;
        productId: string;
        lastSync: Date | null;
    }>;
    assignCategories(id: string, dto: AssignCategoriesDto): Promise<({
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
    assignBrand(id: string, dto: AssignBrandDto): Promise<{
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
