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
exports.AssignBrandDto = exports.AssignCategoriesDto = exports.UpdateInventoryDto = exports.CreateProductKeywordDto = exports.CreateProductVideoDto = exports.CreateProductImageDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateProductImageDto {
    imageUrl;
    displayOrder;
}
exports.CreateProductImageDto = CreateProductImageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://example.com/images/product-1.jpg' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductImageDto.prototype, "imageUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0, default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductImageDto.prototype, "displayOrder", void 0);
class CreateProductVideoDto {
    videoUrl;
    fileSize;
}
exports.CreateProductVideoDto = CreateProductVideoDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'https://example.com/videos/product-1.mp4' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductVideoDto.prototype, "videoUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10485760 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateProductVideoDto.prototype, "fileSize", void 0);
class CreateProductKeywordDto {
    keyword;
}
exports.CreateProductKeywordDto = CreateProductKeywordDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'wireless-audio' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductKeywordDto.prototype, "keyword", void 0);
class UpdateInventoryDto {
    totalStock;
    reservedStock;
    availableStock;
    warehouse;
}
exports.UpdateInventoryDto = UpdateInventoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateInventoryDto.prototype, "totalStock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10, default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateInventoryDto.prototype, "reservedStock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 90 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateInventoryDto.prototype, "availableStock", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Main Warehouse' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateInventoryDto.prototype, "warehouse", void 0);
class AssignCategoriesDto {
    categoryIds;
}
exports.AssignCategoriesDto = AssignCategoriesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['123e4567-e89b-12d3-a456-426614174001'] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], AssignCategoriesDto.prototype, "categoryIds", void 0);
class AssignBrandDto {
    brandId;
}
exports.AssignBrandDto = AssignBrandDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '123e4567-e89b-12d3-a456-426614174000',
        nullable: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", Object)
], AssignBrandDto.prototype, "brandId", void 0);
//# sourceMappingURL=product-sub.dto.js.map