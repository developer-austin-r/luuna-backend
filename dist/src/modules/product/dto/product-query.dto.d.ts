export declare enum SortOrder {
    ASC = "asc",
    DESC = "desc"
}
export declare enum ProductSortBy {
    CREATED_AT = "createdAt",
    NAME = "name",
    BASE_PRICE = "basePrice",
    FINAL_PRICE = "finalPrice",
    RATING = "rating",
    STOCK = "stock"
}
export declare class ProductQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    brandId?: string;
    categoryId?: string;
    status?: boolean;
    archive?: boolean;
    includeDeleted?: boolean;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: ProductSortBy;
    sortOrder?: SortOrder;
}
