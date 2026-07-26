export declare class CreateProductImageItemDto {
    imageUrl: string;
    displayOrder?: number;
}
export declare class CreateProductVideoItemDto {
    videoUrl: string;
    fileSize?: number;
}
export declare class CreateProductDto {
    sku: string;
    name: string;
    slug: string;
    shortDescription?: string;
    description?: string;
    brandId?: string;
    brandName?: string;
    basePrice: number;
    discountPrice?: number;
    taxPercentage?: number;
    finalPrice: number;
    stock?: number;
    reservedStock?: number;
    availableStock?: number;
    rating?: number;
    archive?: boolean;
    status?: boolean;
    categoryIds?: string[];
    images?: CreateProductImageItemDto[];
    videos?: CreateProductVideoItemDto[];
    keywords?: string[];
    warehouse?: string;
}
