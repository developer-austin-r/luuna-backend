export declare class CreateProductImageDto {
    imageUrl: string;
    displayOrder?: number;
}
export declare class CreateProductVideoDto {
    videoUrl: string;
    fileSize?: number;
}
export declare class CreateProductKeywordDto {
    keyword: string;
}
export declare class UpdateInventoryDto {
    totalStock: number;
    reservedStock?: number;
    availableStock?: number;
    warehouse: string;
}
export declare class AssignCategoriesDto {
    categoryIds: string[];
}
export declare class AssignBrandDto {
    brandId?: string | null;
}
