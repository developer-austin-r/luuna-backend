import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ProductService } from './product.service';
import {
  AssignBrandDto,
  AssignCategoriesDto,
  CreateProductDto,
  CreateProductImageDto,
  CreateProductKeywordDto,
  CreateProductVideoDto,
  ProductQueryDto,
  UpdateInventoryDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto';

type UploadedImage = { buffer: Buffer; mimetype: string };

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of products with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products fetched successfully.',
  })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Get('categories/all')
  @ApiOperation({
    summary: 'Get all active categories for product assignments',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories fetched successfully.',
  })
  async getCategories() {
    return this.productService.getCategories();
  }

  @Get('statuses/all')
  @ApiOperation({
    summary: 'Get all active statuses for product assignments',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statuses fetched successfully.',
  })
  async getStatuses() {
    return this.productService.getStatuses();
  }

  @Get('brands/all')
  @ApiOperation({ summary: 'Get all active brands for product assignments' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Brands fetched successfully.',
  })
  async getBrands() {
    return this.productService.getBrands();
  }

  @Post('uploads')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const allowedMimeTypes = new Set([
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ]);
        callback(null, allowedMimeTypes.has(file.mimetype));
      },
    }),
  )
  @ApiOperation({ summary: 'Upload an image and return its public S3 URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async uploadImage(@UploadedFile() file?: UploadedImage) {
    if (!file) {
      throw new BadRequestException(
        'Upload a JPEG, PNG, WebP, or GIF image no larger than 10 MB.',
      );
    }
    return this.productService.uploadImage(file);
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product category' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully.',
  })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.productService.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update category details' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully.',
  })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.productService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category deleted successfully.',
  })
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.deleteCategory(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details by ID' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product details retrieved successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found.',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product with initial relations' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product created successfully.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Product SKU or Slug already exists.',
  })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product details' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete product (soft delete by default, permanent with flag)',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiQuery({
    name: 'permanent',
    required: false,
    type: Boolean,
    description: 'Permanent deletion',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product deleted successfully.',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('permanent') permanent?: string,
  ) {
    const isPermanent = permanent === 'true';
    return this.productService.remove(id, isPermanent);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product archived successfully.',
  })
  async archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.archive(id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore archived or soft-deleted product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product restored successfully.',
  })
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.restore(id);
  }

  // ==========================================
  // PRODUCT IMAGES ENDPOINTS
  // ==========================================

  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add image to product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product image added successfully.',
  })
  async addImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.productService.addImage(id, dto);
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'Get all images for a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product images retrieved.',
  })
  async getImages(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.getImages(id);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Remove an image from a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'imageId', description: 'Image UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Product image deleted.' })
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.productService.removeImage(id, imageId);
  }

  // ==========================================
  // PRODUCT VIDEOS ENDPOINTS
  // ==========================================

  @Post(':id/videos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add video to product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product video added.',
  })
  async addVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProductVideoDto,
  ) {
    return this.productService.addVideo(id, dto);
  }

  @Get(':id/videos')
  @ApiOperation({ summary: 'Get all videos for a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product videos retrieved.',
  })
  async getVideos(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.getVideos(id);
  }

  @Delete(':id/videos/:videoId')
  @ApiOperation({ summary: 'Remove a video from a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'videoId', description: 'Video UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Product video deleted.' })
  async removeVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('videoId', ParseUUIDPipe) videoId: string,
  ) {
    return this.productService.removeVideo(id, videoId);
  }

  // ==========================================
  // PRODUCT KEYWORDS ENDPOINTS
  // ==========================================

  @Post(':id/keywords')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add keyword to product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Keyword added.' })
  async addKeyword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProductKeywordDto,
  ) {
    return this.productService.addKeyword(id, dto);
  }

  @Get(':id/keywords')
  @ApiOperation({ summary: 'Get all keywords for a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Keywords retrieved.' })
  async getKeywords(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.getKeywords(id);
  }

  @Delete(':id/keywords/:keywordId')
  @ApiOperation({ summary: 'Remove a keyword from a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'keywordId', description: 'Keyword UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Keyword deleted.' })
  async removeKeyword(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('keywordId', ParseUUIDPipe) keywordId: string,
  ) {
    return this.productService.removeKeyword(id, keywordId);
  }

  // ==========================================
  // INVENTORY ENDPOINTS
  // ==========================================

  @Put(':id/inventory')
  @ApiOperation({
    summary: 'Update product inventory stock and sync overall totals',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inventory updated successfully.',
  })
  async updateInventory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.productService.updateInventory(id, dto);
  }

  // ==========================================
  // CATEGORY ASSIGNMENT ENDPOINTS
  // ==========================================

  @Post(':id/categories')
  @ApiOperation({
    summary:
      'Assign categories to product (replaces current category assignments)',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories assigned successfully.',
  })
  async assignCategories(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCategoriesDto,
  ) {
    return this.productService.assignCategories(id, dto);
  }

  // ==========================================
  // BRAND ASSIGNMENT ENDPOINTS
  // ==========================================

  @Patch(':id/brand')
  @ApiOperation({ summary: 'Assign or update brand for a product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Brand assigned successfully.',
  })
  async assignBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignBrandDto,
  ) {
    return this.productService.assignBrand(id, dto);
  }
}
